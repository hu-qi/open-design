use launcher_lifecycle::{ConfigSearch, LAUNCHER_ROOT_ENV, resolve_config_with_args};
use std::error::Error;
use std::path::PathBuf;

#[derive(Debug, Eq, PartialEq)]
enum CommandMode {
    Launch,
    PrintConfig,
    Version,
}

#[derive(Debug)]
struct CliOptions {
    forwarded_args: Vec<String>,
    json: bool,
    mode: CommandMode,
    root: Option<PathBuf>,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("open-design-launcher: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn Error>> {
    let options = parse_args(std::env::args().skip(1))?;
    match options.mode {
        CommandMode::Version => {
            println!("{}", env!("CARGO_PKG_VERSION"));
        }
        CommandMode::PrintConfig => {
            let resolved = resolve_config(&options)?;
            if options.json {
                println!("{}", serde_json::to_string_pretty(&resolved.config)?);
            } else {
                println!("configPath={}", resolved.config_path.display());
                println!("payloadRoot={}", resolved.payload_root.display());
                println!("executable={}", resolved.process.executable.display());
                println!("cwd={}", resolved.process.cwd.display());
            }
        }
        CommandMode::Launch => {
            let resolved = resolve_config(&options)?;
            launcher_lifecycle::launch_config(&resolved)?;
        }
    }
    Ok(())
}

fn resolve_config(
    options: &CliOptions,
) -> Result<launcher_lifecycle::ResolvedLauncherConfig, Box<dyn Error>> {
    let search = ConfigSearch {
        cwd: launcher_platform::current_dir()?,
        env_root: launcher_platform::env_path(LAUNCHER_ROOT_ENV),
        exe_path: launcher_platform::current_exe()?,
        explicit_root: options.root.clone(),
    };
    Ok(resolve_config_with_args(&search, &options.forwarded_args)?)
}

fn parse_args(args: impl IntoIterator<Item = String>) -> Result<CliOptions, Box<dyn Error>> {
    let mut forwarded_args = Vec::new();
    let mut json = false;
    let mut mode = CommandMode::Launch;
    let mut root = None;
    let mut iter = args.into_iter();

    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--" => {
                forwarded_args.extend(iter);
                break;
            }
            "--help" | "-h" => {
                print_help();
                std::process::exit(0);
            }
            "--json" => {
                json = true;
            }
            "--print-config" => {
                mode = CommandMode::PrintConfig;
            }
            "--root" => {
                root = Some(PathBuf::from(take_value(&mut iter, "--root")?));
            }
            "--version" | "-V" => {
                mode = CommandMode::Version;
            }
            _ if arg.starts_with("--root=") => {
                root = Some(PathBuf::from(value_after_equals(&arg, "--root=")));
            }
            _ => {
                forwarded_args.push(arg);
                forwarded_args.extend(iter);
                break;
            }
        }
    }

    Ok(CliOptions {
        forwarded_args,
        json,
        mode,
        root,
    })
}

fn take_value(
    iter: &mut impl Iterator<Item = String>,
    flag: &'static str,
) -> Result<String, Box<dyn Error>> {
    iter.next()
        .ok_or_else(|| format!("{flag} requires a value").into())
}

fn value_after_equals<'a>(arg: &'a str, prefix: &'static str) -> &'a str {
    &arg[prefix.len()..]
}

fn print_help() {
    println!(
        "Usage:
  open-design-launcher [--root <dir>] [--] [payload args...]
  open-design-launcher --print-config [--json] [--root <dir>]
  open-design-launcher --version"
    );
}
