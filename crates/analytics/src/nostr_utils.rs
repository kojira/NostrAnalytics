use wasm_bindgen::prelude::*;
use nostr::{Event, EventBuilder, Keys, Kind, PublicKey, Tag, Timestamp};
use nostr::nips::nip19::ToBech32;
use nostr::types::time::Instant;
use serde::Serialize;

/// キーペアの生成結果
#[derive(Serialize)]
struct GeneratedKeys {
    public_key: String,
    secret_key: String,
}

/// キーペアの生成
#[wasm_bindgen]
pub fn generate_keys() -> Result<JsValue, JsValue> {
    let keys = Keys::generate();
    let result = GeneratedKeys {
        public_key: keys.public_key().to_hex(),
        secret_key: keys.secret_key().to_secret_hex(),
    };
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// 秘密鍵から公開鍵を導出 (nostr-tools互換)
#[wasm_bindgen]
pub fn get_public_key(secret_key_hex: String) -> Result<String, JsValue> {
    let keys = Keys::parse(&secret_key_hex)
        .map_err(|e| JsValue::from_str(&format!("Invalid secret key: {}", e)))?;
    Ok(keys.public_key().to_hex())
}

/// イベントのハッシュを計算 (nostr-tools互換)
#[wasm_bindgen]
pub fn get_event_hash(event_json: JsValue) -> Result<String, JsValue> {
    let event: Event = serde_wasm_bindgen::from_value(event_json)
        .map_err(|e| JsValue::from_str(&format!("Deserialization error: {}", e)))?;
    
    Ok(event.id.to_hex())
}

/// イベントに署名 (nostr-tools互換)
/// 注意: このAPIはnostr-toolsと完全互換ではありません
/// フロントエンドでnostr-toolsを使い続けることを推奨します
#[wasm_bindgen]
pub fn get_signature(_event_json: JsValue, _secret_key_hex: String) -> Result<String, JsValue> {
    // rust-nostrの署名はasync関数なので、WASMから直接呼び出すのは困難
    // 代わりにnostr-toolsを使用することを推奨
    Err(JsValue::from_str("Use nostr-tools for signing. rust-nostr signing requires async context."))
}

/// 公開鍵をnpub形式に変換
#[wasm_bindgen]
pub fn public_key_to_npub(hex_pubkey: String) -> Result<String, JsValue> {
    let pubkey = PublicKey::parse(&hex_pubkey)
        .map_err(|e| JsValue::from_str(&format!("Invalid public key: {}", e)))?;
    pubkey.to_bech32().map_err(|e| JsValue::from_str(&format!("Bech32 encoding error: {}", e)))
}

/// npub形式から公開鍵のhexに変換
#[wasm_bindgen]
pub fn npub_to_public_key(npub: String) -> Result<String, JsValue> {
    let pubkey = PublicKey::parse(&npub)
        .map_err(|e| JsValue::from_str(&format!("Invalid npub: {}", e)))?;
    Ok(pubkey.to_hex())
}

/// イベントビルダー
#[wasm_bindgen]
pub struct NostrEventBuilder {
    kind: Kind,
    content: String,
    tags: Vec<Tag>,
}

#[wasm_bindgen]
impl NostrEventBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new(kind: u16, content: String) -> Self {
        NostrEventBuilder {
            kind: Kind::from(kind),
            content,
            tags: Vec::new(),
        }
    }

    pub fn add_tag(&mut self, tag_type: String, values: Vec<String>) {
        let mut buf: Vec<String> = Vec::with_capacity(1 + values.len());
        buf.push(tag_type);
        buf.extend(values);
        if let Ok(tag) = Tag::parse(buf) {
            self.tags.push(tag);
        }
    }

    pub fn to_unsigned_event(&self, author_pubkey: String) -> Result<JsValue, JsValue> {
        let pubkey = PublicKey::parse(&author_pubkey)
            .map_err(|e| JsValue::from_str(&format!("Invalid public key: {}", e)))?;

        let supplier = Instant::now();

        let unsigned = EventBuilder::new(self.kind, self.content.clone())
            .tags(self.tags.clone())
            .build_with_ctx(&supplier, pubkey);

        serde_wasm_bindgen::to_value(&unsigned)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

/// イベントIDの検証
#[wasm_bindgen]
pub fn verify_event_id(event_json: JsValue) -> Result<bool, JsValue> {
    let event: Event = serde_wasm_bindgen::from_value(event_json)
        .map_err(|e| JsValue::from_str(&format!("Deserialization error: {}", e)))?;
    Ok(event.verify_id())
}

/// イベントの署名検証
#[wasm_bindgen]
pub fn verify_event_signature(event_json: JsValue) -> Result<bool, JsValue> {
    let event: Event = serde_wasm_bindgen::from_value(event_json)
        .map_err(|e| JsValue::from_str(&format!("Deserialization error: {}", e)))?;
    Ok(event.verify_signature())
}

/// 現在のタイムスタンプを取得
#[wasm_bindgen]
pub fn now() -> u64 {
    Timestamp::now().as_u64()
}

