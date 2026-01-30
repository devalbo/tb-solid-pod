#!/usr/bin/env node
/**
 * Emit static JSON Schema files from our Zod types (source of truth).
 * Run: npm run generate:schemas
 * Output: schema/*.json (package) and public/schema/*.json (demo site)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as schemas from '../src/schemas/json-schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDirs = [
  join(root, 'schema'),
  join(root, 'public', 'schema'),
];

const entries: Array<[string, Record<string, unknown> | undefined]> = [
  ['iri', schemas.iriJsonSchema],
  ['node-ref', schemas.nodeRefJsonSchema],
  ['typed-literal', schemas.typedLiteralJsonSchema],
  ['json-ld-base', schemas.jsonLdBaseJsonSchema],
  ['persona-input', schemas.personaInputJsonSchema],
  ['persona', schemas.personaJsonSchema],
  ['contact', schemas.contactJsonSchema],
  ['contact-input', schemas.contactInputJsonSchema],
  ['address-book', schemas.addressBookJsonSchema],
  ['agent-contact', schemas.agentContactJsonSchema],
  ['group', schemas.groupJsonSchema],
  ['group-input', schemas.groupInputJsonSchema],
  ['membership', schemas.membershipJsonSchema],
  ['membership-input', schemas.membershipInputJsonSchema],
  ['file-metadata', schemas.fileMetadataJsonSchema],
  ['file-input', schemas.fileInputJsonSchema],
  ['container', schemas.containerJsonSchema],
  ['container-input', schemas.containerInputJsonSchema],
  ['preferences', schemas.preferencesJsonSchema],
  ['type-registration', schemas.typeRegistrationJsonSchema],
  ['type-index', schemas.typeIndexJsonSchema],
  ['type-registration-input', schemas.typeRegistrationInputJsonSchema],
  ['type-index-row', schemas.typeIndexRowJsonSchema],
];

for (const dir of outDirs) {
  mkdirSync(dir, { recursive: true });
}

let written = 0;
for (const [name, schema] of entries) {
  if (schema && typeof schema === 'object') {
    const json = JSON.stringify(schema, null, 2);
    for (const outDir of outDirs) {
      writeFileSync(join(outDir, `${name}.json`), json, 'utf8');
    }
    written++;
  }
}

console.log(`Wrote ${written} JSON Schema(s) to schema/ and public/schema/`);
