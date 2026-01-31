import type { Command } from './types';
import {
  helpCommand,
  clearCommand,
  pwdCommand,
  cdCommand,
  lsCommand,
  catCommand,
  touchCommand,
  mkdirCommand,
  rmCommand,
  exportCommand,
  importCommand,
  personaCommand,
  contactCommand,
  groupCommand,
  fileCommand,
  configCommand,
  typeindexCommand,
  exitCommand,
  scriptCommand,
} from './commands';

/**
 * Command registry - all available commands
 */
export const commands: Record<string, Command> = {
  help: helpCommand,
  clear: clearCommand,
  pwd: pwdCommand,
  cd: cdCommand,
  ls: lsCommand,
  cat: catCommand,
  touch: touchCommand,
  mkdir: mkdirCommand,
  rm: rmCommand,
  export: exportCommand,
  import: importCommand,
  persona: personaCommand,
  contact: contactCommand,
  group: groupCommand,
  file: fileCommand,
  config: configCommand,
  typeindex: typeindexCommand,
  exit: exitCommand,
  script: scriptCommand,
};
