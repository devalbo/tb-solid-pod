/**
 * Store Export/Import Utilities
 *
 * Provides functions to export TinyBase store data to JSON,
 * copy to clipboard, download as file, and import from JSON.
 */

import type { Store } from 'tinybase';

/**
 * Export format includes tables, values, and metadata
 */
export interface StoreExport {
  version: 1;
  exportedAt: string;
  tables: Record<string, Record<string, Record<string, unknown>>>;
  values: Record<string, unknown>;
}

/**
 * Export the entire store as a JSON object
 */
export function exportStore(store: Store): StoreExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: store.getTables() as Record<string, Record<string, Record<string, unknown>>>,
    values: store.getValues() as Record<string, unknown>,
  };
}

/**
 * Export store as a formatted JSON string
 */
export function exportStoreAsJson(store: Store, pretty = true): string {
  const data = exportStore(store);
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Copy store data to clipboard
 * Returns true if successful, false otherwise
 */
export async function copyStoreToClipboard(store: Store): Promise<boolean> {
  try {
    const json = exportStoreAsJson(store);
    await navigator.clipboard.writeText(json);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    // Fallback for older browsers or when clipboard API fails
    try {
      const json = exportStoreAsJson(store);
      const textarea = document.createElement('textarea');
      textarea.value = json;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (fallbackErr) {
      console.error('Fallback copy also failed:', fallbackErr);
      return false;
    }
  }
}

/**
 * Download store data as a JSON file
 */
export function downloadStoreAsJson(store: Store, filename?: string): void {
  const json = exportStoreAsJson(store);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const defaultFilename = `pod-export-${new Date().toISOString().split('T')[0]}.json`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import data into store from a JSON string
 * Optionally merge with existing data or replace entirely
 */
export function importStoreFromJson(
  store: Store,
  json: string,
  options: { merge?: boolean } = {}
): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(json) as StoreExport;

    // Validate format
    if (!data.version || !data.tables) {
      return { success: false, error: 'Invalid export format' };
    }

    if (!options.merge) {
      // Clear existing data
      store.delTables();
      store.delValues();
    }

    // Import tables
    store.setTables(data.tables);

    // Import values if present
    if (data.values && Object.keys(data.values).length > 0) {
      store.setValues(data.values);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Read a file and return its contents as a string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
