import React from 'react';
import { Box, Text } from 'ink';
import type { Command } from '../types';
import { parseCliArgs, getOptionBoolean } from '../parse-args';
import {
  copyStoreToClipboard,
  downloadStoreAsJson,
  exportStoreAsJson,
} from '../../utils/storeExport';

const isNode =
  typeof globalThis.process !== 'undefined' && Boolean(globalThis.process.versions?.node);

/**
 * export - Export store data (clipboard/file in browser; file or output in Node)
 */
export const exportCommand: Command = {
  name: 'export',
  description: 'Export store data to clipboard or file',
  usage: 'export [--download] [--pretty]',
  execute: async (args, context) => {
    const { store, addOutput } = context;
    const { options } = parseCliArgs(args);
    const download = getOptionBoolean(options, 'download') || getOptionBoolean(options, 'd');
    const pretty = getOptionBoolean(options, 'pretty') ?? true;

    const json = exportStoreAsJson(store, { pretty });

    if (isNode) {
      if (download) {
        const { writeFileSync } = await import('fs');
        const { join } = await import('path');
        const filename = `tb-solid-pod-export-${new Date().toISOString().split('T')[0]}.json`;
        const filepath = join(process.cwd(), filename);
        writeFileSync(filepath, json, 'utf-8');
        addOutput(
          <Text color="green">Exported to {filepath}</Text>,
          'success'
        );
      } else {
        addOutput(
          <Box flexDirection="column">
            <Text color="green">Store data:</Text>
            <Text>{json}</Text>
          </Box>,
          'output'
        );
      }
      return;
    }

    // Browser
    if (download) {
      downloadStoreAsJson(store);
      addOutput(
        <Text color="green">Download started: tb-solid-pod-export.json</Text>,
        'success'
      );
      return;
    }

    const success = await copyStoreToClipboard(store);
    if (success) {
      addOutput(
        <Text color="green">Store data copied to clipboard</Text>,
        'success'
      );
    } else {
      addOutput(
        <Box flexDirection="column">
          <Text color="red">Failed to copy to clipboard. JSON data:</Text>
          <Text>{json}</Text>
        </Box>,
        'error'
      );
    }
  },
};

/**
 * import - Import store data
 */
export const importCommand: Command = {
  name: 'import',
  description: 'Import store data (use the Import button in the GUI)',
  usage: 'import',
  execute: (_args, context) => {
    const { addOutput } = context;
    addOutput(
      <Box flexDirection="column">
        <Text color="yellow">The import command requires file system access.</Text>
        <Text>Please use the "Import" button in the toolbar to select a JSON file.</Text>
      </Box>
    );
  },
};
