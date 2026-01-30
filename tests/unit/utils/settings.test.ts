import { describe, it, expect, beforeEach } from 'vitest'
import { createStore, Store } from 'tinybase'
import {
  SETTINGS_KEYS,
  SETTINGS_DEFAULTS,
  SETTINGS_META,
  getSetting,
  setSetting,
  getAllSettings,
  resetAllSettings,
  resetSetting,
  parseSettingValue,
  formatSettingValue,
  isValidSettingsKey,
  getSettingsKeys,
} from '../../../src/utils/settings'

describe('Settings Utilities', () => {
  let store: Store

  beforeEach(() => {
    store = createStore()
  })

  describe('SETTINGS_KEYS', () => {
    it('has all expected keys', () => {
      expect(SETTINGS_KEYS.DEFAULT_PERSONA_ID).toBe('defaultPersonaId')
      expect(SETTINGS_KEYS.THEME).toBe('theme')
      expect(SETTINGS_KEYS.CLI_HISTORY_SIZE).toBe('cliHistorySize')
      expect(SETTINGS_KEYS.AUTO_SAVE_INTERVAL).toBe('autoSaveInterval')
      expect(SETTINGS_KEYS.SHOW_HIDDEN_FILES).toBe('showHiddenFiles')
      expect(SETTINGS_KEYS.DEFAULT_CONTENT_TYPE).toBe('defaultContentType')
    })
  })

  describe('SETTINGS_DEFAULTS', () => {
    it('has default values for all keys', () => {
      expect(SETTINGS_DEFAULTS[SETTINGS_KEYS.THEME]).toBe('system')
      expect(SETTINGS_DEFAULTS[SETTINGS_KEYS.CLI_HISTORY_SIZE]).toBe(100)
      expect(SETTINGS_DEFAULTS[SETTINGS_KEYS.AUTO_SAVE_INTERVAL]).toBe(0)
      expect(SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_HIDDEN_FILES]).toBe(false)
      expect(SETTINGS_DEFAULTS[SETTINGS_KEYS.DEFAULT_CONTENT_TYPE]).toBe('text/plain')
    })
  })

  describe('SETTINGS_META', () => {
    it('has metadata for all keys', () => {
      for (const key of Object.values(SETTINGS_KEYS)) {
        expect(SETTINGS_META[key]).toBeDefined()
        expect(SETTINGS_META[key].label).toBeDefined()
        expect(SETTINGS_META[key].description).toBeDefined()
        expect(SETTINGS_META[key].type).toBeDefined()
      }
    })

    it('has correct types', () => {
      expect(SETTINGS_META[SETTINGS_KEYS.THEME].type).toBe('enum')
      expect(SETTINGS_META[SETTINGS_KEYS.THEME].options).toContain('dark')
      expect(SETTINGS_META[SETTINGS_KEYS.CLI_HISTORY_SIZE].type).toBe('number')
      expect(SETTINGS_META[SETTINGS_KEYS.SHOW_HIDDEN_FILES].type).toBe('boolean')
      expect(SETTINGS_META[SETTINGS_KEYS.DEFAULT_CONTENT_TYPE].type).toBe('string')
    })
  })

  describe('getSetting', () => {
    it('returns default when not set', () => {
      expect(getSetting(store, SETTINGS_KEYS.THEME)).toBe('system')
      expect(getSetting(store, SETTINGS_KEYS.CLI_HISTORY_SIZE)).toBe(100)
    })

    it('returns stored value when set', () => {
      store.setValue(SETTINGS_KEYS.THEME, 'dark')
      expect(getSetting(store, SETTINGS_KEYS.THEME)).toBe('dark')
    })
  })

  describe('setSetting', () => {
    it('sets a value in the store', () => {
      setSetting(store, SETTINGS_KEYS.THEME, 'dark')
      expect(store.getValue(SETTINGS_KEYS.THEME)).toBe('dark')
    })

    it('sets number values', () => {
      setSetting(store, SETTINGS_KEYS.CLI_HISTORY_SIZE, 50)
      expect(store.getValue(SETTINGS_KEYS.CLI_HISTORY_SIZE)).toBe(50)
    })

    it('sets boolean values', () => {
      setSetting(store, SETTINGS_KEYS.SHOW_HIDDEN_FILES, true)
      expect(store.getValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES)).toBe(true)
    })

    it('deletes value when set to undefined', () => {
      store.setValue(SETTINGS_KEYS.DEFAULT_PERSONA_ID, 'some-id')
      setSetting(store, SETTINGS_KEYS.DEFAULT_PERSONA_ID, undefined)
      expect(store.getValue(SETTINGS_KEYS.DEFAULT_PERSONA_ID)).toBeUndefined()
    })

    it('deletes value when set to null', () => {
      store.setValue(SETTINGS_KEYS.DEFAULT_PERSONA_ID, 'some-id')
      setSetting(store, SETTINGS_KEYS.DEFAULT_PERSONA_ID, null as unknown as undefined)
      expect(store.getValue(SETTINGS_KEYS.DEFAULT_PERSONA_ID)).toBeUndefined()
    })
  })

  describe('getAllSettings', () => {
    it('returns empty object when no settings set', () => {
      const settings = getAllSettings(store)
      expect(Object.keys(settings)).toHaveLength(0)
    })

    it('returns all set settings', () => {
      store.setValue(SETTINGS_KEYS.THEME, 'dark')
      store.setValue(SETTINGS_KEYS.CLI_HISTORY_SIZE, 50)

      const settings = getAllSettings(store)

      expect(settings[SETTINGS_KEYS.THEME]).toBe('dark')
      expect(settings[SETTINGS_KEYS.CLI_HISTORY_SIZE]).toBe(50)
    })

    it('does not include unset settings', () => {
      store.setValue(SETTINGS_KEYS.THEME, 'dark')

      const settings = getAllSettings(store)

      expect(settings[SETTINGS_KEYS.THEME]).toBe('dark')
      expect(SETTINGS_KEYS.CLI_HISTORY_SIZE in settings).toBe(false)
    })
  })

  describe('resetAllSettings', () => {
    it('removes all settings', () => {
      store.setValue(SETTINGS_KEYS.THEME, 'dark')
      store.setValue(SETTINGS_KEYS.CLI_HISTORY_SIZE, 50)

      resetAllSettings(store)

      expect(store.getValue(SETTINGS_KEYS.THEME)).toBeUndefined()
      expect(store.getValue(SETTINGS_KEYS.CLI_HISTORY_SIZE)).toBeUndefined()
    })
  })

  describe('resetSetting', () => {
    it('removes a single setting', () => {
      store.setValue(SETTINGS_KEYS.THEME, 'dark')
      store.setValue(SETTINGS_KEYS.CLI_HISTORY_SIZE, 50)

      resetSetting(store, SETTINGS_KEYS.THEME)

      expect(store.getValue(SETTINGS_KEYS.THEME)).toBeUndefined()
      expect(store.getValue(SETTINGS_KEYS.CLI_HISTORY_SIZE)).toBe(50)
    })
  })

  describe('parseSettingValue', () => {
    describe('number type', () => {
      it('parses valid numbers', () => {
        expect(parseSettingValue(SETTINGS_KEYS.CLI_HISTORY_SIZE, '100')).toBe(100)
        expect(parseSettingValue(SETTINGS_KEYS.CLI_HISTORY_SIZE, '0')).toBe(0)
        expect(parseSettingValue(SETTINGS_KEYS.CLI_HISTORY_SIZE, '-5')).toBe(-5)
      })

      it('returns null for invalid numbers', () => {
        expect(parseSettingValue(SETTINGS_KEYS.CLI_HISTORY_SIZE, 'abc')).toBeNull()
        expect(parseSettingValue(SETTINGS_KEYS.CLI_HISTORY_SIZE, '')).toBeNull()
      })
    })

    describe('boolean type', () => {
      it('parses true values', () => {
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, 'true')).toBe(true)
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, 'TRUE')).toBe(true)
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, '1')).toBe(true)
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, 'yes')).toBe(true)
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, 'on')).toBe(true)
      })

      it('parses false values', () => {
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, 'false')).toBe(false)
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, 'FALSE')).toBe(false)
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, '0')).toBe(false)
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, 'no')).toBe(false)
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, 'off')).toBe(false)
      })

      it('returns null for invalid boolean', () => {
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, 'maybe')).toBeNull()
        expect(parseSettingValue(SETTINGS_KEYS.SHOW_HIDDEN_FILES, '')).toBeNull()
      })
    })

    describe('enum type', () => {
      it('accepts valid enum values', () => {
        expect(parseSettingValue(SETTINGS_KEYS.THEME, 'light')).toBe('light')
        expect(parseSettingValue(SETTINGS_KEYS.THEME, 'dark')).toBe('dark')
        expect(parseSettingValue(SETTINGS_KEYS.THEME, 'system')).toBe('system')
      })

      it('returns null for invalid enum values', () => {
        expect(parseSettingValue(SETTINGS_KEYS.THEME, 'blue')).toBeNull()
        expect(parseSettingValue(SETTINGS_KEYS.THEME, '')).toBeNull()
      })
    })

    describe('string type', () => {
      it('returns any string', () => {
        expect(parseSettingValue(SETTINGS_KEYS.DEFAULT_CONTENT_TYPE, 'text/html')).toBe('text/html')
        expect(parseSettingValue(SETTINGS_KEYS.DEFAULT_CONTENT_TYPE, '')).toBe('')
      })
    })
  })

  describe('formatSettingValue', () => {
    it('formats undefined as "(not set)"', () => {
      expect(formatSettingValue(undefined)).toBe('(not set)')
    })

    it('formats null as "(not set)"', () => {
      expect(formatSettingValue(null)).toBe('(not set)')
    })

    it('formats booleans as strings', () => {
      expect(formatSettingValue(true)).toBe('true')
      expect(formatSettingValue(false)).toBe('false')
    })

    it('formats numbers as strings', () => {
      expect(formatSettingValue(100)).toBe('100')
      expect(formatSettingValue(0)).toBe('0')
    })

    it('returns strings as-is', () => {
      expect(formatSettingValue('dark')).toBe('dark')
    })
  })

  describe('isValidSettingsKey', () => {
    it('returns true for valid keys', () => {
      expect(isValidSettingsKey('theme')).toBe(true)
      expect(isValidSettingsKey('cliHistorySize')).toBe(true)
      expect(isValidSettingsKey('defaultPersonaId')).toBe(true)
    })

    it('returns false for invalid keys', () => {
      expect(isValidSettingsKey('invalidKey')).toBe(false)
      expect(isValidSettingsKey('')).toBe(false)
      expect(isValidSettingsKey('THEME')).toBe(false) // case sensitive
    })
  })

  describe('getSettingsKeys', () => {
    it('returns all settings keys', () => {
      const keys = getSettingsKeys()

      expect(keys).toContain('defaultPersonaId')
      expect(keys).toContain('theme')
      expect(keys).toContain('cliHistorySize')
      expect(keys).toContain('autoSaveInterval')
      expect(keys).toContain('showHiddenFiles')
      expect(keys).toContain('defaultContentType')
      expect(keys).toHaveLength(6)
    })
  })
})
