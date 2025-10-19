use wasm_bindgen::prelude::*;

/// Set up better panic messages in wasm
pub fn set_panic_hook() {
    // Panic hook can be added later if needed
}

/// Log to browser console
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    pub fn error(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    pub fn warn(s: &str);
}

#[allow(unused_macros)]
macro_rules! console_log {
    ($($t:tt)*) => {
        $crate::utils::log(&format!($($t)*))
    };
}

#[allow(unused_macros)]
macro_rules! console_error {
    ($($t:tt)*) => {
        $crate::utils::error(&format!($($t)*))
    };
}

#[allow(unused_macros)]
macro_rules! console_warn {
    ($($t:tt)*) => {
        $crate::utils::warn(&format!($($t)*))
    };
}

pub(crate) use console_log;

