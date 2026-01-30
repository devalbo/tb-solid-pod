import type { Command, CliContext } from '../types';
import { parseCliArgs, getOptionBoolean } from '../parse-args';
import {
  getAllTypeRegistrations,
  getTypeRegistrationsByType,
  registerType,
  unregisterType,
  formatRegistration,
  getCommonTypeNames,
} from '../../utils/typeIndex';
import { resolveClassIri, type TypeIndexType } from '../../schemas/typeIndex';

/**
 * typeindex list - List all type registrations
 */
const typeindexListExecute = (_args: string[], context: CliContext) => {
  const { store, addOutput } = context;
  const registrations = getAllTypeRegistrations(store);

  if (registrations.length === 0) {
    addOutput(
      <span style={{ color: '#888' }}>
        No type registrations. Use "typeindex register &lt;type&gt; &lt;location&gt; [--public]" to add one.
      </span>
    );
    return;
  }

  addOutput(
    <div>
      <div style={{ marginBottom: 8, color: '#4ecdc4' }}>
        Type registrations ({registrations.length}):
      </div>
      {registrations.map((reg, i) => (
        <div key={i} style={{ marginBottom: 8, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          {formatRegistration(reg)}
        </div>
      ))}
    </div>
  );
};

/**
 * typeindex show - Show public or private type index
 */
const typeindexShowExecute = (args: string[], context: CliContext) => {
  const { store, addOutput } = context;
  const indexArg = args[0]?.toLowerCase();

  if (!indexArg || (indexArg !== 'public' && indexArg !== 'private')) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Usage: typeindex show &lt;public|private&gt;
      </span>,
      'error'
    );
    return;
  }

  const indexType: TypeIndexType = indexArg as TypeIndexType;
  const registrations = getTypeRegistrationsByType(store, indexType);

  addOutput(
    <div>
      <div style={{ marginBottom: 8, color: '#4ecdc4', textTransform: 'capitalize' }}>
        {indexType} type index
      </div>
      {registrations.length === 0 ? (
        <span style={{ color: '#888' }}>No registrations in this index.</span>
      ) : (
        registrations.map((reg, i) => (
          <div key={i} style={{ marginBottom: 8, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {formatRegistration(reg)}
          </div>
        ))
      )}
    </div>
  );
};

/**
 * typeindex register - Register a type with a location
 * typeindex register <type> <location> [--public]
 * Location: container URL (ends with /) → instanceContainer; otherwise → instance
 */
const typeindexRegisterExecute = (args: string[], context: CliContext) => {
  const { store, addOutput, baseUrl } = context;
  const { positional, options } = parseCliArgs(args);
  const typeArg = positional[0];
  const locationArg = positional[1];
  const isPublic = getOptionBoolean(options, 'public');

  if (!typeArg || !locationArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Usage: typeindex register &lt;type&gt; &lt;location&gt; [--public]{'\n'}
        Example: typeindex register vcard:Individual {baseUrl}contacts/ [--public]
      </span>,
      'error'
    );
    return;
  }

  let location = locationArg;
  if (!location.startsWith('http')) {
    location = location.startsWith('/') ? baseUrl + location.slice(1) : baseUrl + location;
  }

  const indexType: TypeIndexType = isPublic ? 'public' : 'private';
  const forClass = resolveClassIri(typeArg);

  if (!forClass.startsWith('http')) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Unknown type: {typeArg}. Use a full IRI or one of: {getCommonTypeNames().slice(0, 8).join(', ')}...
      </span>,
      'error'
    );
    return;
  }

  const isContainer = location.endsWith('/');
  if (isContainer) {
    registerType(store, { forClass, instanceContainer: location, indexType });
    addOutput(
      <span style={{ color: '#2ecc71' }}>
        Registered {typeArg} → container {location} ({indexType} index)
      </span>,
      'success'
    );
  } else {
    registerType(store, { forClass, instance: location, indexType });
    addOutput(
      <span style={{ color: '#2ecc71' }}>
        Registered {typeArg} → instance {location} ({indexType} index)
      </span>,
      'success'
    );
  }
};

/**
 * typeindex unregister - Remove a type registration
 * typeindex unregister <type> [--public|--private]
 */
const typeindexUnregisterExecute = (args: string[], context: CliContext) => {
  const { store, addOutput } = context;
  const { positional, options } = parseCliArgs(args);
  const typeArg = positional[0];
  const publicOpt = getOptionBoolean(options, 'public');
  const privateOpt = getOptionBoolean(options, 'private');

  if (!typeArg) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Usage: typeindex unregister &lt;type&gt; [--public] [--private]{'\n'}
        If neither --public nor --private, removes from both indexes.
      </span>,
      'error'
    );
    return;
  }

  const forClass = resolveClassIri(typeArg);
  if (!forClass.startsWith('http')) {
    addOutput(
      <span style={{ color: '#ff6b6b' }}>
        Unknown type: {typeArg}. Use a full IRI or one of: {getCommonTypeNames().slice(0, 8).join(', ')}...
      </span>,
      'error'
    );
    return;
  }

  let indexType: TypeIndexType | undefined;
  if (publicOpt && !privateOpt) indexType = 'public';
  if (privateOpt && !publicOpt) indexType = 'private';

  const removed = unregisterType(store, forClass, indexType);
  if (removed) {
    addOutput(
      <span style={{ color: '#2ecc71' }}>
        Unregistered {typeArg}{indexType ? ` from ${indexType} index` : ' from all indexes'}
      </span>,
      'success'
    );
  } else {
    addOutput(
      <span style={{ color: '#888' }}>
        No registration found for {typeArg}
      </span>
    );
  }
};

/**
 * typeindex - Main command with subcommands
 */
export const typeindexCommand: Command = {
  name: 'typeindex',
  description: 'Manage Solid type indexes (public and private)',
  usage: 'typeindex <list|show|register|unregister> [args]',
  execute: (args, context) => {
    const { addOutput } = context;
    const subcommand = args[0];

    if (!subcommand) {
      addOutput(
        <div>
          <div style={{ marginBottom: 8 }}>Usage: typeindex &lt;subcommand&gt;</div>
          <div style={{ color: '#888' }}>
            <div>Subcommands:</div>
            <div style={{ marginLeft: 16 }}>list                      - List all type registrations</div>
            <div style={{ marginLeft: 16 }}>show &lt;public|private&gt;       - Show specific type index</div>
            <div style={{ marginLeft: 16 }}>register &lt;type&gt; &lt;location&gt; [--public] - Register type</div>
            <div style={{ marginLeft: 16 }}>unregister &lt;type&gt; [--public] [--private] - Remove registration</div>
          </div>
        </div>
      );
      return;
    }

    const subArgs = args.slice(1);

    switch (subcommand) {
      case 'list':
        return typeindexListExecute(subArgs, context);
      case 'show':
        return typeindexShowExecute(subArgs, context);
      case 'register':
        return typeindexRegisterExecute(subArgs, context);
      case 'unregister':
        return typeindexUnregisterExecute(subArgs, context);
      default:
        addOutput(
          <span style={{ color: '#ff6b6b' }}>
            Unknown subcommand: {subcommand}. Use "typeindex" for help.
          </span>,
          'error'
        );
    }
  },
};
