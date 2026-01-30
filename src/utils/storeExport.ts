/**
 * Store Export/Import Utilities
 *
 * Provides functions to export TinyBase store data to JSON,
 * copy to clipboard, download as file, and import from JSON.
 * All operations include schema validation.
 */

import type { Store } from 'tinybase';
import {
  validateStoreData,
  validateImportData,
  formatValidationErrors,
  getValidationSummary,
  type ValidationError,
} from './validation';

/**
 * Export format includes tables, values, and metadata
 */
export interface StoreExport {
  version: 1;
  exportedAt: string;
  tables: Record<string, Record<string, Record<string, unknown>>>;
  values: Record<string, unknown>;
  validation?: {
    valid: boolean;
    errorCount: number;
    warningCount: number;
  };
}

/**
 * Export result with validation info
 */
export interface ExportResult {
  data: StoreExport;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Import result with validation info
 */
export interface ImportResult {
  success: boolean;
  error?: string;
  validationErrors?: ValidationError[];
  skippedRows?: number;
  importedRows?: number;
}

/**
 * Export the entire store as a JSON object with validation
 */
export function exportStore(store: Store): ExportResult {
  const tables = store.getTables() as Record<string, Record<string, Record<string, unknown>>>;
  const values = store.getValues() as Record<string, unknown>;

  // Validate all data before export
  const validation = validateStoreData(tables);

  const data: StoreExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables,
    values,
    validation: {
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    },
  };

  return {
    data,
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

/**
 * Export store as a formatted JSON string
 * Throws if validation fails and strict mode is enabled
 */
export function exportStoreAsJson(
  store: Store,
  options: { pretty?: boolean; strict?: boolean } = {}
): string {
  const { pretty = true, strict = false } = options;
  const result = exportStore(store);

  if (strict && !result.valid) {
    throw new Error(
      `Export validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }

  return pretty
    ? JSON.stringify(result.data, null, 2)
    : JSON.stringify(result.data);
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
 * Validates all data against schemas before import
 *
 * Options:
 * - merge: If true, merge with existing data; if false, replace entirely
 * - strict: If true, reject import if any validation errors; if false, import valid rows only
 * - skipInvalid: If true (and not strict), skip invalid rows; if false, include them anyway
 */
export function importStoreFromJson(
  store: Store,
  json: string,
  options: { merge?: boolean; strict?: boolean; skipInvalid?: boolean } = {}
): ImportResult {
  const { merge = false, strict = true, skipInvalid = true } = options;

  try {
    const data = JSON.parse(json) as StoreExport;

    // Validate format
    if (!data.version || !data.tables) {
      return { success: false, error: 'Invalid export format: missing version or tables' };
    }

    if (data.version !== 1) {
      return { success: false, error: `Unsupported export version: ${data.version}` };
    }

    // Validate all data against schemas
    const { validTables, errors, skippedRows } = validateImportData(
      data.tables,
      { strict: skipInvalid }
    );

    // In strict mode, reject if any errors
    if (strict && errors.length > 0) {
      return {
        success: false,
        error: `Validation failed with ${errors.length} error(s):\n${formatValidationErrors(errors)}`,
        validationErrors: errors,
      };
    }

    // Clear existing data if not merging
    if (!merge) {
      store.delTables();
      store.delValues();
    }

    // Import validated tables
    const tablesToImport = skipInvalid ? validTables : data.tables;
    store.setTables(tablesToImport);

    // Count imported rows
    let importedRows = 0;
    for (const table of Object.values(tablesToImport)) {
      importedRows += Object.keys(table).length;
    }

    // Import values if present
    if (data.values && Object.keys(data.values).length > 0) {
      store.setValues(data.values);
    }

    // Return success with any warnings about skipped rows
    if (errors.length > 0) {
      return {
        success: true,
        validationErrors: errors,
        skippedRows,
        importedRows,
      };
    }

    return { success: true, importedRows };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error parsing JSON',
    };
  }
}

/**
 * Validate import data without actually importing
 */
export function validateImportJson(json: string): {
  valid: boolean;
  errors: ValidationError[];
  summary: string;
} {
  try {
    const data = JSON.parse(json) as StoreExport;

    if (!data.version || !data.tables) {
      return {
        valid: false,
        errors: [{ table: '', rowId: '', message: 'Invalid export format' }],
        summary: 'Invalid export format',
      };
    }

    const validation = validateStoreData(data.tables);

    return {
      valid: validation.valid,
      errors: validation.errors,
      summary: getValidationSummary(validation),
    };
  } catch (err) {
    return {
      valid: false,
      errors: [{ table: '', rowId: '', message: err instanceof Error ? err.message : 'Invalid JSON' }],
      summary: 'Failed to parse JSON',
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
