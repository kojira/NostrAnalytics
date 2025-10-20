use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;

/// Language code (ISO 639-1)
pub type LanguageCode = String;

/// Public key (hex string)
pub type PubkeyHex = String;

/// Event ID (hex string)
pub type EventId = String;

/// Unix timestamp in seconds
pub type Timestamp = u64;

/// Epoch day (days since Unix epoch)
pub type EpochDay = u32;

/// Result of language index building
#[derive(Serialize, Deserialize, Clone, Debug)]
#[wasm_bindgen(getter_with_clone)]
pub struct LanguageIndexResult {
    /// Total number of unique users found
    pub users: u32,

    /// Users per language
    #[wasm_bindgen(skip)]
    pub by_lang: HashMap<LanguageCode, u32>,

    /// Total events processed
    pub events_processed: u32,

    /// Events with detected language
    pub events_with_language: u32,
}

#[wasm_bindgen]
impl LanguageIndexResult {
    #[wasm_bindgen(getter)]
    pub fn by_lang(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.by_lang).unwrap_or(JsValue::NULL)
    }
}

/// Options for building language index
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LanguageIndexOptions {
    /// Start timestamp (Unix seconds)
    pub since: Timestamp,

    /// End timestamp (Unix seconds)
    pub until: Timestamp,

    /// Maximum events to process (optional)
    pub max_events: Option<u32>,

    /// Confidence threshold (0.0-1.0, default 0.5)
    pub conf_thresh: Option<f32>,

    /// Maximum languages per user (default 5)
    pub max_langs_per_user: Option<u8>,
}

/// Options for computing metrics
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MetricsOptions {
    /// Start timestamp (Unix seconds)
    pub since: Timestamp,

    /// End timestamp (Unix seconds)
    pub until: Timestamp,

    /// Target languages
    pub languages: Vec<LanguageCode>,

    /// Granularity (currently only "day" supported)
    pub granularity: String,

    /// Window size in days (1=DAU, 7=WAU, 30=MAU, 365=YAU)
    pub window_days: u16,
}

/// Single data point in metrics result
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MetricDataPoint {
    /// Epoch day
    pub epoch_day: EpochDay,

    /// Count of active users
    pub count: u32,
}

/// Structure to track user languages
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserLanguages {
    /// Languages detected for this user with confidence scores
    pub languages: HashMap<LanguageCode, f32>,
}

impl Default for UserLanguages {
    fn default() -> Self {
        Self::new()
    }
}

impl UserLanguages {
    pub fn new() -> Self {
        Self {
            languages: HashMap::new(),
        }
    }

    pub fn add_language(&mut self, lang: LanguageCode, confidence: f32, max_langs: u8) {
        // Update or insert
        self.languages
            .entry(lang)
            .and_modify(|c| *c = c.max(confidence))
            .or_insert(confidence);

        // Keep only top N languages
        if self.languages.len() > max_langs as usize {
            let mut langs: Vec<_> = self.languages.iter().collect();
            langs.sort_by(|a, b| b.1.partial_cmp(a.1).unwrap());
            self.languages = langs
                .into_iter()
                .take(max_langs as usize)
                .map(|(k, v)| (k.clone(), *v))
                .collect();
        }
    }

    pub fn has_language(&self, lang: &str) -> bool {
        self.languages.contains_key(lang)
    }
}

/// Structure for language index
#[derive(Clone, Debug)]
pub struct LanguageIndex {
    /// Map from pubkey to their languages
    pub user_languages: HashMap<PubkeyHex, UserLanguages>,

    /// Timestamp when this index was built
    pub built_at: Timestamp,

    /// Time range covered
    pub since: Timestamp,
    pub until: Timestamp,
}

impl LanguageIndex {
    pub fn new(since: Timestamp, until: Timestamp) -> Self {
        Self {
            user_languages: HashMap::new(),
            built_at: Self::current_timestamp(),
            since,
            until,
        }
    }

    #[cfg(target_arch = "wasm32")]
    fn current_timestamp() -> Timestamp {
        (js_sys::Date::now() / 1000.0) as u64
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn current_timestamp() -> Timestamp {
        use std::time::{SystemTime, UNIX_EPOCH};
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }

    pub fn get_users_for_language(&self, lang: &str) -> HashSet<PubkeyHex> {
        self.user_languages
            .iter()
            .filter(|(_, user_langs)| user_langs.has_language(lang))
            .map(|(pubkey, _)| pubkey.clone())
            .collect()
    }
}

/// Helper to convert timestamp to epoch day
pub fn timestamp_to_epoch_day(timestamp: Timestamp) -> EpochDay {
    (timestamp / 86400) as EpochDay
}

/// Helper to convert epoch day to timestamp (start of day)
pub fn epoch_day_to_timestamp(epoch_day: EpochDay) -> Timestamp {
    epoch_day as Timestamp * 86400
}
