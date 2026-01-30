import { useState, useCallback, useRef } from 'react';

interface UseCliInputOptions {
  commandNames: string[];
  maxHistory?: number;
}

interface UseCliInputReturn {
  input: string;
  setInput: (value: string) => void;
  history: string[];
  handleHistoryUp: () => void;
  handleHistoryDown: () => void;
  handleTab: () => void;
  addToHistory: (command: string) => void;
  clearInput: () => void;
}

/**
 * Hook for CLI input handling with history and tab completion
 */
export const useCliInput = ({
  commandNames,
  maxHistory = 100,
}: UseCliInputOptions): UseCliInputReturn => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const savedInput = useRef('');

  const addToHistory = useCallback(
    (command: string) => {
      const trimmed = command.trim();
      if (!trimmed) return;

      setHistory((prev) => {
        // Don't add duplicates of the last command
        if (prev[prev.length - 1] === trimmed) return prev;
        const newHistory = [...prev, trimmed];
        return newHistory.slice(-maxHistory);
      });
      setHistoryIndex(-1);
      savedInput.current = '';
    },
    [maxHistory]
  );

  const handleHistoryUp = useCallback(() => {
    if (history.length === 0) return;

    if (historyIndex === -1) {
      // Starting to navigate history, save current input
      savedInput.current = input;
      setHistoryIndex(history.length - 1);
      setInput(history[history.length - 1]);
    } else if (historyIndex > 0) {
      // Move up in history
      setHistoryIndex((i) => i - 1);
      setInput(history[historyIndex - 1]);
    }
  }, [history, historyIndex, input]);

  const handleHistoryDown = useCallback(() => {
    if (historyIndex === -1) return;

    if (historyIndex < history.length - 1) {
      // Move down in history
      setHistoryIndex((i) => i + 1);
      setInput(history[historyIndex + 1]);
    } else {
      // Back to current input
      setHistoryIndex(-1);
      setInput(savedInput.current);
    }
  }, [history, historyIndex]);

  const handleTab = useCallback(() => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || trimmed.includes(' ')) return;

    // Find matching commands
    const matches = commandNames.filter((name) =>
      name.toLowerCase().startsWith(trimmed)
    );

    if (matches.length === 1) {
      // Single match - complete it
      setInput(matches[0] + ' ');
    }
    // Multiple matches or no matches - do nothing for now
    // Could show suggestions in the future
  }, [input, commandNames]);

  const clearInput = useCallback(() => {
    setInput('');
    setHistoryIndex(-1);
  }, []);

  return {
    input,
    setInput,
    history,
    handleHistoryUp,
    handleHistoryDown,
    handleTab,
    addToHistory,
    clearInput,
  };
};
