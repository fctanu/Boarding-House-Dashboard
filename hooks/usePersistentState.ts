
import { useState, useEffect, useCallback } from 'react';

export const usePersistentState = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage', error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  }, [key, state]);

  const setPersistentState = useCallback((value: T | ((val: T) => T)) => {
      setState(value);
  }, []);

  return [state, setPersistentState];
};
