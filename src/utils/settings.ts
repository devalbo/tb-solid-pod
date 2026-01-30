import { Store } from 'tinybase';

/**
 * Settings keys used in TinyBase values storage
 */
export const SETTINGS_KEYS = {
  /** Default persona ID */
  DEFAULT_PERSONA_ID: 'defaultPersonaId',
  /** Theme preference: 'light' | 'dark' | 'system' */
  THEME: 'theme',
  /** CLI command history size (number of commands to keep) */
  CLI_HISTORY_SIZE: 'cliHistorySize',
  /** Auto-save interval in milliseconds (0 = disabled) */
  AUTO_SAVE_INTERVAL: 'autoSaveInterval',
  /** Show hidden files in file browser */
  SHOW_HIDDEN_FILES: 'showHiddenFiles',
  /** Default file content type when creating new files */
  DEFAULT_CONTENT_TYPE: 'defaultContentType',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

/**
 * Settings type definitions
 */
export interface SettingsSchema {
  [SETTINGS_KEYS.DEFAULT_PERSONA_ID]: string | undefined;
  [SETTINGS_KEYS.THEME]: 'light' | 'dark' | 'system';
  [SETTINGS_KEYS.CLI_HISTORY_SIZE]: number;
  [SETTINGS_KEYS.AUTO_SAVE_INTERVAL]: number;
  [SETTINGS_KEYS.SHOW_HIDDEN_FILES]: boolean;
  [SETTINGS_KEYS.DEFAULT_CONTENT_TYPE]: string;
}

/**
 * Default values for all settings
 */
export const SETTINGS_DEFAULTS: SettingsSchema = {
  [SETTINGS_KEYS.DEFAULT_PERSONA_ID]: undefined,
  [SETTINGS_KEYS.THEME]: 'system',
  [SETTINGS_KEYS.CLI_HISTORY_SIZE]: 100,
  [SETTINGS_KEYS.AUTO_SAVE_INTERVAL]: 0,
  [SETTINGS_KEYS.SHOW_HIDDEN_FILES]: false,
  [SETTINGS_KEYS.DEFAULT_CONTENT_TYPE]: 'text/plain',
};

/**
 * Settings metadata for display and validation
 */
export const SETTINGS_META: Record<
  SettingsKey,
  {
    label: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'enum';
    options?: string[];
  }
> = {
  [SETTINGS_KEYS.DEFAULT_PERSONA_ID]: {
    label: 'Default Persona',
    description: 'The persona used by default for authoring content',
    type: 'string',
  },
  [SETTINGS_KEYS.THEME]: {
    label: 'Theme',
    description: 'Color theme preference',
    type: 'enum',
    options: ['light', 'dark', 'system'],
  },
  [SETTINGS_KEYS.CLI_HISTORY_SIZE]: {
    label: 'CLI History Size',
    description: 'Number of CLI commands to keep in history',
    type: 'number',
  },
  [SETTINGS_KEYS.AUTO_SAVE_INTERVAL]: {
    label: 'Auto-save Interval',
    description: 'Auto-save interval in milliseconds (0 = disabled)',
    type: 'number',
  },
  [SETTINGS_KEYS.SHOW_HIDDEN_FILES]: {
    label: 'Show Hidden Files',
    description: 'Show files starting with . in file browser',
    type: 'boolean',
  },
  [SETTINGS_KEYS.DEFAULT_CONTENT_TYPE]: {
    label: 'Default Content Type',
    description: 'MIME type for new files',
    type: 'string',
  },
};

/**
 * Get a setting value from the store
 */
export function getSetting<K extends SettingsKey>(
  store: Store,
  key: K
): SettingsSchema[K] {
  const value = store.getValue(key);
  if (value === undefined) {
    return SETTINGS_DEFAULTS[key];
  }
  return value as SettingsSchema[K];
}

/**
 * Set a setting value in the store
 */
export function setSetting<K extends SettingsKey>(
  store: Store,
  key: K,
  value: SettingsSchema[K]
): void {
  if (value === undefined || value === null) {
    store.delValue(key);
  } else {
    store.setValue(key, value as string | number | boolean);
  }
}

/**
 * Get all settings as an object
 */
export function getAllSettings(store: Store): Partial<SettingsSchema> {
  const settings: Partial<SettingsSchema> = {};
  for (const key of Object.values(SETTINGS_KEYS)) {
    const value = store.getValue(key);
    if (value !== undefined) {
      settings[key] = value as SettingsSchema[typeof key];
    }
  }
  return settings;
}

/**
 * Reset all settings to defaults
 */
export function resetAllSettings(store: Store): void {
  for (const key of Object.values(SETTINGS_KEYS)) {
    store.delValue(key);
  }
}

/**
 * Reset a single setting to its default value
 */
export function resetSetting(store: Store, key: SettingsKey): void {
  store.delValue(key);
}

/**
 * Validate and parse a setting value from string input
 */
export function parseSettingValue(
  key: SettingsKey,
  value: string
): string | number | boolean | null {
  const meta = SETTINGS_META[key];

  switch (meta.type) {
    case 'number': {
      const num = parseInt(value, 10);
      if (isNaN(num)) return null;
      return num;
    }
    case 'boolean': {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off') {
        return false;
      }
      return null;
    }
    case 'enum': {
      if (meta.options?.includes(value)) {
        return value;
      }
      return null;
    }
    case 'string':
    default:
      return value;
  }
}

/**
 * Format a setting value for display
 */
export function formatSettingValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '(not set)';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

/**
 * Check if a key is a valid settings key
 */
export function isValidSettingsKey(key: string): key is SettingsKey {
  return Object.values(SETTINGS_KEYS).includes(key as SettingsKey);
}

/**
 * Get list of all settings keys
 */
export function getSettingsKeys(): SettingsKey[] {
  return Object.values(SETTINGS_KEYS);
}
