// Relay client is now handled in JavaScript/TypeScript
// This module provides types and helpers for the WASM interface

use crate::types::Timestamp;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NostrEvent {
    pub id: String,
    pub pubkey: String,
    pub created_at: u64,
    pub kind: u16,
    pub tags: Vec<Vec<String>>,
    pub content: String,
    pub sig: String,
}

impl NostrEvent {
    pub fn get_content(&self) -> &str {
        &self.content
    }
    
    pub fn get_pubkey(&self) -> &str {
        &self.pubkey
    }
    
    pub fn get_created_at(&self) -> Timestamp {
        self.created_at
    }
}
