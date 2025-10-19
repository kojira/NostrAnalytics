use thiserror::Error;
use wasm_bindgen::JsValue;

#[derive(Error, Debug)]
pub enum AnalyticsError {
    #[error("Relay connection error: {0}")]
    RelayConnection(String),

    #[error("Event parsing error: {0}")]
    EventParsing(String),

    #[error("Language detection error: {0}")]
    LanguageDetection(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),

    #[error("Computation error: {0}")]
    Computation(String),

    #[error("Nostr SDK error: {0}")]
    NostrSdk(String),
}

impl From<AnalyticsError> for JsValue {
    fn from(err: AnalyticsError) -> Self {
        JsValue::from_str(&err.to_string())
    }
}

impl From<serde_json::Error> for AnalyticsError {
    fn from(err: serde_json::Error) -> Self {
        AnalyticsError::Serialization(err.to_string())
    }
}

