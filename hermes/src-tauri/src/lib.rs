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
const FUNMAXXING_ACCOUNT: &str = "accId#hash1#-2426420333369957777";

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

fn parse_date_sortable(date_str: &str) -> String {
    // "00:32:11, 3 Jun 2026" -> "2026-06-03 00:32:11"
    let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    let parts: Vec<&str> = date_str.splitn(2, ", ").collect();
    if parts.len() != 2 { return String::new(); }
    let time = parts[0].trim();
    let date_parts: Vec<&str> = parts[1].trim().split_whitespace().collect();
    if date_parts.len() != 3 { return String::new(); }
    let day: u32 = date_parts[0].parse().unwrap_or(0);
    let month = months.iter().position(|&m| m == date_parts[1]).map(|i| i + 1).unwrap_or(0);
    let year: u32 = date_parts[2].parse().unwrap_or(0);
    format!("{:04}-{:02}-{:02} {}", year, month, day, time)
}

fn parse_bank_entries(content: &str) -> Vec<serde_json::Value> {
    let key_prefix = "bankMemory.currentList=";
    let Some(line) = content.lines().find(|l| l.starts_with(key_prefix)) else {
        return Vec::new();
    };
    let raw_json = &line[key_prefix.len()..];
    let json_str = raw_json.replace("\\:", ":").replace("\\#", "#").replace("\\=", "=");
    serde_json::from_str(&json_str).unwrap_or_default()
}

#[tauri::command]
fn get_herb_seeds() -> Result<BankSeedData, String> {
    let dir = PathBuf::from(PROFILES_DIR);
    if !dir.exists() {
        return Err(format!("Profiles directory not found: {}", dir.display()));
    }

    let mut best_entry: Option<serde_json::Value> = None;
    let mut best_date = String::new();

    for file in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let file = match file {
            Ok(f) => f,
            Err(_) => continue,
        };
        let path = file.path();
        if path.extension().and_then(|e| e.to_str()) != Some("properties") {
            continue;
        }
        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        for entry in parse_bank_entries(&content) {
            let is_funmaxxing = entry.get("accountIdentifier")
                .and_then(|v| v.as_str()) == Some(FUNMAXXING_ACCOUNT);
            if !is_funmaxxing { continue; }
            // Parse "HH:MM:SS, DD Mon YYYY" to compare dates
            let date_str = entry.get("dateTimeString")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            // Convert to sortable "YYYY Mon DD HH:MM:SS" for comparison
            // Format: "00:32:11, 3 Jun 2026" -> sortable key
            let sortable = parse_date_sortable(date_str);
            if sortable > best_date {
                best_date = sortable;
                best_entry = Some(entry);
            }
        }
    }

    let entry = best_entry.ok_or("No bank data found for funmaxxing")?;

    let snapshot_date = entry.get("dateTimeString")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let item_data = entry.get("itemData")
        .and_then(|v| v.as_str())
        .ok_or("No itemData in bank entry")?;

    let parts: Vec<&str> = item_data.split(',').collect();
    let mut item_map: HashMap<u32, u32> = HashMap::new();
    let mut i = 0;
    while i + 1 < parts.len() {
        if let (Ok(id), Ok(qty)) = (parts[i].parse::<u32>(), parts[i + 1].parse::<u32>()) {
            item_map.insert(id, qty);
            i += 2;
        } else {
            i += 1;
        }
    }

    let seeds: Vec<HerbSeedCount> = HERB_SEED_IDS.iter().map(|(id, name)| {
        HerbSeedCount {
            herb: name.to_string(),
            item_id: *id,
            quantity: item_map.get(id).copied().unwrap_or(0),
        }
    }).collect();

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
}
