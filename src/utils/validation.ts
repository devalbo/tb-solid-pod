/**
 * Schema Validation Utilities
 *
 * Provides strict validation for all data types stored in TinyBase.
 * Ensures data integrity on import, export, and writes.
 */

import { z } from 'zod';
import type { Store } from 'tinybase';
import { STORE_TABLES } from '../storeLayout';
import { PersonaSchema, safeParsePersona } from '../schemas/persona';
import { ContactSchema, safeParseContact } from '../schemas/contact';
import { GroupSchema, safeParseGroup } from '../schemas/group';
import { TypeIndexRowSchema } from '../schemas/typeIndex';

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationError {
  table: string;
  rowId: string;
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface TableValidationResult {
  table: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
}

// ============================================================================
// Schema Registry
// ============================================================================

/**
 * Map of table names to their Zod schemas
 */
const TABLE_SCHEMAS: Record<string, z.ZodType<unknown>> = {
  [STORE_TABLES.PERSONAS]: PersonaSchema,
  [STORE_TABLES.CONTACTS]: ContactSchema,
  [STORE_TABLES.GROUPS]: GroupSchema,
  [STORE_TABLES.TYPE_INDEXES]: TypeIndexRowSchema,
  // resources table uses a simpler validation (not JSON-LD)
};

/**
 * Get the schema for a table
 */
export function getTableSchema(tableName: string): z.ZodType<unknown> | null {
  return TABLE_SCHEMAS[tableName] || null;
}

// ============================================================================
// Row Validation
// ============================================================================

/**
 * Validate a single row against its table's schema
 */
export function validateRow(
  tableName: string,
  rowId: string,
  data: unknown
): { valid: boolean; errors: ValidationError[] } {
  const schema = TABLE_SCHEMAS[tableName];

  if (!schema) {
    // Tables without schemas (like resources) are considered valid
    return { valid: true, errors: [] };
  }

  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    table: tableName,
    rowId,
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return { valid: false, errors };
}

/**
 * Validate a persona row
 */
export function validatePersona(
  rowId: string,
  data: unknown
): { valid: boolean; errors: ValidationError[] } {
  const result = safeParsePersona(data);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    table: STORE_TABLES.PERSONAS,
    rowId,
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return { valid: false, errors };
}

/**
 * Validate a contact row
 */
export function validateContact(
  rowId: string,
  data: unknown
): { valid: boolean; errors: ValidationError[] } {
  const result = safeParseContact(data);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    table: STORE_TABLES.CONTACTS,
    rowId,
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return { valid: false, errors };
}

/**
 * Validate a group row
 */
export function validateGroup(
  rowId: string,
  data: unknown
): { valid: boolean; errors: ValidationError[] } {
  const result = safeParseGroup(data);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    table: STORE_TABLES.GROUPS,
    rowId,
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return { valid: false, errors };
}

/**
 * Validate a type index row
 */
export function validateTypeIndexRow(
  rowId: string,
  data: unknown
): { valid: boolean; errors: ValidationError[] } {
  const result = TypeIndexRowSchema.safeParse(data);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    table: STORE_TABLES.TYPE_INDEXES,
    rowId,
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return { valid: false, errors };
}

// ============================================================================
// Table Validation
// ============================================================================

/**
 * Validate all rows in a table
 */
export function validateTable(
  tableName: string,
  tableData: Record<string, Record<string, unknown>>
): TableValidationResult {
  const errors: ValidationError[] = [];
  let validRows = 0;
  let invalidRows = 0;

  for (const [rowId, rowData] of Object.entries(tableData)) {
    const result = validateRow(tableName, rowId, rowData);
    if (result.valid) {
      validRows++;
    } else {
      invalidRows++;
      errors.push(...result.errors);
    }
  }

  return {
    table: tableName,
    totalRows: validRows + invalidRows,
    validRows,
    invalidRows,
    errors,
  };
}

// ============================================================================
// Store Validation
// ============================================================================

/**
 * Validate entire store data
 */
export function validateStoreData(
  tables: Record<string, Record<string, Record<string, unknown>>>
): ValidationResult {
  const allErrors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const [tableName, tableData] of Object.entries(tables)) {
    // Skip tables without schemas (they get a warning instead)
    if (!TABLE_SCHEMAS[tableName] && tableName !== STORE_TABLES.RESOURCES) {
      warnings.push({
        table: tableName,
        rowId: '*',
        message: `Unknown table "${tableName}" - no schema defined`,
      });
      continue;
    }

    const result = validateTable(tableName, tableData);
    allErrors.push(...result.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings,
  };
}

/**
 * Validate a TinyBase store
 */
export function validateStore(store: Store): ValidationResult {
  const tables = store.getTables() as Record<string, Record<string, Record<string, unknown>>>;
  return validateStoreData(tables);
}

// ============================================================================
// Import Validation
// ============================================================================

/**
 * Validate import data before applying to store
 * Returns validated data (with invalid rows removed) and errors
 */
export function validateImportData(
  tables: Record<string, Record<string, Record<string, unknown>>>,
  options: { strict?: boolean } = {}
): {
  validTables: Record<string, Record<string, Record<string, unknown>>>;
  errors: ValidationError[];
  skippedRows: number;
} {
  const validTables: Record<string, Record<string, Record<string, unknown>>> = {};
  const errors: ValidationError[] = [];
  let skippedRows = 0;

  for (const [tableName, tableData] of Object.entries(tables)) {
    validTables[tableName] = {};

    for (const [rowId, rowData] of Object.entries(tableData)) {
      const result = validateRow(tableName, rowId, rowData);

      if (result.valid) {
        validTables[tableName][rowId] = rowData;
      } else {
        errors.push(...result.errors);
        skippedRows++;

        // In non-strict mode, still include invalid rows but log errors
        if (!options.strict) {
          validTables[tableName][rowId] = rowData;
        }
      }
    }
  }

  return { validTables, errors, skippedRows };
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Format validation errors as a human-readable string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return 'No errors';

  const grouped = new Map<string, ValidationError[]>();

  for (const error of errors) {
    const key = `${error.table}/${error.rowId}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(error);
  }

  const lines: string[] = [];
  for (const [key, errs] of grouped) {
    lines.push(`${key}:`);
    for (const err of errs) {
      const fieldPart = err.field ? ` (${err.field})` : '';
      lines.push(`  - ${err.message}${fieldPart}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get a summary of validation results
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return 'All data is valid';
  }

  const parts: string[] = [];

  if (!result.valid) {
    parts.push(`${result.errors.length} validation error(s)`);
  }

  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`);
  }

  return parts.join(', ');
}
