use crate::error::AnalyticsError;
use whatlang::{detect, Lang};

/// Detect language from text content
/// Returns ISO 639-1 code and confidence (0.0-1.0)
pub fn detect_language(text: &str) -> Result<Option<(String, f32)>, AnalyticsError> {
    if text.trim().is_empty() {
        return Ok(None);
    }
    
    match detect(text) {
        Some(info) => {
            let lang_code = lang_to_iso639_1(info.lang());
            let confidence = info.confidence() as f32;
            Ok(Some((lang_code, confidence)))
        }
        None => Ok(None),
    }
}

/// Convert whatlang::Lang to ISO 639-1 code
fn lang_to_iso639_1(lang: Lang) -> String {
    match lang {
        Lang::Eng => "en",
        Lang::Rus => "ru",
        Lang::Cmn => "zh",
        Lang::Spa => "es",
        Lang::Por => "pt",
        Lang::Ita => "it",
        Lang::Ben => "bn",
        Lang::Fra => "fr",
        Lang::Deu => "de",
        Lang::Ukr => "uk",
        Lang::Kat => "ka",
        Lang::Ara => "ar",
        Lang::Hin => "hi",
        Lang::Jpn => "ja",
        Lang::Heb => "he",
        Lang::Yid => "yi",
        Lang::Pol => "pl",
        Lang::Amh => "am",
        Lang::Jav => "jv",
        Lang::Kor => "ko",
        Lang::Nob => "nb",
        Lang::Dan => "da",
        Lang::Swe => "sv",
        Lang::Fin => "fi",
        Lang::Tur => "tr",
        Lang::Nld => "nl",
        Lang::Hun => "hu",
        Lang::Ces => "cs",
        Lang::Ell => "el",
        Lang::Bul => "bg",
        Lang::Bel => "be",
        Lang::Mar => "mr",
        Lang::Kan => "kn",
        Lang::Ron => "ro",
        Lang::Slv => "sl",
        Lang::Hrv => "hr",
        Lang::Srp => "sr",
        Lang::Mkd => "mk",
        Lang::Lit => "lt",
        Lang::Lav => "lv",
        Lang::Est => "et",
        Lang::Tam => "ta",
        Lang::Vie => "vi",
        Lang::Urd => "ur",
        Lang::Tha => "th",
        Lang::Guj => "gu",
        Lang::Uzb => "uz",
        Lang::Pan => "pa",
        Lang::Aze => "az",
        Lang::Ind => "id",
        Lang::Tel => "te",
        Lang::Pes => "fa",
        Lang::Mal => "ml",
        Lang::Ori => "or",
        Lang::Mya => "my",
        Lang::Nep => "ne",
        Lang::Sin => "si",
        Lang::Khm => "km",
        Lang::Tuk => "tk",
        Lang::Aka => "ak",
        Lang::Zul => "zu",
        Lang::Sna => "sn",
        Lang::Afr => "af",
        Lang::Lat => "la",
        Lang::Slk => "sk",
        Lang::Cat => "ca",
        Lang::Tgl => "tl",
        Lang::Hye => "hy",
        Lang::Epo => "eo",
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_english() {
        let result = detect_language("Hello, this is a test message in English.").unwrap();
        assert!(result.is_some());
        let (lang, conf) = result.unwrap();
        assert_eq!(lang, "en");
        assert!(conf > 0.5);
    }

    #[test]
    fn test_detect_japanese() {
        let result = detect_language("こんにちは、これは日本語のテストメッセージです。").unwrap();
        assert!(result.is_some());
        let (lang, conf) = result.unwrap();
        assert_eq!(lang, "ja");
        assert!(conf > 0.5);
    }

    #[test]
    fn test_detect_empty() {
        let result = detect_language("").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_detect_short() {
        let result = detect_language("Hi").unwrap();
        // Short text may or may not be detected
        if let Some((_, conf)) = result {
            assert!((0.0..=1.0).contains(&conf));
        }
    }
}

