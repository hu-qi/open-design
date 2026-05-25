use serde::{Serialize, de::DeserializeOwned};
use std::collections::BTreeMap;
use std::env;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LauncherPlatformError {
    #[error("launcher lock is already held: {0}")]
    LockAlreadyHeld(String),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProcessSpec {
    pub args: Vec<String>,
    pub cwd: PathBuf,
    pub env: BTreeMap<String, String>,
    pub executable: PathBuf,
}

pub struct LauncherLock {
    path: PathBuf,
}

impl LauncherLock {
    pub fn acquire(path: impl AsRef<Path>) -> Result<Self, LauncherPlatformError> {
        let path = path.as_ref().to_path_buf();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&path)
            .map_err(|error| {
                if error.kind() == std::io::ErrorKind::AlreadyExists {
                    LauncherPlatformError::LockAlreadyHeld(path.display().to_string())
                } else {
                    LauncherPlatformError::Io(error)
                }
            })?;
        writeln!(file, "pid={}", std::process::id())?;
        Ok(Self { path })
    }
}

impl Drop for LauncherLock {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

pub fn current_dir() -> Result<PathBuf, LauncherPlatformError> {
    Ok(env::current_dir()?)
}

pub fn current_exe() -> Result<PathBuf, LauncherPlatformError> {
    Ok(env::current_exe()?)
}

pub fn env_path(name: &str) -> Option<PathBuf> {
    env::var_os(name).map(PathBuf::from)
}

pub fn read_json_file<T: DeserializeOwned>(path: impl AsRef<Path>) -> Result<T, LauncherPlatformError> {
    let file = File::open(path)?;
    Ok(serde_json::from_reader(file)?)
}

pub fn write_json_file<T: Serialize>(path: impl AsRef<Path>, value: &T) -> Result<(), LauncherPlatformError> {
    let path = path.as_ref();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut file = File::create(path)?;
    serde_json::to_writer_pretty(&mut file, value)?;
    file.write_all(b"\n")?;
    Ok(())
}

pub fn ensure_directories<'a>(
    directories: impl IntoIterator<Item = &'a PathBuf>,
) -> Result<(), LauncherPlatformError> {
    for directory in directories {
        fs::create_dir_all(directory)?;
    }
    Ok(())
}

pub fn spawn_process(spec: &ProcessSpec) -> Result<Child, LauncherPlatformError> {
    let mut command = Command::new(&spec.executable);
    command.args(&spec.args);
    command.envs(&spec.env);
    command.current_dir(&spec.cwd);
    Ok(command.spawn()?)
}

pub fn write_text_file(path: impl AsRef<Path>, payload: &str) -> Result<(), LauncherPlatformError> {
    let path = path.as_ref();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut file = File::create(path)?;
    file.write_all(payload.as_bytes())?;
    file.write_all(b"\n")?;
    Ok(())
}
