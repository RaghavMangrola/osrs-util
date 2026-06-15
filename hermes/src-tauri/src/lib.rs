use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use uuid::Uuid;

const HERB_PROPERTIES_FILE: &str = "C:/Users/raghav/.runelite/hydraprofiles/GIM-40957150339800.properties";

const HERB_KEYS: &[&str] = &[
    "hydrafarmrun.herbCatherby",
    "hydrafarmrun.herbArdougne",
    "hydrafarmrun.herbHosidius",
    "hydrafarmrun.herbPortPhasmatys",
    "hydrafarmrun.herbTrollStronghold",
    "hydrafarmrun.herbVarlamore",
    "hydrafarmrun.herbFalador",
    "hydrafarmrun.herbWeiss",
];

const VALID_HERBS: &[&str] = &[
    "GUAM", "MARRENTILL", "TARROMIN", "HARRALANDER", "RANARR", "TOADFLAX",
    "IRIT", "AVANTOE", "KWUARM", "SNAPDRAGON", "CADANTINE", "LANTADYME",
    "DWARF_WEED", "TORSTOL",
];

const PROFILES_DIR: &str = "C:/Users/raghav/.runelite/profiles2";
const RSPROFILE_FILE: &str = "$rsprofile--1.properties";
const FUNMAXXING_DISPLAY_NAME: &str = "funmaxxing";

// "Dude Where's My Stuff" (DWMS) property key prefixes, shared with bank-sync/watcher/parse.js.
const DWMS_PREFIX: &str = "dudewheresmystuff.rsprofile.";
const DISPLAY_NAME_PREFIX: &str = "rsprofile.rsprofile.";

const HERB_SEED_IDS: &[(u32, &str)] = &[
    (5291, "GUAM"),
    (5292, "MARRENTILL"),
    (5293, "TARROMIN"),
    (5294, "HARRALANDER"),
    (5295, "RANARR"),
    (5296, "TOADFLAX"),
    (5297, "IRIT"),
    (5298, "AVANTOE"),
    (5299, "KWUARM"),
    (5300, "SNAPDRAGON"),
    (5301, "CADANTINE"),
    (5302, "LANTADYME"),
    (5303, "DWARF_WEED"),
    (5304, "TORSTOL"),
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherConfig {
    pub id: String,
    pub name: String,
    pub executable: String,
    pub arguments: String,
    pub working_directory: String,
    pub category: String,
    pub icon: String,
    pub env_vars: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherFormData {
    pub name: String,
    pub executable: String,
    pub arguments: String,
    pub working_directory: String,
    pub category: String,
    pub icon: String,
    pub env_vars: HashMap<String, String>,
}

fn get_data_path() -> PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .expect("Failed to get home directory");
    let dir = PathBuf::from(home).join("Documents").join("Hermes");
    fs::create_dir_all(&dir).ok();
    dir.join("launchers.json")
}

/// Clean raw file content before JSON parsing.
/// Handles UTF-8 BOM, leading/trailing whitespace, and CRLF normalization.
fn clean_json(raw: &str) -> &str {
    raw.trim_start_matches('\u{feff}').trim()
}

/// Parse a JSON string into a Vec<LauncherConfig>, returning an error on failure
/// instead of silently returning an empty list.
fn parse_launchers(raw: &str) -> Result<Vec<LauncherConfig>, String> {
    let cleaned = clean_json(raw);
    if cleaned.is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str(cleaned).map_err(|e| format!("Failed to parse launchers.json: {}", e))
}

fn load_launchers() -> Result<Vec<LauncherConfig>, String> {
    let path = get_data_path();
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    parse_launchers(&data)
}

fn save_launchers(launchers: &[LauncherConfig]) -> Result<(), String> {
    let path = get_data_path();
    let json = serde_json::to_string_pretty(launchers).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_current_herb() -> Result<String, String> {
    let path = PathBuf::from(HERB_PROPERTIES_FILE);
    if !path.exists() {
        return Err(format!("Properties file not found: {}", path.display()));
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read properties: {}", e))?;

    let target = HERB_KEYS[0];
    for line in content.lines() {
        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix(target).and_then(|rest| rest.strip_prefix('=')) {
            return Ok(value.trim().to_string());
        }
    }
    Err(format!("Key {} not found in properties file", target))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HerbUpdateResult {
    pub old_herb: String,
    pub new_herb: String,
    pub keys_updated: usize,
}

#[tauri::command]
fn update_herb(herb: String) -> Result<HerbUpdateResult, String> {
    let herb_upper = herb.trim().to_uppercase().replace(' ', "_");
    if !VALID_HERBS.contains(&herb_upper.as_str()) {
        return Err(format!("Invalid herb: {}. Valid herbs: {}", herb, VALID_HERBS.join(", ")));
    }

    let path = PathBuf::from(HERB_PROPERTIES_FILE);
    if !path.exists() {
        return Err(format!("Properties file not found: {}", path.display()));
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read properties: {}", e))?;

    let uses_crlf = content.contains("\r\n");
    let line_ending = if uses_crlf { "\r\n" } else { "\n" };

    let mut old_herb = String::new();
    let mut keys_updated = 0;
    let mut new_lines: Vec<String> = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();
        let mut matched = false;
        for key in HERB_KEYS {
            if let Some(value) = trimmed.strip_prefix(key).and_then(|rest| rest.strip_prefix('=')) {
                if old_herb.is_empty() {
                    old_herb = value.trim().to_string();
                }
                new_lines.push(format!("{}={}", key, herb_upper));
                keys_updated += 1;
                matched = true;
                break;
            }
        }
        if !matched {
            new_lines.push(line.to_string());
        }
    }

    let new_content = new_lines.join(line_ending);
    fs::write(&path, new_content)
        .map_err(|e| format!("Failed to write properties: {}", e))?;

    Ok(HerbUpdateResult {
        old_herb,
        new_herb: herb_upper,
        keys_updated,
    })
}

#[tauri::command]
fn get_valid_herbs() -> Vec<String> {
    VALID_HERBS.iter().map(|s| s.to_string()).collect()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HerbSeedCount {
    pub herb: String,
    pub item_id: u32,
    pub quantity: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BankSeedData {
    pub seeds: Vec<HerbSeedCount>,
    pub snapshot_date: String,
}

/// Parse a `key=value` properties file into a map, skipping blanks and comments.
fn parse_props(content: &str) -> HashMap<&str, &str> {
    let mut props = HashMap::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with('!') {
            continue;
        }
        if let Some((key, value)) = trimmed.split_once('=') {
            props.insert(key.trim(), value);
        }
    }
    props
}

/// Parse a DWMS storage value: an optional `<epochMs>;` prefix followed by a
/// comma-separated `<itemId>x<qty>` list. Returns the timestamp (if present) and
/// the items, mirroring bank-sync/watcher/parse.js. `-1` ids (empty slots) are dropped.
fn parse_dwms_value(raw: &str) -> (Option<i64>, Vec<(i64, i64)>) {
    let mut timestamp = None;
    let mut item_str = raw;
    if let Some(semi) = raw.find(';') {
        let maybe_ts = &raw[..semi];
        if !maybe_ts.is_empty() && maybe_ts.bytes().all(|b| b.is_ascii_digit()) {
            timestamp = maybe_ts.parse::<i64>().ok();
            item_str = &raw[semi + 1..];
        }
    }

    let mut items = Vec::new();
    for part in item_str.split(',') {
        let Some(x) = part.find('x') else { continue };
        let (Ok(id), Ok(qty)) = (part[..x].parse::<i64>(), part[x + 1..].parse::<i64>()) else {
            continue;
        };
        if id == -1 {
            continue;
        }
        items.push((id, qty));
    }

    (timestamp, items)
}

/// Format an epoch-milliseconds timestamp as "YYYY-MM-DD HH:MM:SS UTC".
/// Uses Howard Hinnant's days-to-civil algorithm to avoid a date dependency.
fn format_epoch_ms(ms: i64) -> String {
    let secs = ms.div_euclid(1000);
    let days = secs.div_euclid(86_400);
    let tod = secs.rem_euclid(86_400);
    let (hh, mm, ss) = (tod / 3600, (tod % 3600) / 60, tod % 60);

    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };

    format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02} UTC", year, m, d, hh, mm, ss)
}

/// Resolve the funmaxxing account's herb-seed-bearing storages (bank + seed vault)
/// from a parsed `$rsprofile` properties file, merging quantities across both.
/// Returns the merged item id -> qty map and the newest storage timestamp (epoch ms).
fn extract_funmaxxing_items(content: &str) -> Result<(HashMap<i64, i64>, Option<i64>), String> {
    let props = parse_props(content);

    // Resolve funmaxxing account hash(es) by display name (one rsprofile file holds many accounts).
    let hashes: Vec<&str> = props
        .iter()
        .filter_map(|(key, value)| {
            let hash = key
                .strip_prefix(DISPLAY_NAME_PREFIX)?
                .strip_suffix(".displayName")?;
            (value.trim() == FUNMAXXING_DISPLAY_NAME).then_some(hash)
        })
        .collect();
    if hashes.is_empty() {
        return Err(format!("No account named '{}' found", FUNMAXXING_DISPLAY_NAME));
    }

    // The display name is reused across alts; keep the hash with the freshest bank/seed-vault data.
    let mut best: Option<(Option<i64>, HashMap<i64, i64>)> = None;
    for hash in hashes {
        let bank_key = format!("{}{}.world.bank", DWMS_PREFIX, hash);
        let vault_key = format!("{}{}.world.seedvault", DWMS_PREFIX, hash);
        let storages: Vec<(Option<i64>, Vec<(i64, i64)>)> = [bank_key, vault_key]
            .iter()
            .filter_map(|k| props.get(k.as_str()).map(|v| parse_dwms_value(v)))
            .collect();
        if storages.is_empty() {
            continue;
        }

        let mut merged: HashMap<i64, i64> = HashMap::new();
        let mut timestamp: Option<i64> = None;
        for (ts, items) in storages {
            if let Some(ts) = ts {
                timestamp = Some(timestamp.map_or(ts, |cur| cur.max(ts)));
            }
            for (id, qty) in items {
                *merged.entry(id).or_insert(0) += qty;
            }
        }

        let is_newer = best
            .as_ref()
            .map_or(true, |(best_ts, _)| timestamp.unwrap_or(0) > best_ts.unwrap_or(0));
        if is_newer {
            best = Some((timestamp, merged));
        }
    }

    best
        .map(|(timestamp, items)| (items, timestamp))
        .ok_or_else(|| format!("No bank or seed vault data found for '{}'", FUNMAXXING_DISPLAY_NAME))
}

#[tauri::command]
fn get_herb_seeds() -> Result<BankSeedData, String> {
    let path = PathBuf::from(PROFILES_DIR).join(RSPROFILE_FILE);
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    let (items, snapshot_ms) = extract_funmaxxing_items(&content)?;

    let seeds: Vec<HerbSeedCount> = HERB_SEED_IDS.iter().map(|(id, name)| {
        HerbSeedCount {
            herb: name.to_string(),
            item_id: *id,
            quantity: items.get(&(*id as i64)).copied().unwrap_or(0).max(0) as u32,
        }
    }).collect();

    let snapshot_date = snapshot_ms.map(format_epoch_ms).unwrap_or_else(|| "unknown".to_string());

    Ok(BankSeedData { seeds, snapshot_date })
}

#[tauri::command]
fn get_launchers() -> Result<Vec<LauncherConfig>, String> {
    load_launchers()
}

#[tauri::command]
fn add_launcher(data: LauncherFormData) -> Result<LauncherConfig, String> {
    let mut launchers = load_launchers()?;
    let config = LauncherConfig {
        id: Uuid::new_v4().to_string(),
        name: data.name,
        executable: data.executable,
        arguments: data.arguments,
        working_directory: data.working_directory,
        category: data.category,
        icon: data.icon,
        env_vars: data.env_vars,
    };
    launchers.push(config.clone());
    save_launchers(&launchers)?;
    Ok(config)
}

#[tauri::command]
fn update_launcher(
    id: String,
    data: LauncherFormData,
) -> Result<LauncherConfig, String> {
    let mut launchers = load_launchers()?;
    let launcher = launchers
        .iter_mut()
        .find(|l| l.id == id)
        .ok_or("Launcher not found")?;

    launcher.name = data.name;
    launcher.executable = data.executable;
    launcher.arguments = data.arguments;
    launcher.working_directory = data.working_directory;
    launcher.category = data.category;
    launcher.icon = data.icon;
    launcher.env_vars = data.env_vars;

    let updated = launcher.clone();
    save_launchers(&launchers)?;
    Ok(updated)
}

#[tauri::command]
fn delete_launcher(id: String) -> Result<(), String> {
    let mut launchers = load_launchers()?;
    launchers.retain(|l| l.id != id);
    save_launchers(&launchers)?;
    Ok(())
}

#[tauri::command]
fn launch_app(config: LauncherConfig) -> Result<(), String> {
    let mut cmd = Command::new(&config.executable);

    // Parse arguments (respecting quoted strings)
    if !config.arguments.is_empty() {
        let args = shell_words::split(&config.arguments).map_err(|e| e.to_string())?;
        cmd.args(&args);
    }

    if !config.working_directory.is_empty() {
        cmd.current_dir(&config.working_directory);
    }

    for (key, value) in &config.env_vars {
        cmd.env(key, value);
    }

    cmd.spawn().map_err(|e| format!("Failed to launch: {}", e))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_launchers,
            add_launcher,
            update_launcher,
            delete_launcher,
            launch_app,
            get_current_herb,
            update_herb,
            get_valid_herbs,
            get_herb_seeds,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn sample_launcher() -> LauncherConfig {
        LauncherConfig {
            id: "test-id".to_string(),
            name: "Test App".to_string(),
            executable: r"C:\test\app.exe".to_string(),
            arguments: "--flag value".to_string(),
            working_directory: r"C:\test".to_string(),
            category: "General".to_string(),
            icon: "🚀".to_string(),
            env_vars: HashMap::new(),
        }
    }

    fn sample_json_one() -> &'static str {
        r#"[{"id":"1","name":"App","executable":"a.exe","arguments":"","workingDirectory":"","category":"General","icon":"🚀","envVars":{}}]"#
    }

    // --- clean_json tests ---

    #[test]
    fn clean_json_strips_utf8_bom() {
        let input = "\u{feff}[1,2,3]";
        assert_eq!(clean_json(input), "[1,2,3]");
    }

    #[test]
    fn clean_json_strips_leading_and_trailing_whitespace() {
        assert_eq!(clean_json("  \n\t[]\r\n  "), "[]");
    }

    #[test]
    fn clean_json_strips_bom_and_whitespace_combined() {
        assert_eq!(clean_json("\u{feff}  \n[]\n  "), "[]");
    }

    #[test]
    fn clean_json_returns_empty_for_empty_input() {
        assert_eq!(clean_json(""), "");
    }

    #[test]
    fn clean_json_returns_empty_for_whitespace_only() {
        assert_eq!(clean_json("   \n\t\r\n  "), "");
    }

    #[test]
    fn clean_json_returns_empty_for_bom_only() {
        assert_eq!(clean_json("\u{feff}"), "");
    }

    #[test]
    fn clean_json_noop_on_clean_input() {
        let input = r#"[{"id":"1"}]"#;
        assert_eq!(clean_json(input), input);
    }

    // --- parse_launchers tests ---

    #[test]
    fn parse_launchers_valid_json() {
        let result = parse_launchers(sample_json_one()).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "App");
    }

    #[test]
    fn parse_launchers_empty_string_returns_empty_vec() {
        let result = parse_launchers("").unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn parse_launchers_whitespace_only_returns_empty_vec() {
        let result = parse_launchers("   \n  ").unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn parse_launchers_bom_only_returns_empty_vec() {
        let result = parse_launchers("\u{feff}").unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn parse_launchers_bom_with_whitespace_returns_empty_vec() {
        let result = parse_launchers("\u{feff}  \n  ").unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn parse_launchers_empty_array() {
        let result = parse_launchers("[]").unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn parse_launchers_with_utf8_bom() {
        let input = format!("\u{feff}{}", sample_json_one());
        let result = parse_launchers(&input).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "App");
    }

    #[test]
    fn parse_launchers_with_bom_and_whitespace() {
        let input = format!("\u{feff}  \n  {}  \n", sample_json_one());
        let result = parse_launchers(&input).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn parse_launchers_with_crlf_line_endings() {
        let input = "[\r\n{\"id\":\"1\",\"name\":\"App\",\"executable\":\"a.exe\",\"arguments\":\"\",\"workingDirectory\":\"\",\"category\":\"General\",\"icon\":\"🚀\",\"envVars\":{}}\r\n]";
        let result = parse_launchers(input).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn parse_launchers_invalid_json_returns_error() {
        let result = parse_launchers("not json at all");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to parse launchers.json"));
    }

    #[test]
    fn parse_launchers_truncated_json_returns_error() {
        let result = parse_launchers("[{\"id\":\"1\",\"name\":");
        assert!(result.is_err());
    }

    #[test]
    fn parse_launchers_wrong_shape_returns_error() {
        let result = parse_launchers(r#"{"not": "an array"}"#);
        assert!(result.is_err());
    }

    #[test]
    fn parse_launchers_missing_required_field_returns_error() {
        let result = parse_launchers(r#"[{"id":"1","name":"App"}]"#);
        assert!(result.is_err());
    }

    #[test]
    fn parse_launchers_reordered_fields() {
        let json = r#"[
            {
                "envVars": {},
                "id": "81085098-a80e-4f31-b06e-47f4779ca288",
                "arguments": "--hydraprofile=charlihcx --profile=Hephaestus",
                "category": "RuneLite",
                "workingDirectory": "C:\\Users\\raghav\\AppData\\Local\\RuneLite",
                "name": "BronzeSonnet",
                "executable": "C:\\Users\\raghav\\AppData\\Local\\RuneLite\\RuneLite.exe",
                "icon": "🎮"
            }
        ]"#;
        let result = parse_launchers(json).unwrap();
        assert_eq!(result[0].name, "BronzeSonnet");
        assert_eq!(result[0].category, "RuneLite");
    }

    #[test]
    fn parse_launchers_real_world_multi_entry() {
        let json = r#"[
            {
                "id": "a83aca19-dadf-4061-b50a-7cd340c4bfde",
                "name": "funmaxxing",
                "executable": "C:\\Users\\raghav\\AppData\\Local\\RuneLite\\RuneLite.exe",
                "arguments": " --hydraprofile=charlihcx --profile=Hephaestus",
                "workingDirectory": "",
                "category": "General",
                "icon": "🎮",
                "envVars": {}
            },
            {
                "envVars": {},
                "id": "81085098-a80e-4f31-b06e-47f4779ca288",
                "arguments": "--hydraprofile=charlihcx --profile=Hephaestus",
                "category": "RuneLite",
                "workingDirectory": "C:\\Users\\raghav\\AppData\\Local\\RuneLite",
                "name": "BronzeSonnet",
                "executable": "C:\\Users\\raghav\\AppData\\Local\\RuneLite\\RuneLite.exe",
                "icon": "🎮"
            }
        ]"#;
        let result = parse_launchers(json).unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].name, "funmaxxing");
        assert_eq!(result[1].name, "BronzeSonnet");
    }

    #[test]
    fn parse_launchers_bom_prefixed_real_world_data() {
        let json = format!("\u{feff}{}", r#"[
            {
                "id": "1",
                "name": "App",
                "executable": "app.exe",
                "arguments": "--test",
                "workingDirectory": "C:\\",
                "category": "General",
                "icon": "🚀",
                "envVars": {"KEY": "val"}
            }
        ]"#);
        let result = parse_launchers(&json).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].env_vars.get("KEY").unwrap(), "val");
    }

    // --- serialization tests ---

    #[test]
    fn serializes_launcher_config_to_camel_case() {
        let launcher = sample_launcher();
        let json = serde_json::to_string(&launcher).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert!(parsed.get("workingDirectory").is_some());
        assert!(parsed.get("envVars").is_some());
        assert!(parsed.get("working_directory").is_none());
        assert!(parsed.get("env_vars").is_none());
    }

    #[test]
    fn roundtrip_serialization() {
        let mut env = HashMap::new();
        env.insert("PATH".to_string(), "/usr/bin".to_string());
        env.insert("NODE_ENV".to_string(), "production".to_string());

        let launcher = LauncherConfig {
            id: "round-trip".to_string(),
            name: "RT App".to_string(),
            executable: "app.exe".to_string(),
            arguments: "--config prod".to_string(),
            working_directory: "/opt/app".to_string(),
            category: "Backend".to_string(),
            icon: "⚡".to_string(),
            env_vars: env,
        };

        let json = serde_json::to_string_pretty(&launcher).unwrap();
        let deserialized: LauncherConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(launcher.id, deserialized.id);
        assert_eq!(launcher.name, deserialized.name);
        assert_eq!(launcher.executable, deserialized.executable);
        assert_eq!(launcher.arguments, deserialized.arguments);
        assert_eq!(launcher.working_directory, deserialized.working_directory);
        assert_eq!(launcher.category, deserialized.category);
        assert_eq!(launcher.icon, deserialized.icon);
        assert_eq!(launcher.env_vars, deserialized.env_vars);
    }

    #[test]
    fn roundtrip_through_parse_launchers() {
        let launchers = vec![sample_launcher()];
        let json = serde_json::to_string_pretty(&launchers).unwrap();
        let result = parse_launchers(&json).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, launchers[0].id);
        assert_eq!(result[0].name, launchers[0].name);
    }

    // --- argument parsing tests ---

    #[test]
    fn argument_parsing_simple() {
        let parsed = shell_words::split("--profile=test --port 8080").unwrap();
        assert_eq!(parsed, vec!["--profile=test", "--port", "8080"]);
    }

    #[test]
    fn argument_parsing_quoted_strings() {
        let parsed = shell_words::split(r#"--name "hello world" --flag"#).unwrap();
        assert_eq!(parsed, vec!["--name", "hello world", "--flag"]);
    }

    #[test]
    fn argument_parsing_empty() {
        let parsed = shell_words::split("").unwrap();
        assert!(parsed.is_empty());
    }

    // --- UUID generation test ---

    #[test]
    fn uuid_generation_produces_valid_format() {
        let id = Uuid::new_v4().to_string();
        assert_eq!(id.len(), 36);
        assert_eq!(id.chars().filter(|c| *c == '-').count(), 4);
    }

    // --- DWMS herb seed parsing tests ---

    #[test]
    fn parse_dwms_value_with_timestamp() {
        let (ts, items) = parse_dwms_value("1781511529841;5291x93,5292x82,5304x26");
        assert_eq!(ts, Some(1781511529841));
        assert_eq!(items, vec![(5291, 93), (5292, 82), (5304, 26)]);
    }

    #[test]
    fn parse_dwms_value_without_timestamp() {
        let (ts, items) = parse_dwms_value("5291x10,5292x20");
        assert_eq!(ts, None);
        assert_eq!(items, vec![(5291, 10), (5292, 20)]);
    }

    #[test]
    fn parse_dwms_value_drops_empty_slots() {
        let (_, items) = parse_dwms_value("100;5291x5,-1x0,5292x7");
        assert_eq!(items, vec![(5291, 5), (5292, 7)]);
    }

    #[test]
    fn parse_dwms_value_skips_malformed_parts() {
        let (_, items) = parse_dwms_value("5291x5,garbage,5292xNaN,5293x9");
        assert_eq!(items, vec![(5291, 5), (5293, 9)]);
    }

    #[test]
    fn parse_dwms_value_empty() {
        let (ts, items) = parse_dwms_value("");
        assert_eq!(ts, None);
        assert!(items.is_empty());
    }

    #[test]
    fn format_epoch_ms_known_value() {
        // 1781511529841 ms = 2026-06-15 ... (sanity: matches the snapshot era in the data)
        let formatted = format_epoch_ms(1781511529841);
        assert!(formatted.starts_with("2026-06-15"), "got {formatted}");
        assert!(formatted.ends_with(" UTC"));
    }

    #[test]
    fn format_epoch_ms_unix_epoch() {
        assert_eq!(format_epoch_ms(0), "1970-01-01 00:00:00 UTC");
    }

    #[test]
    fn extract_funmaxxing_merges_bank_and_seed_vault() {
        // Ranarr (5295) appears in both storages and should be summed.
        let content = "\
rsprofile.rsprofile.abc123.displayName=funmaxxing
dudewheresmystuff.rsprofile.abc123.world.bank=200;5291x10,5295x3
dudewheresmystuff.rsprofile.abc123.world.seedvault=300;5295x90,5304x26
";
        let (items, ts) = extract_funmaxxing_items(content).unwrap();
        assert_eq!(items.get(&5291), Some(&10));
        assert_eq!(items.get(&5295), Some(&93)); // 3 (bank) + 90 (seed vault)
        assert_eq!(items.get(&5304), Some(&26));
        assert_eq!(ts, Some(300)); // newest of the two storages
    }

    #[test]
    fn extract_funmaxxing_prefers_account_with_data() {
        // Two accounts share the display name; only one has storage data.
        let content = "\
rsprofile.rsprofile.empty1.displayName=funmaxxing
rsprofile.rsprofile.real99.displayName=funmaxxing
dudewheresmystuff.rsprofile.real99.world.seedvault=500;5295x42
";
        let (items, ts) = extract_funmaxxing_items(content).unwrap();
        assert_eq!(items.get(&5295), Some(&42));
        assert_eq!(ts, Some(500));
    }

    #[test]
    fn extract_funmaxxing_no_account_errors() {
        let content = "rsprofile.rsprofile.abc.displayName=someoneelse\n";
        assert!(extract_funmaxxing_items(content).is_err());
    }

    #[test]
    fn extract_funmaxxing_account_without_storage_errors() {
        let content = "rsprofile.rsprofile.abc.displayName=funmaxxing\n";
        let err = extract_funmaxxing_items(content).unwrap_err();
        assert!(err.contains("No bank or seed vault data"));
    }
}
