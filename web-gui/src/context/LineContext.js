import { createContext, useContext } from 'react';

export const LineContext = createContext(null);

export function useLine() {
  const ctx = useContext(LineContext);
  if (!ctx) {
    throw new Error('useLine must be used within a LineProvider');
  }
  return ctx;
}
