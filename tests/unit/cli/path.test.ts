import { describe, it, expect } from 'vitest';
import { resolvePath, validateName } from '../../../src/cli/path';

const BASE_URL = 'https://myapp.com/pod/';

describe('cli/path resolvePath', () => {
  it('returns current URL for empty or "." input', () => {
    const cur = `${BASE_URL}docs/`;
    expect(resolvePath(cur, '', BASE_URL)).toEqual({ valid: true, url: cur, isContainer: true });
    expect(resolvePath(cur, '.', BASE_URL)).toEqual({ valid: true, url: cur, isContainer: true });
  });

  it('resolves absolute paths from "/" under baseUrl', () => {
    const cur = `${BASE_URL}docs/`;
    const r = resolvePath(cur, '/images/logo.png', BASE_URL);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.url).toBe(`${BASE_URL}images/logo.png`);
      expect(r.isContainer).toBe(false);
    }
  });

  it('prevents escaping above baseUrl via ".."', () => {
    const cur = BASE_URL;
    const r = resolvePath(cur, '..', BASE_URL);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.url).toBe(BASE_URL);
      expect(r.isContainer).toBe(true);
    }
  });

  it('normalizes and encodes names', () => {
    const cur = BASE_URL;
    const r = resolvePath(cur, 'hello world.txt', BASE_URL);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.url).toBe(`${BASE_URL}hello%20world.txt`);
    }
  });

  it('rejects single segment names containing "/" via validateName', () => {
    const r = validateName('bad/name');
    expect(r?.valid).toBe(false);
    expect(r?.code).toBe('INVALID_PATH');
  });

  it('allows multi-segment paths in resolvePath', () => {
    const cur = BASE_URL;
    const r = resolvePath(cur, 'bad/name', BASE_URL);
    expect(r.valid).toBe(true);
  });
});

