/**
 * App Settings - Type Definitions
 *
 * Server-side application settings persisted to ~/.organizeme/config.json.
 * Separate from DashboardSettings which are client-side (localStorage).
 */

/**
 * Application-level settings stored on disk.
 */
export interface AppSettings {
  /** Custom projects directory path. Empty string means use default. */
  projectsPath: string
}

/**
 * Default app settings.
 * Used when no config file exists or when resetting.
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  projectsPath: '',
}
