import { Box, Text } from 'ink';
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

const typeindexListExecute = (_args: string[], context: CliContext) => {
  const { store, addOutput } = context;
  const registrations = getAllTypeRegistrations(store);

  if (registrations.length === 0) {
    addOutput(
      <Text dimColor>
        No type registrations. Use "typeindex register &lt;type&gt; &lt;location&gt; [--public]" to add one.
      </Text>
    );
    return;
  }

  addOutput(
    <Box flexDirection="column">
      <Text color="cyan">Type registrations ({registrations.length}):</Text>
      {registrations.map((reg, i) => (
        <Text key={i}>{formatRegistration(reg)}</Text>
      ))}
    </Box>
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
      <Text color="red">Usage: typeindex show &lt;public|private&gt;</Text>,
      'error'
    );
    return;
  }

  const indexType: TypeIndexType = indexArg as TypeIndexType;
  const registrations = getTypeRegistrationsByType(store, indexType);

  addOutput(
    <Box flexDirection="column">
      <Text color="cyan">{indexType} type index</Text>
      {registrations.length === 0 ? (
        <Text dimColor>No registrations in this index.</Text>
      ) : (
        registrations.map((reg, i) => (
          <Text key={i}>{formatRegistration(reg)}</Text>
        ))
      )}
    </Box>
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
      <Text color="red">
        Usage: typeindex register &lt;type&gt; &lt;location&gt; [--public]{'\n'}
        Example: typeindex register vcard:Individual {baseUrl}contacts/ [--public]
      </Text>,
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
      <Text color="red">
        Unknown type: {typeArg}. Use a full IRI or one of: {getCommonTypeNames().slice(0, 8).join(', ')}...
      </Text>,
      'error'
    );
    return;
  }

  const isContainer = location.endsWith('/');
  if (isContainer) {
    registerType(store, { forClass, instanceContainer: location, indexType });
    addOutput(
      <Text color="green">
        Registered {typeArg} → container {location} ({indexType} index)
      </Text>,
      'success'
    );
  } else {
    registerType(store, { forClass, instance: location, indexType });
    addOutput(
      <Text color="green">
        Registered {typeArg} → instance {location} ({indexType} index)
      </Text>,
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
      <Text color="red">
        Usage: typeindex unregister &lt;type&gt; [--public] [--private]{'\n'}
        If neither --public nor --private, removes from both indexes.
      </Text>,
      'error'
    );
    return;
  }

  const forClass = resolveClassIri(typeArg);
  if (!forClass.startsWith('http')) {
    addOutput(
      <Text color="red">
        Unknown type: {typeArg}. Use a full IRI or one of: {getCommonTypeNames().slice(0, 8).join(', ')}...
      </Text>,
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
      <Text color="green">
        Unregistered {typeArg}{indexType ? ` from ${indexType} index` : ' from all indexes'}
      </Text>,
      'success'
    );
  } else {
    addOutput(<Text dimColor>No registration found for {typeArg}</Text>);
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
        <Box flexDirection="column">
          <Text>Usage: typeindex &lt;subcommand&gt;</Text>
          <Text dimColor>
            Subcommands: list, show &lt;public|private&gt;, register &lt;type&gt; &lt;location&gt; [--public], unregister &lt;type&gt; [--public] [--private]
          </Text>
        </Box>
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
          <Text color="red">Unknown subcommand: {subcommand}. Use "typeindex" for help.</Text>,
          'error'
        );
    }
  },
};
