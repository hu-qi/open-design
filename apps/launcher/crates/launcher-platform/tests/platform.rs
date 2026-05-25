use launcher_platform::{LauncherLock, read_json_file, write_json_file};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    schema_version: u32,
    value: String,
}

fn temp_root(name: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "open-design-launcher-test-{}-{}",
        name,
        std::process::id()
    ))
}

#[test]
fn lock_stays_exclusive() {
    let root = temp_root("lock");
    let lock_path = root.join("state").join("lock");
    let lock = LauncherLock::acquire(&lock_path).unwrap();

    assert!(LauncherLock::acquire(&lock_path).is_err());
    drop(lock);
    assert!(LauncherLock::acquire(&lock_path).is_ok());

    let _ = fs::remove_dir_all(root);
}

#[test]
fn json_round_trips() {
    let root = temp_root("json");
    let path = root.join("nested").join("fixture.json");
    let fixture = Fixture {
        schema_version: 1,
        value: "payload".to_owned(),
    };

    write_json_file(&path, &fixture).unwrap();

    assert_eq!(read_json_file::<Fixture>(&path).unwrap(), fixture);

    let _ = fs::remove_dir_all(root);
}
