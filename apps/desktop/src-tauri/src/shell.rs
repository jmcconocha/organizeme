use crate::AppResult;
use std::process::Command;

/// Opens a path in the system file manager (Finder on macOS).
pub async fn open_in_finder(path: &str) -> AppResult {
    match Command::new("open").arg(path).spawn() {
        Ok(_) => AppResult {
            success: true,
            message: format!("Opened {} in Finder", path),
        },
        Err(e) => AppResult {
            success: false,
            message: format!("Failed to open in Finder: {}", e),
        },
    }
}

/// Opens a path in the system terminal (Terminal.app on macOS).
pub async fn open_in_terminal(path: &str) -> AppResult {
    match Command::new("open")
        .args(["-a", "Terminal", path])
        .spawn()
    {
        Ok(_) => AppResult {
            success: true,
            message: format!("Opened {} in Terminal", path),
        },
        Err(e) => AppResult {
            success: false,
            message: format!("Failed to open in Terminal: {}", e),
        },
    }
}

/// Opens a path in Visual Studio Code.
pub async fn open_in_vscode(path: &str) -> AppResult {
    match Command::new("code").arg(path).spawn() {
        Ok(_) => AppResult {
            success: true,
            message: format!("Opened {} in VS Code", path),
        },
        Err(e) => AppResult {
            success: false,
            message: format!("Failed to open in VS Code: {}", e),
        },
    }
}

/// Opens a URL in the default browser.
pub async fn open_in_browser(url: &str) -> AppResult {
    match open::that(url) {
        Ok(_) => AppResult {
            success: true,
            message: format!("Opened {} in browser", url),
        },
        Err(e) => AppResult {
            success: false,
            message: format!("Failed to open in browser: {}", e),
        },
    }
}
