import { useCallback, useState } from 'react';
import type { BaseMapMode } from '../types/mapMode';

function readBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

function writeBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    return;
  }
}

export function usePersistentBoolean(key: string, fallback: boolean): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => readBoolean(key, fallback));

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      writeBoolean(key, next);
    },
    [key],
  );

  return [value, update];
}

function readBaseMapMode(key: string): BaseMapMode {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === 'aus' ? 'aus' : 'score';
  } catch {
    return 'score';
  }
}

function writeBaseMapMode(key: string, value: BaseMapMode): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function usePersistentBaseMapMode(key: string): [BaseMapMode, (next: BaseMapMode) => void] {
  const [value, setValue] = useState<BaseMapMode>(() => readBaseMapMode(key));

  const update = useCallback(
    (next: BaseMapMode) => {
      setValue(next);
      writeBaseMapMode(key, next);
    },
    [key],
  );

  return [value, update];
}
