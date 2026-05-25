use launcher_core::PayloadEntry;
use launcher_platform::{LauncherPlatformError, ProcessSpec};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use thiserror::Error;

pub const LAUNCHER_CONFIG_FILE: &str = "launcher.json";
pub const LAUNCHER_CONFIG_SCHEMA_VERSION: u32 = 1;
pub const LAUNCHER_ROOT_ENV: &str = "OD_LAUNCHER_ROOT";

#[derive(Debug, Error)]
pub enum LauncherLifecycleError {
    #[error("launcher root from {origin} does not contain launcher.json: {path}")]
    ForcedConfigMissing {
        origin: &'static str,
        path: String,
    },
    #[error("launcher config was not found at cwd or launcher exe directory")]
    ImplicitConfigMissing,
    #[error("launcher exe path has no parent directory: {0}")]
    ExeParentMissing(String),
    #[error("unsupported launcher config schema at {path}: expected {expected}, got {actual}")]
    UnsupportedConfigSchema {
        actual: u32,
        expected: u32,
        path: String,
    },
    #[error("{field} must not be empty")]
    EmptyField { field: &'static str },
    #[error("platform error: {0}")]
    Platform(#[from] LauncherPlatformError),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ConfigSource {
    ExplicitRoot,
    EnvironmentRoot,
    CurrentDirectory,
    LauncherDirectory,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct LauncherConfig {
    pub entry: PayloadEntry,
    pub payload_root: String,
    pub schema_version: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigSearch {
    pub cwd: PathBuf,
    pub env_root: Option<PathBuf>,
    pub exe_path: PathBuf,
    pub explicit_root: Option<PathBuf>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResolvedLauncherConfig {
    pub config: LauncherConfig,
    pub config_path: PathBuf,
    pub config_root: PathBuf,
    pub payload_root: PathBuf,
    pub process: ProcessSpec,
    pub source: ConfigSource,
}

pub fn resolve_launcher_config(search: &ConfigSearch) -> Result<ResolvedLauncherConfig, LauncherLifecycleError> {
    resolve_config_with_args(search, &[])
}

pub fn resolve_config_with_args(
    search: &ConfigSearch,
    forwarded_args: &[String],
) -> Result<ResolvedLauncherConfig, LauncherLifecycleError> {
    if let Some(root) = &search.explicit_root {
        return load_from_root(
            &resolve_search_root(&search.cwd, root),
            ConfigSource::ExplicitRoot,
            Some("flag"),
            forwarded_args,
        );
    }
    if let Some(root) = &search.env_root {
        return load_from_root(
            &resolve_search_root(&search.cwd, root),
            ConfigSource::EnvironmentRoot,
            Some("environment"),
            forwarded_args,
        );
    }

    let cwd_config = search.cwd.join(LAUNCHER_CONFIG_FILE);
    if cwd_config.is_file() {
        return load_from_path(cwd_config, ConfigSource::CurrentDirectory, forwarded_args);
    }

    let exe_root = search
        .exe_path
        .parent()
        .ok_or_else(|| LauncherLifecycleError::ExeParentMissing(search.exe_path.display().to_string()))?;
    let exe_config = exe_root.join(LAUNCHER_CONFIG_FILE);
    if exe_config.is_file() {
        return load_from_path(exe_config, ConfigSource::LauncherDirectory, forwarded_args);
    }

    Err(LauncherLifecycleError::ImplicitConfigMissing)
}

pub fn build_process_spec(
    config_root: &Path,
    config: &LauncherConfig,
    forwarded_args: &[String],
) -> Result<ProcessSpec, LauncherLifecycleError> {
    require_non_empty(&config.payload_root, "payloadRoot")?;
    require_non_empty(&config.entry.executable, "entry.executable")?;
    let payload_root = resolve_config_path(config_root, &config.payload_root);
    let executable = resolve_config_path(config_root, &config.entry.executable);
    let cwd = config
        .entry
        .cwd
        .as_deref()
        .map(|cwd| resolve_config_path(config_root, cwd))
        .unwrap_or_else(|| payload_root.clone());
    let args = config
        .entry
        .args
        .iter()
        .cloned()
        .chain(forwarded_args.iter().cloned())
        .collect();

    Ok(ProcessSpec {
        args,
        cwd,
        env: config.entry.env.clone(),
        executable,
    })
}

pub fn load_launcher_config(path: &Path) -> Result<LauncherConfig, LauncherLifecycleError> {
    let config: LauncherConfig = launcher_platform::read_json_file(path)?;
    if config.schema_version != LAUNCHER_CONFIG_SCHEMA_VERSION {
        return Err(LauncherLifecycleError::UnsupportedConfigSchema {
            actual: config.schema_version,
            expected: LAUNCHER_CONFIG_SCHEMA_VERSION,
            path: path.display().to_string(),
        });
    }
    require_non_empty(&config.payload_root, "payloadRoot")?;
    require_non_empty(&config.entry.executable, "entry.executable")?;
    Ok(config)
}

pub fn launch_config(resolved: &ResolvedLauncherConfig) -> Result<(), LauncherLifecycleError> {
    let _child = launcher_platform::spawn_process(&resolved.process)?;
    Ok(())
}

fn load_from_root(
    root: &Path,
    source: ConfigSource,
    forced_source: Option<&'static str>,
    forwarded_args: &[String],
) -> Result<ResolvedLauncherConfig, LauncherLifecycleError> {
    let path = root.join(LAUNCHER_CONFIG_FILE);
    if let Some(source) = forced_source
        && !path.is_file()
    {
        return Err(LauncherLifecycleError::ForcedConfigMissing {
            origin: source,
            path: path.display().to_string(),
        });
    }
    load_from_path(path, source, forwarded_args)
}

fn load_from_path(
    path: PathBuf,
    source: ConfigSource,
    forwarded_args: &[String],
) -> Result<ResolvedLauncherConfig, LauncherLifecycleError> {
    let config = load_launcher_config(&path)?;
    let config_root = path
        .parent()
        .ok_or_else(|| LauncherLifecycleError::ForcedConfigMissing {
            origin: "config",
            path: path.display().to_string(),
        })?
        .to_path_buf();
    let process = build_process_spec(&config_root, &config, forwarded_args)?;
    let payload_root = resolve_config_path(&config_root, &config.payload_root);
    Ok(ResolvedLauncherConfig {
        config,
        config_path: path,
        config_root,
        payload_root,
        process,
        source,
    })
}

fn resolve_config_path(root: &Path, value: &str) -> PathBuf {
    let path = PathBuf::from(value);
    if path.is_absolute() {
        path
    } else {
        root.join(path)
    }
}

fn resolve_search_root(cwd: &Path, root: &Path) -> PathBuf {
    if root.is_absolute() {
        root.to_path_buf()
    } else {
        cwd.join(root)
    }
}

fn require_non_empty(value: &str, field: &'static str) -> Result<(), LauncherLifecycleError> {
    if value.trim().is_empty() {
        return Err(LauncherLifecycleError::EmptyField { field });
    }
    Ok(())
}
