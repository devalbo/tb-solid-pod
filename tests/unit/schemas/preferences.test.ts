import { describe, it, expect } from 'vitest'
import { SOLID } from '@inrupt/vocab-solid-common'
import {
  PreferencesSchema,
  createPreferences,
  parsePreferences,
  safeParsePreferences,
} from '../../../src/schemas/preferences'

describe('PreferencesSchema', () => {
  it('validates minimal preferences', () => {
    const result = PreferencesSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates preferences with @id', () => {
    const result = PreferencesSchema.safeParse({
      '@id': 'https://pod.example.com/settings/prefs',
    })
    expect(result.success).toBe(true)
  })

  it('validates preferences with private type index', () => {
    const result = PreferencesSchema.safeParse({
      '@id': 'https://pod.example.com/settings/prefs',
      [SOLID.privateTypeIndex]: { '@id': 'https://pod.example.com/settings/privateTypeIndex' },
    })
    expect(result.success).toBe(true)
  })

  it('allows passthrough properties', () => {
    const result = PreferencesSchema.safeParse({
      '@id': 'https://pod.example.com/settings/prefs',
      customSetting: 'value',
      anotherSetting: 42,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customSetting).toBe('value')
      expect(result.data.anotherSetting).toBe(42)
    }
  })
})

describe('createPreferences', () => {
  it('creates minimal preferences', () => {
    const prefs = createPreferences('https://pod.example.com/settings/prefs')

    expect(prefs['@id']).toBe('https://pod.example.com/settings/prefs')
    expect(prefs['@context']).toBeDefined()
  })

  it('creates preferences with private type index', () => {
    const prefs = createPreferences('https://pod.example.com/settings/prefs', {
      privateTypeIndex: 'https://pod.example.com/settings/privateTypeIndex',
    })

    expect(prefs[SOLID.privateTypeIndex]).toEqual({
      '@id': 'https://pod.example.com/settings/privateTypeIndex',
    })
  })

  it('omits privateTypeIndex when not provided', () => {
    const prefs = createPreferences('https://pod.example.com/settings/prefs')

    expect(prefs[SOLID.privateTypeIndex]).toBeUndefined()
  })
})

describe('parsePreferences', () => {
  it('parses valid preferences', () => {
    const data = {
      '@id': 'https://pod.example.com/settings/prefs',
      [SOLID.privateTypeIndex]: { '@id': 'https://pod.example.com/settings/privateTypeIndex' },
    }

    const prefs = parsePreferences(data)
    expect(prefs['@id']).toBe('https://pod.example.com/settings/prefs')
  })

  it('parses minimal preferences', () => {
    const prefs = parsePreferences({})
    expect(prefs).toBeDefined()
  })

  it('parses preferences with custom properties', () => {
    const data = {
      '@id': 'https://pod.example.com/settings/prefs',
      theme: 'dark',
      language: 'en',
    }

    const prefs = parsePreferences(data)
    expect(prefs.theme).toBe('dark')
    expect(prefs.language).toBe('en')
  })
})

describe('safeParsePreferences', () => {
  it('returns success for valid data', () => {
    const result = safeParsePreferences({
      '@id': 'https://pod.example.com/settings/prefs',
    })
    expect(result.success).toBe(true)
  })

  it('returns success for empty object', () => {
    const result = safeParsePreferences({})
    expect(result.success).toBe(true)
  })

  it('preserves passthrough properties', () => {
    const result = safeParsePreferences({
      '@id': 'https://pod.example.com/settings/prefs',
      customProp: 'value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customProp).toBe('value')
    }
  })
})
