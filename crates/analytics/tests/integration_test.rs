use nostr_analytics::*;

#[test]
fn test_epoch_day_conversion() {
    // 2024-01-01 00:00:00 UTC = 1704067200
    let timestamp = 1704067200u64;
    let epoch_day = timestamp_to_epoch_day(timestamp);
    
    // Should be 19723 days since Unix epoch
    assert_eq!(epoch_day, 19723);
    
    // Convert back
    let back = epoch_day_to_timestamp(epoch_day);
    assert_eq!(back, timestamp);
}

#[test]
fn test_epoch_day_range() {
    // Test a range of dates
    let start = 1704067200u64; // 2024-01-01
    let end = 1704153600u64;   // 2024-01-02
    
    let start_day = timestamp_to_epoch_day(start);
    let end_day = timestamp_to_epoch_day(end);
    
    assert_eq!(end_day - start_day, 1);
}

#[test]
fn test_user_languages_add() {
    let mut user_langs = UserLanguages::new();
    
    user_langs.add_language("en".to_string(), 0.9, 5);
    user_langs.add_language("ja".to_string(), 0.8, 5);
    
    assert!(user_langs.has_language("en"));
    assert!(user_langs.has_language("ja"));
    assert!(!user_langs.has_language("es"));
}

#[test]
fn test_user_languages_max_limit() {
    let mut user_langs = UserLanguages::new();
    
    // Add 10 languages but limit to 3
    for i in 0..10 {
        let lang = format!("lang{}", i);
        let confidence = 0.5 + (i as f32 * 0.05);
        user_langs.add_language(lang, confidence, 3);
    }
    
    // Should only keep top 3
    assert_eq!(user_langs.languages.len(), 3);
}

#[test]
fn test_language_index_creation() {
    let since = 1704067200u64;
    let until = 1711929600u64;
    
    let index = LanguageIndex::new(since, until);
    
    assert_eq!(index.since, since);
    assert_eq!(index.until, until);
    assert_eq!(index.user_languages.len(), 0);
}

#[test]
fn test_language_index_get_users() {
    let mut index = LanguageIndex::new(1704067200, 1711929600);
    
    let mut user1 = UserLanguages::new();
    user1.add_language("en".to_string(), 0.9, 5);
    index.user_languages.insert("pubkey1".to_string(), user1);
    
    let mut user2 = UserLanguages::new();
    user2.add_language("ja".to_string(), 0.8, 5);
    index.user_languages.insert("pubkey2".to_string(), user2);
    
    let mut user3 = UserLanguages::new();
    user3.add_language("en".to_string(), 0.7, 5);
    index.user_languages.insert("pubkey3".to_string(), user3);
    
    let en_users = index.get_users_for_language("en");
    assert_eq!(en_users.len(), 2);
    assert!(en_users.contains("pubkey1"));
    assert!(en_users.contains("pubkey3"));
    
    let ja_users = index.get_users_for_language("ja");
    assert_eq!(ja_users.len(), 1);
    assert!(ja_users.contains("pubkey2"));
}

