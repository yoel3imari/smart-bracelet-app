import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Async Storage Service
 * Handles storage of non-sensitive data like preferences, cached data, and app state
 */
export class AsyncStorageService {
  private static readonly PREFIX = '@medband_';

  /**
   * Store data with namespace
   */
  static async setItem(key: string, value: any): Promise<void> {
    try {
      const storageKey = `${this.PREFIX}${key}`;
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(storageKey, stringValue);
    } catch (error) {
      console.error(`Error storing async item ${key}:`, error);
      throw new Error(`Failed to store data: ${error}`);
    }
  }

  /**
   * Retrieve data
   */
  static async getItem<T = any>(key: string): Promise<T | null> {
    try {
      const storageKey = `${this.PREFIX}${key}`;
      const value = await AsyncStorage.getItem(storageKey);
      
      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        // If parsing fails, return as string
        return value as unknown as T;
      }
    } catch (error) {
      console.error(`Error retrieving async item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove data
   */
  static async removeItem(key: string): Promise<void> {
    try {
      const storageKey = `${this.PREFIX}${key}`;
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`Error removing async item ${key}:`, error);
      throw new Error(`Failed to remove data: ${error}`);
    }
  }

  /**
   * Store user preferences
   */
  static async storePreferences(preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    units: 'metric' | 'imperial';
    notifications: {
      healthAlerts: boolean;
      deviceConnection: boolean;
      weeklyReports: boolean;
      medicationReminders: boolean;
    };
    privacy: {
      shareDataWithProviders: boolean;
      shareDataForResearch: boolean;
      showInEmergency: boolean;
    };
  }): Promise<void> {
    try {
      await this.setItem('user_preferences', preferences);
    } catch (error) {
      console.error('Error storing user preferences:', error);
      throw error;
    }
  }

  /**
   * Retrieve user preferences
   */
  static async getPreferences(): Promise<{
    theme: 'light' | 'dark' | 'auto';
    language: string;
    units: 'metric' | 'imperial';
    notifications: {
      healthAlerts: boolean;
      deviceConnection: boolean;
      weeklyReports: boolean;
      medicationReminders: boolean;
    };
    privacy: {
      shareDataWithProviders: boolean;
      shareDataForResearch: boolean;
      showInEmergency: boolean;
    };
  } | null> {
    try {
      return await this.getItem('user_preferences');
    } catch (error) {
      console.error('Error retrieving user preferences:', error);
      return null;
    }
  }

  /**
   * Store cached health data
   */
  static async cacheHealthData(data: {
    currentData?: any;
    historicalData?: any[];
    lastUpdated: number;
    deviceId: string;
  }): Promise<void> {
    try {
      await this.setItem('cached_health_data', {
        ...data,
        cachedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error caching health data:', error);
      throw error;
    }
  }

  /**
   * Retrieve cached health data
   */
  static async getCachedHealthData(): Promise<{
    currentData?: any;
    historicalData?: any[];
    lastUpdated: number;
    deviceId: string;
    cachedAt: number;
  } | null> {
    try {
      return await this.getItem('cached_health_data');
    } catch (error) {
      console.error('Error retrieving cached health data:', error);
      return null;
    }
  }

  /**
   * Store device connection history
   */
  static async storeDeviceHistory(deviceId: string, history: {
    connectedAt: number;
    disconnectedAt?: number;
    batteryLevel?: number;
    dataPoints: number;
  }): Promise<void> {
    try {
      const existingHistory = await this.getItem<Record<string, any[]>>('device_connection_history') || {};
      
      if (!existingHistory[deviceId]) {
        existingHistory[deviceId] = [];
      }
      
      existingHistory[deviceId].push(history);
      
      // Keep only last 100 entries per device
      if (existingHistory[deviceId].length > 100) {
        existingHistory[deviceId] = existingHistory[deviceId].slice(-100);
      }
      
      await this.setItem('device_connection_history', existingHistory);
    } catch (error) {
      console.error('Error storing device history:', error);
      throw error;
    }
  }

  /**
   * Retrieve device connection history
   */
  static async getDeviceHistory(deviceId: string): Promise<any[]> {
    try {
      const history = await this.getItem<Record<string, any[]>>('device_connection_history');
      return history?.[deviceId] || [];
    } catch (error) {
      console.error('Error retrieving device history:', error);
      return [];
    }
  }

  /**
   * Store app state for offline usage
   */
  static async storeAppState(state: {
    lastSync: number;
    pendingSync: any[];
    offlineMode: boolean;
    connectionStatus: 'online' | 'offline';
  }): Promise<void> {
    try {
      await this.setItem('app_state', {
        ...state,
        storedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error storing app state:', error);
      throw error;
    }
  }

  /**
   * Retrieve app state
   */
  static async getAppState(): Promise<{
    lastSync: number;
    pendingSync: any[];
    offlineMode: boolean;
    connectionStatus: 'online' | 'offline';
    storedAt: number;
  } | null> {
    try {
      return await this.getItem('app_state');
    } catch (error) {
      console.error('Error retrieving app state:', error);
      return null;
    }
  }

  /**
   * Store analytics events for batch upload
   */
  static async storeAnalyticsEvent(event: {
    type: string;
    data: any;
    timestamp: number;
  }): Promise<void> {
    try {
      const events = await this.getItem<any[]>('analytics_events') || [];
      events.push(event);
      
      // Keep only last 1000 events
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }
      
      await this.setItem('analytics_events', events);
    } catch (error) {
      console.error('Error storing analytics event:', error);
      throw error;
    }
  }

  /**
   * Retrieve analytics events
   */
  static async getAnalyticsEvents(): Promise<any[]> {
    try {
      return await this.getItem<any[]>('analytics_events') || [];
    } catch (error) {
      console.error('Error retrieving analytics events:', error);
      return [];
    }
  }

  /**
   * Clear analytics events
   */
  static async clearAnalyticsEvents(): Promise<void> {
    try {
      await this.removeItem('analytics_events');
    } catch (error) {
      console.error('Error clearing analytics events:', error);
      throw error;
    }
  }

  /**
   * Store search history
   */
  static async storeSearchHistory(query: string): Promise<void> {
    try {
      const history = await this.getItem<string[]>('search_history') || [];
      
      // Remove duplicate and add to beginning
      const filteredHistory = history.filter(item => item !== query);
      filteredHistory.unshift(query);
      
      // Keep only last 20 searches
      if (filteredHistory.length > 20) {
        filteredHistory.splice(20);
      }
      
      await this.setItem('search_history', filteredHistory);
    } catch (error) {
      console.error('Error storing search history:', error);
      throw error;
    }
  }

  /**
   * Retrieve search history
   */
  static async getSearchHistory(): Promise<string[]> {
    try {
      return await this.getItem<string[]>('search_history') || [];
    } catch (error) {
      console.error('Error retrieving search history:', error);
      return [];
    }
  }

  /**
   * Clear search history
   */
  static async clearSearchHistory(): Promise<void> {
    try {
      await this.removeItem('search_history');
    } catch (error) {
      console.error('Error clearing search history:', error);
      throw error;
    }
  }

  /**
   * Store onboarding status
   */
  static async storeOnboardingStatus(status: {
    completed: boolean;
    completedSteps: string[];
    lastStep: string;
  }): Promise<void> {
    try {
      await this.setItem('onboarding_status', status);
    } catch (error) {
      console.error('Error storing onboarding status:', error);
      throw error;
    }
  }

  /**
   * Retrieve onboarding status
   */
  static async getOnboardingStatus(): Promise<{
    completed: boolean;
    completedSteps: string[];
    lastStep: string;
  } | null> {
    try {
      return await this.getItem('onboarding_status');
    } catch (error) {
      console.error('Error retrieving onboarding status:', error);
      return null;
    }
  }

  /**
   * Get storage usage information
   */
  static async getStorageInfo(): Promise<{
    totalKeys: number;
    estimatedSize: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const medbandKeys = keys.filter(key => key.startsWith(this.PREFIX));
      
      // Estimate size by getting all values (this is approximate)
      const values = await AsyncStorage.multiGet(medbandKeys);
      const totalSize = values.reduce((size, [_, value]) => {
        return size + (value ? value.length : 0);
      }, 0);
      
      return {
        totalKeys: medbandKeys.length,
        estimatedSize: totalSize,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { totalKeys: 0, estimatedSize: 0 };
    }
  }

  /**
   * Clear all app data (except secure storage)
   */
  static async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const medbandKeys = keys.filter(key => key.startsWith(this.PREFIX));
      
      await AsyncStorage.multiRemove(medbandKeys);
    } catch (error) {
      console.error('Error clearing all async storage:', error);
      throw error;
    }
  }

  /**
   * Migrate data from old storage format (if needed)
   */
  static async migrateFromOldFormat(): Promise<void> {
    try {
      // This would contain migration logic for app updates
      // For now, it's a placeholder for future migrations
      console.log('Migration check completed');
    } catch (error) {
      console.error('Error during storage migration:', error);
      throw error;
    }
  }
}

// Export singleton utility functions
export const asyncStorage = {
  setItem: AsyncStorageService.setItem,
  getItem: AsyncStorageService.getItem,
  removeItem: AsyncStorageService.removeItem,
  storePreferences: AsyncStorageService.storePreferences,
  getPreferences: AsyncStorageService.getPreferences,
  cacheHealthData: AsyncStorageService.cacheHealthData,
  getCachedHealthData: AsyncStorageService.getCachedHealthData,
  storeDeviceHistory: AsyncStorageService.storeDeviceHistory,
  getDeviceHistory: AsyncStorageService.getDeviceHistory,
  storeAppState: AsyncStorageService.storeAppState,
  getAppState: AsyncStorageService.getAppState,
  storeAnalyticsEvent: AsyncStorageService.storeAnalyticsEvent,
  getAnalyticsEvents: AsyncStorageService.getAnalyticsEvents,
  clearAnalyticsEvents: AsyncStorageService.clearAnalyticsEvents,
  storeSearchHistory: AsyncStorageService.storeSearchHistory,
  getSearchHistory: AsyncStorageService.getSearchHistory,
  clearSearchHistory: AsyncStorageService.clearSearchHistory,
  storeOnboardingStatus: AsyncStorageService.storeOnboardingStatus,
  getOnboardingStatus: AsyncStorageService.getOnboardingStatus,
  getStorageInfo: AsyncStorageService.getStorageInfo,
  clearAll: AsyncStorageService.clearAll,
  migrateFromOldFormat: AsyncStorageService.migrateFromOldFormat,
};