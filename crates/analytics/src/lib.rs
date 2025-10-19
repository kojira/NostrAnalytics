use wasm_bindgen::prelude::*;

mod analytics;
mod error;
mod language;
mod nostr_utils;
mod relay_client;
mod types;
mod utils;

pub use analytics::*;
pub use error::AnalyticsError;
pub use language::*;
pub use nostr_utils::*;
pub use relay_client::*;
pub use types::*;

/// Initialize the analytics module with logging
#[wasm_bindgen(start)]
pub fn init() {
    utils::set_panic_hook();
}

/// Get version information
#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

