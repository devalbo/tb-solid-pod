import React from 'react';
import type { Command } from '../types';
import { parseCliArgs, getOptionBoolean } from '../parse-args';
import {
  copyStoreToClipboard,
  downloadStoreAsJson,
  exportStoreAsJson,
} from '../../utils/storeExport';

/**
 * export - Export store data
 */
export const exportCommand: Command = {
  name: 'export',
  description: 'Export store data to clipboard or file',
  usage: 'export [--download] [--pretty]',
  execute: async (args, context) => {
    const { store, addOutput } = context;
    const { options } = parseCliArgs(args);
    const download = getOptionBoolean(options, 'download') || getOptionBoolean(options, 'd');
    const pretty = getOptionBoolean(options, 'pretty') || getOptionBoolean(options, 'p');

    if (download) {
      downloadStoreAsJson(store);
      addOutput(
        <span style={{ color: '#2ecc71' }}>Download started: tb-solid-pod-export.json</span>,
        'success'
      );
      return;
    }

    // Default: copy to clipboard
    const success = await copyStoreToClipboard(store);
    if (success) {
      addOutput(
        <span style={{ color: '#2ecc71' }}>Store data copied to clipboard</span>,
        'success'
      );
    } else {
      // Fallback: show the JSON
      const json = exportStoreAsJson(store, pretty);
      addOutput(
        <div>
          <div style={{ color: '#ff6b6b', marginBottom: 4 }}>
            Failed to copy to clipboard. JSON data:
          </div>
          <pre style={{ margin: 0, maxHeight: 200, overflow: 'auto', fontSize: 11 }}>
            {json}
          </pre>
        </div>,
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
      <div>
        <div style={{ color: '#f9ca24' }}>
          The import command requires file system access.
        </div>
        <div style={{ marginTop: 4 }}>
          Please use the <strong>"Import"</strong> button in the toolbar to select a JSON file.
        </div>
      </div>
    );
  },
};
