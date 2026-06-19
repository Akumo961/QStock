/**
 * Storage Service
 * Handles local storage operations with type safety and encryption support
 */

interface StorageOptions {
  encrypt?: boolean;
  expiry?: number; // Time in milliseconds
}

interface StorageItem<T> {
  value: T;
  timestamp: number;
  expiry?: number;
}

class StorageService {
  private readonly prefix = 'qr_inventory_';

  /**
   * Set item in storage
   */
  set<T>(key: string, value: T, options?: StorageOptions): void {
    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        expiry: options?.expiry,
      };

      const serialized = JSON.stringify(item);
      const data = options?.encrypt ? this.encrypt(serialized) : serialized;

      localStorage.setItem(this.getKey(key), data);
    } catch (error) {
      console.error(`Failed to set storage item ${key}:`, error);
    }
  }

  /**
   * Get item from storage
   */
  get<T>(key: string, encrypted = false): T | null {
    try {
      const data = localStorage.getItem(this.getKey(key));

      if (!data) {
        return null;
      }

      const decrypted = encrypted ? this.decrypt(data) : data;
      const item: StorageItem<T> = JSON.parse(decrypted);

      // Check if expired
      if (item.expiry && Date.now() - item.timestamp > item.expiry) {
        this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error(`Failed to get storage item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error(`Failed to remove storage item ${key}:`, error);
    }
  }

  /**
   * Clear all items with prefix
   */
  clear(): void {
    try {
      const keys = this.getAllKeys();
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  /**
   * Get all keys with prefix
   */
  getAllKeys(): string[] {
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Get storage size
   */
  getSize(): number {
    let size = 0;

    this.getAllKeys().forEach((key) => {
      const item = localStorage.getItem(key);
      if (item) {
        size += item.length + key.length;
      }
    });

    return size;
  }

  /**
   * Get storage size in MB
   */
  getSizeMB(): string {
    return (this.getSize() / (1024 * 1024)).toFixed(2);
  }

  /**
   * Session storage methods
   */
  session = {
    set: <T>(key: string, value: T): void => {
      try {
        const item: StorageItem<T> = {
          value,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(this.getKey(key), JSON.stringify(item));
      } catch (error) {
        console.error(`Failed to set session item ${key}:`, error);
      }
    },

    get: <T>(key: string): T | null => {
      try {
        const data = sessionStorage.getItem(this.getKey(key));
        if (!data) return null;

        const item: StorageItem<T> = JSON.parse(data);
        return item.value;
      } catch (error) {
        console.error(`Failed to get session item ${key}:`, error);
        return null;
      }
    },

    remove: (key: string): void => {
      sessionStorage.removeItem(this.getKey(key));
    },

    clear: (): void => {
      sessionStorage.clear();
    },
  };

  /**
   * Cache methods with TTL
   */
  cache = {
    set: <T>(key: string, value: T, ttl: number): void => {
      this.set(key, value, { expiry: ttl });
    },

    get: <T>(key: string): T | null => {
      return this.get<T>(key);
    },

    has: (key: string): boolean => {
      const value = this.get(key);
      return value !== null;
    },
  };

  /**
   * Preferences storage
   */
  preferences = {
    set: (key: string, value: any): void => {
      const prefs = this.get<Record<string, any>>('preferences') || {};
      prefs[key] = value;
      this.set('preferences', prefs);
    },

    get: (key: string): any => {
      const prefs = this.get<Record<string, any>>('preferences') || {};
      return prefs[key];
    },

    getAll: (): Record<string, any> => {
      return this.get<Record<string, any>>('preferences') || {};
    },

    remove: (key: string): void => {
      const prefs = this.get<Record<string, any>>('preferences') || {};
      delete prefs[key];
      this.set('preferences', prefs);
    },

    clear: (): void => {
      this.remove('preferences');
    },
  };

  /**
   * Recent items tracking
   */
  recent = {
    add: (category: string, item: any, maxItems = 10): void => {
      const key = `recent_${category}`;
      const items = this.get<any[]>(key) || [];

      // Remove if already exists
      const filtered = items.filter((i) => i.id !== item.id);

      // Add to front
      filtered.unshift(item);

      // Limit size
      const limited = filtered.slice(0, maxItems);

      this.set(key, limited);
    },

    get: (category: string): any[] => {
      return this.get<any[]>(`recent_${category}`) || [];
    },

    clear: (category: string): void => {
      this.remove(`recent_${category}`);
    },
  };

  /**
   * Favorites management
   */
  favorites = {
    add: (category: string, id: number): void => {
      const key = `favorites_${category}`;
      const favorites = this.get<number[]>(key) || [];

      if (!favorites.includes(id)) {
        favorites.push(id);
        this.set(key, favorites);
      }
    },

    remove: (category: string, id: number): void => {
      const key = `favorites_${category}`;
      const favorites = this.get<number[]>(key) || [];
      const filtered = favorites.filter((fav) => fav !== id);
      this.set(key, filtered);
    },

    has: (category: string, id: number): boolean => {
      const favorites = this.get<number[]>(`favorites_${category}`) || [];
      return favorites.includes(id);
    },

    getAll: (category: string): number[] => {
      return this.get<number[]>(`favorites_${category}`) || [];
    },

    clear: (category: string): void => {
      this.remove(`favorites_${category}`);
    },
  };

  /**
   * Form data persistence
   */
  formData = {
    save: (formId: string, data: any): void => {
      this.set(`form_${formId}`, data);
    },

    load: (formId: string): any => {
      return this.get(`form_${formId}`);
    },

    clear: (formId: string): void => {
      this.remove(`form_${formId}`);
    },

    autosave: (formId: string, data: any, interval = 5000): () => void => {
      this.formData.save(formId, data);

      const intervalId = setInterval(() => {
        this.formData.save(formId, data);
      }, interval);

      // Return cleanup function
      return () => clearInterval(intervalId);
    },
  };

  /**
   * Search history
   */
  searchHistory = {
    add: (query: string, maxItems = 20): void => {
      const history = this.get<string[]>('search_history') || [];

      // Remove if already exists
      const filtered = history.filter((q) => q !== query);

      // Add to front
      filtered.unshift(query);

      // Limit size
      const limited = filtered.slice(0, maxItems);

      this.set('search_history', limited);
    },

    get: (): string[] => {
      return this.get<string[]>('search_history') || [];
    },

    remove: (query: string): void => {
      const history = this.get<string[]>('search_history') || [];
      const filtered = history.filter((q) => q !== query);
      this.set('search_history', filtered);
    },

    clear: (): void => {
      this.remove('search_history');
    },
  };

  /**
   * Get prefixed key
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Simple encryption (base64 encode)
   * Note: This is NOT secure encryption, just obfuscation
   */
  private encrypt(data: string): string {
    try {
      return btoa(data);
    } catch {
      return data;
    }
  }

  /**
   * Simple decryption (base64 decode)
   */
  private decrypt(data: string): string {
    try {
      return atob(data);
    } catch {
      return data;
    }
  }

  /**
   * Export all data
   */
  export(): Record<string, any> {
    const data: Record<string, any> = {};

    this.getAllKeys().forEach((key) => {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          data[key] = JSON.parse(item);
        } catch {
          data[key] = item;
        }
      }
    });

    return data;
  }

  /**
   * Import data
   */
  import(data: Record<string, any>): void {
    Object.entries(data).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Failed to import ${key}:`, error);
      }
    });
  }

  /**
   * Clean expired items
   */
  cleanExpired(): void {
    this.getAllKeys().forEach((key) => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const item: StorageItem<any> = JSON.parse(data);
          if (item.expiry && Date.now() - item.timestamp > item.expiry) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Skip invalid items
      }
    });
  }

  /**
   * Get storage quota info
   */
  async getQuota(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }

    return {
      usage: this.getSize(),
      quota: 5 * 1024 * 1024, // Estimate 5MB
    };
  }
}

// Create singleton instance
const storage = new StorageService();

// Export service instance
export default storage;

// Export types
export type { StorageOptions, StorageItem };

// Auto-cleanup expired items on load
storage.cleanExpired();

// Setup periodic cleanup (every hour)
setInterval(() => {
  storage.cleanExpired();
}, 60 * 60 * 1000);