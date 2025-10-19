use crate::language::detect_language;
use crate::relay_client::NostrEvent;
use crate::types::*;
use crate::utils::console_log;
use serde::Serialize;
use std::collections::{HashMap, HashSet, VecDeque};
use wasm_bindgen::prelude::*;

/// Process events for language index building
#[wasm_bindgen]
pub fn process_events_for_language_index(
    events_json: JsValue,
    conf_thresh: f32,
    max_langs_per_user: u8,
) -> Result<JsValue, JsValue> {
    let events: Vec<NostrEvent> = serde_wasm_bindgen::from_value(events_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse events: {}", e)))?;
    
    console_log!("Processing {} events for language index", events.len());
    
    let mut user_languages: HashMap<PubkeyHex, UserLanguages> = HashMap::new();
    let mut events_with_language = 0u32;
    
    for event in events.iter() {
        let content = event.get_content();
        if content.is_empty() {
            continue;
        }
        
        // Detect language
        match detect_language(content) {
            Ok(Some((lang, confidence))) => {
                if confidence >= conf_thresh {
                    let pubkey = event.get_pubkey().to_string();
                    let user_langs = user_languages
                        .entry(pubkey)
                        .or_default();
                    
                    user_langs.add_language(lang, confidence, max_langs_per_user);
                    events_with_language += 1;
                }
            }
            Ok(None) => {}
            Err(e) => {
                console_log!("Language detection error: {}", e);
            }
        }
    }
    
    // Calculate stats by language
    let mut by_lang: HashMap<LanguageCode, u32> = HashMap::new();
    for user_langs in user_languages.values() {
        for lang in user_langs.languages.keys() {
            *by_lang.entry(lang.clone()).or_insert(0) += 1;
        }
    }
    
    let result = LanguageIndexResult {
        users: user_languages.len() as u32,
        by_lang,
        events_processed: events.len() as u32,
        events_with_language,
    };
    
    console_log!(
        "Language index: {} users, {} events with language",
        result.users,
        result.events_with_language
    );
    
    // Convert user_languages to a simpler format for JS
    let user_languages_map: HashMap<String, HashMap<String, f32>> = user_languages
        .into_iter()
        .map(|(k, v)| (k, v.languages))
        .collect();
    
    // Create output structure
    #[derive(Serialize)]
    struct Output {
        result: LanguageIndexResult,
        #[serde(rename = "userLanguages")]
        user_languages: HashMap<String, HashMap<String, f32>>,
    }
    
    let output = Output {
        result,
        user_languages: user_languages_map,
    };
    
    serde_wasm_bindgen::to_value(&output)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Compute metrics from events and language index
#[wasm_bindgen]
pub fn compute_metrics_from_events(
    events_json: JsValue,
    user_languages_json: JsValue,
    target_languages: Vec<String>,
    since: u64,
    until: u64,
    window_days: u16,
) -> Result<JsValue, JsValue> {
    let events: Vec<NostrEvent> = serde_wasm_bindgen::from_value(events_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse events: {}", e)))?;
    
    let user_languages: HashMap<PubkeyHex, HashMap<LanguageCode, f32>> =
        serde_wasm_bindgen::from_value(user_languages_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse user languages: {}", e)))?;
    
    console_log!(
        "Computing metrics: {} events, {} users, window {} days",
        events.len(),
        user_languages.len(),
        window_days
    );
    
    // Build eligible users set (users who have posted in target languages)
    let mut eligible_users = HashSet::new();
    for (pubkey, langs) in user_languages.iter() {
        for target_lang in &target_languages {
            if langs.contains_key(target_lang) {
                eligible_users.insert(pubkey.clone());
                break;
            }
        }
    }
    
    console_log!("Eligible users: {}", eligible_users.len());
    
    // Collect activity by day
    let mut activity_by_day: HashMap<EpochDay, HashSet<PubkeyHex>> = HashMap::new();
    
    for event in events.iter() {
        let pubkey = event.get_pubkey().to_string();
        
        // Only count eligible users
        if !eligible_users.contains(&pubkey) {
            continue;
        }
        
        let epoch_day = timestamp_to_epoch_day(event.get_created_at());
        activity_by_day
            .entry(epoch_day)
            .or_default()
            .insert(pubkey);
    }
    
    // Compute sliding window metrics
    let start_day = timestamp_to_epoch_day(since);
    let end_day = timestamp_to_epoch_day(until);
    let window_days = window_days as u32;
    
    let mut results = Vec::new();
    let mut window: VecDeque<(EpochDay, HashSet<PubkeyHex>)> = VecDeque::new();
    let mut active_users: HashMap<PubkeyHex, u32> = HashMap::new();
    
    for day in start_day..=end_day {
        // Add current day to window
        if let Some(users) = activity_by_day.get(&day) {
            window.push_back((day, users.clone()));
            for user in users {
                *active_users.entry(user.clone()).or_insert(0) += 1;
            }
        }
        
        // Remove days outside window
        while let Some((old_day, _)) = window.front() {
            if day >= *old_day + window_days {
                let (_, old_users) = window.pop_front().unwrap();
                for user in old_users {
                    if let Some(count) = active_users.get_mut(&user) {
                        *count -= 1;
                        if *count == 0 {
                            active_users.remove(&user);
                        }
                    }
                }
            } else {
                break;
            }
        }
        
        // Count unique active users in window
        let count = active_users.len() as u32;
        results.push(MetricDataPoint {
            epoch_day: day,
            count,
        });
    }
    
    console_log!("Computed {} data points", results.len());
    
    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Compute metrics from events and language index, separated by language
#[wasm_bindgen]
pub fn compute_metrics_by_language(
    events_json: JsValue,
    user_languages_json: JsValue,
    target_languages: Vec<String>,
    since: u64,
    until: u64,
    window_days: u16,
) -> Result<JsValue, JsValue> {
    let events: Vec<NostrEvent> = serde_wasm_bindgen::from_value(events_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse events: {}", e)))?;
    
    let user_languages: HashMap<PubkeyHex, HashMap<LanguageCode, f32>> =
        serde_wasm_bindgen::from_value(user_languages_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse user languages: {}", e)))?;
    
    console_log!(
        "Computing metrics by language: {} events, {} users, {} languages, window {} days",
        events.len(),
        user_languages.len(),
        target_languages.len(),
        window_days
    );
    
    let start_day = timestamp_to_epoch_day(since);
    let end_day = timestamp_to_epoch_day(until);
    let window_days = window_days as u32;
    
    // Build results for each language
    let mut results_by_lang: HashMap<LanguageCode, Vec<MetricDataPoint>> = HashMap::new();
    
    for target_lang in &target_languages {
        // Build eligible users for this language
        let mut eligible_users = HashSet::new();
        for (pubkey, langs) in user_languages.iter() {
            if langs.contains_key(target_lang) {
                eligible_users.insert(pubkey.clone());
            }
        }
        
        console_log!("Language {}: {} eligible users", target_lang, eligible_users.len());
        
        // Collect activity by day for this language
        let mut activity_by_day: HashMap<EpochDay, HashSet<PubkeyHex>> = HashMap::new();
        
        for event in events.iter() {
            let pubkey = event.get_pubkey().to_string();
            
            if !eligible_users.contains(&pubkey) {
                continue;
            }
            
            let epoch_day = timestamp_to_epoch_day(event.get_created_at());
            activity_by_day
                .entry(epoch_day)
                .or_default()
                .insert(pubkey);
        }
        
        // Compute sliding window metrics for this language
        let mut results = Vec::new();
        let mut window: VecDeque<(EpochDay, HashSet<PubkeyHex>)> = VecDeque::new();
        let mut active_users: HashMap<PubkeyHex, u32> = HashMap::new();
        
        for day in start_day..=end_day {
            // Add current day to window
            if let Some(users) = activity_by_day.get(&day) {
                window.push_back((day, users.clone()));
                for user in users {
                    *active_users.entry(user.clone()).or_insert(0) += 1;
                }
            }
            
            // Remove days outside window
            while let Some((old_day, _)) = window.front() {
                if day >= *old_day + window_days {
                    let (_, old_users) = window.pop_front().unwrap();
                    for user in old_users {
                        if let Some(count) = active_users.get_mut(&user) {
                            *count -= 1;
                            if *count == 0 {
                                active_users.remove(&user);
                            }
                        }
                    }
                } else {
                    break;
                }
            }
            
            // Count unique active users in window
            let count = active_users.len() as u32;
            results.push(MetricDataPoint {
                epoch_day: day,
                count,
            });
        }
        
        results_by_lang.insert(target_lang.clone(), results);
    }
    
    console_log!("Computed metrics for {} languages", results_by_lang.len());
    
    serde_wasm_bindgen::to_value(&results_by_lang)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}
