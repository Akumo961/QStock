/**
 * useLocalStorage Hook
 * Type-safe local storage with React state synchronization
 */

import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import storage from '../services/Storage';

type SetValue<T> = Dispatch<SetStateAction<T>>;

/**
 * useLocalStorage Hook
 * Syncs state with localStorage
 */
export const useLocalStorage = <T,>(
  key: string,
  initialValue: T
): [T, SetValue<T>, () => void] => {
  // Get initial value from storage or use provided initial value
  const readValue = useCallback((): T => {
    try {
      const item = storage.get<T>(key);
      return item !== null ? item : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue: SetValue<T> = useCallback(
    (value) => {
      try {
        // Allow value to be a function for same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Save to state
        setStoredValue(valueToStore);

        // Save to local storage
        storage.set(key, valueToStore);
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from storage
  const removeValue = useCallback(() => {
    try {
      storage.remove(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `qr_inventory_${key}` && e.newValue) {
        try {
          const item = JSON.parse(e.newValue);
          setStoredValue(item.value);
        } catch (error) {
          console.warn(`Error parsing storage change for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
};

/**
 * useSessionStorage Hook
 * Similar to useLocalStorage but uses sessionStorage
 */
export const useSessionStorage = <T,>(
  key: string,
  initialValue: T
): [T, SetValue<T>, () => void] => {
  const readValue = useCallback((): T => {
    try {
      const item = storage.session.get<T>(key);
      return item !== null ? item : initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue: SetValue<T> = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        storage.session.set(key, valueToStore);
      } catch (error) {
        console.warn(`Error setting sessionStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      storage.session.remove(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

/**
 * usePreferences Hook
 * Manage user preferences
 */
export const usePreferences = <T extends Record<string, any>>() => {
  const [preferences, setPreferences] = useState<T>(() => {
    return storage.preferences.getAll() as T;
  });

  const setPreference = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    storage.preferences.set(key as string, value);
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }, []);

  const getPreference = useCallback(<K extends keyof T>(key: K): T[K] | undefined => {
    return preferences[key];
  }, [preferences]);

  const removePreference = useCallback(<K extends keyof T>(key: K) => {
    storage.preferences.remove(key as string);
    setPreferences((prev) => {
      const newPrefs = { ...prev };
      delete newPrefs[key];
      return newPrefs;
    });
  }, []);

  const clearPreferences = useCallback(() => {
    storage.preferences.clear();
    setPreferences({} as T);
  }, []);

  return {
    preferences,
    setPreference,
    getPreference,
    removePreference,
    clearPreferences,
  };
};

/**
 * useCache Hook
 * Cache data with TTL
 */
export const useCache = <T,>(key: string, ttl: number = 60 * 60 * 1000) => {
  const [cachedValue, setCachedValue] = useState<T | null>(() => {
    return storage.cache.get<T>(key);
  });

  const setCache = useCallback(
    (value: T) => {
      storage.cache.set(key, value, ttl);
      setCachedValue(value);
    },
    [key, ttl]
  );

  const clearCache = useCallback(() => {
    storage.remove(key);
    setCachedValue(null);
  }, [key]);

  const hasCache = useCallback(() => {
    return storage.cache.has(key);
  }, [key]);

  return {
    cachedValue,
    setCache,
    clearCache,
    hasCache,
  };
};

/**
 * useRecentItems Hook
 * Track recently viewed/used items
 */
export const useRecentItems = <T extends { id: number }>(
  category: string,
  maxItems = 10
) => {
  const [recentItems, setRecentItems] = useState<T[]>(() => {
    return storage.recent.get(category);
  });

  const addRecentItem = useCallback(
    (item: T) => {
      storage.recent.add(category, item, maxItems);
      setRecentItems(storage.recent.get(category));
    },
    [category, maxItems]
  );

  const clearRecent = useCallback(() => {
    storage.recent.clear(category);
    setRecentItems([]);
  }, [category]);

  return {
    recentItems,
    addRecentItem,
    clearRecent,
  };
};

/**
 * useFavorites Hook
 * Manage favorite items
 */
export const useFavorites = (category: string) => {
  const [favorites, setFavorites] = useState<number[]>(() => {
    return storage.favorites.getAll(category);
  });

  const addFavorite = useCallback(
    (id: number) => {
      storage.favorites.add(category, id);
      setFavorites(storage.favorites.getAll(category));
    },
    [category]
  );

  const removeFavorite = useCallback(
    (id: number) => {
      storage.favorites.remove(category, id);
      setFavorites(storage.favorites.getAll(category));
    },
    [category]
  );

  const toggleFavorite = useCallback(
    (id: number) => {
      if (favorites.includes(id)) {
        removeFavorite(id);
      } else {
        addFavorite(id);
      }
    },
    [favorites, addFavorite, removeFavorite]
  );

  const isFavorite = useCallback(
    (id: number) => {
      return favorites.includes(id);
    },
    [favorites]
  );

  const clearFavorites = useCallback(() => {
    storage.favorites.clear(category);
    setFavorites([]);
  }, [category]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
  };
};

/**
 * useSearchHistory Hook
 * Track search queries
 */
export const useSearchHistory = (maxQueries = 20) => {
  const [history, setHistory] = useState<string[]>(() => {
    return storage.searchHistory.get();
  });

  const addQuery = useCallback(
    (query: string) => {
      if (query.trim()) {
        storage.searchHistory.add(query.trim(), maxQueries);
        setHistory(storage.searchHistory.get());
      }
    },
    [maxQueries]
  );

  const removeQuery = useCallback((query: string) => {
    storage.searchHistory.remove(query);
    setHistory(storage.searchHistory.get());
  }, []);

  const clearHistory = useCallback(() => {
    storage.searchHistory.clear();
    setHistory([]);
  }, []);

  return {
    history,
    addQuery,
    removeQuery,
    clearHistory,
  };
};

/**
 * useFormPersistence Hook
 * Auto-save and restore form data
 */
export const useFormPersistence = <T extends Record<string, any>>(
  formId: string,
  initialValues: T,
  autoSaveInterval = 5000
) => {
  const [formData, setFormData] = useState<T>(() => {
    const saved = storage.formData.load(formId);
    return saved || initialValues;
  });

  // Auto-save effect
  useEffect(() => {
    if (autoSaveInterval > 0) {
      const interval = setInterval(() => {
        storage.formData.save(formId, formData);
      }, autoSaveInterval);

      return () => clearInterval(interval);
    }
  }, [formId, formData, autoSaveInterval]);

  const updateFormData = useCallback(
    (updates: Partial<T>) => {
      const newData = { ...formData, ...updates };
      setFormData(newData);
      storage.formData.save(formId, newData);
    },
    [formId, formData]
  );

  const resetFormData = useCallback(() => {
    setFormData(initialValues);
    storage.formData.clear(formId);
  }, [formId, initialValues]);

  const clearSavedData = useCallback(() => {
    storage.formData.clear(formId);
  }, [formId]);

  return {
    formData,
    setFormData,
    updateFormData,
    resetFormData,
    clearSavedData,
  };
};

/**
 * useStorageSize Hook
 * Monitor storage usage
 */
export const useStorageSize = () => {
  const [size, setSize] = useState<string>(() => storage.getSizeMB());
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);

  const refreshSize = useCallback(async () => {
    setSize(storage.getSizeMB());
    const quotaInfo = await storage.getQuota();
    setQuota(quotaInfo);
  }, []);

  useEffect(() => {
    refreshSize();
  }, [refreshSize]);

  const usagePercentage = quota
    ? Math.round((quota.usage / quota.quota) * 100)
    : 0;

  return {
    size,
    quota,
    usagePercentage,
    refreshSize,
  };
};

/**
 * useDebounceStorage Hook
 * Debounced storage updates
 */
export const useDebounceStorage = <T,>(
  key: string,
  initialValue: T,
  delay = 500
): [T, SetValue<T>] => {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(() => {
    const stored = storage.get<T>(key);
    return stored !== null ? stored : initialValue;
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      storage.set(key, value);
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [key, value, delay]);

  return [debouncedValue, setValue];
};

export default useLocalStorage;
