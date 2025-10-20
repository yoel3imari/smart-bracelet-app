import { secureStorage } from './secureStorage';
import { asyncStorage } from './asyncStorage';

/**
 * Unified Storage Service
 * Provides a clean interface for all storage operations with proper data categorization
 */
export class StorageService {
  /**
   * Data categorization for proper storage strategy
   */
  static readonly STORAGE_CATEGORIES = {
    SENSITIVE: 'sensitive', // Tokens, credentials, personal data
    PREFERENCES: 'preferences', // User settings, app configuration
    CACHE: 'cache', // Cached API responses, offline data
    ANALYTICS: 'analytics', // Usage data, events
    STATE: 'state', // App state, navigation state
    HISTORY: 'history', // Search history, device history
  } as const;

  /**
   * Store data with automatic categorization
   */
  static async storeData(category: string, key: string, value: any): Promise<void> {
    try {
      const storageKey = `${category}_${key}`;

      switch (category) {
        case this.STORAGE_CATEGORIES.SENSITIVE:
          if (typeof value === 'string') {
            await secureStorage.setItem(storageKey, value);
          } else {
            await secureStorage.setItem(storageKey, JSON.stringify(value));
          }
          break;

        case this.STORAGE_CATEGORIES.PREFERENCES:
        case this.STORAGE_CATEGORIES.CACHE:
        case this.STORAGE_CATEGORIES.ANALYTICS:
        case this.STORAGE_CATEGORIES.STATE:
        case this.STORAGE_CATEGORIES.HISTORY:
          await asyncStorage.setItem(storageKey, value);
          break;

        default:
          throw new Error(`Unknown storage category: ${category}`);
      }
    } catch (error) {
      console.error(`Error storing data in category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve data with automatic categorization
   */
  static async getData<T = any>(category: string, key: string): Promise<T | null> {
    try {
      const storageKey = `${category}_${key}`;

      switch (category) {
        case this.STORAGE_CATEGORIES.SENSITIVE:
          const sensitiveValue = await secureStorage.getItem(storageKey);
          if (sensitiveValue) {
            try {
              return JSON.parse(sensitiveValue) as T;
            } catch {
              return sensitiveValue as unknown as T;
            }
          }
          return null;

        case this.STORAGE_CATEGORIES.PREFERENCES:
        case this.STORAGE_CATEGORIES.CACHE:
        case this.STORAGE_CATEGORIES.ANALYTICS:
        case this.STORAGE_CATEGORIES.STATE:
        case this.STORAGE_CATEGORIES.HISTORY:
          return await asyncStorage.getItem<T>(storageKey);

        default:
          throw new Error(`Unknown storage category: ${category}`);
      }
    } catch (error) {
      console.error(`Error retrieving data from category ${category}:`, error);
      return null;
    }
  }

  /**
   * Remove data with automatic categorization
   */
  static async removeData(category: string, key: string): Promise<void> {
    try {
      const storageKey = `${category}_${key}`;

      switch (category) {
        case this.STORAGE_CATEGORIES.SENSITIVE:
          await secureStorage.removeItem(storageKey);
          break;

        case this.STORAGE_CATEGORIES.PREFERENCES:
        case this.STORAGE_CATEGORIES.CACHE:
        case this.STORAGE_CATEGORIES.ANALYTICS:
        case this.STORAGE_CATEGORIES.STATE:
        case this.STORAGE_CATEGORIES.HISTORY:
          await asyncStorage.removeItem(storageKey);
          break;

        default:
          throw new Error(`Unknown storage category: ${category}`);
      }
    } catch (error) {
      console.error(`Error removing data from category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Store user session data
   */
  static async storeSession(sessionData: {
    userId: string;
    userProfile: any;
    preferences: any;
    lastActive: number;
  }): Promise<void> {
    try {
      await Promise.all([
        this.storeData(this.STORAGE_CATEGORIES.SENSITIVE, 'user_id', sessionData.userId),
        this.storeData(this.STORAGE_CATEGORIES.CACHE, 'user_profile', sessionData.userProfile),
        this.storeData(this.STORAGE_CATEGORIES.PREFERENCES, 'user_preferences', sessionData.preferences),
        this.storeData(this.STORAGE_CATEGORIES.STATE, 'last_active', sessionData.lastActive),
      ]);
    } catch (error) {
      console.error('Error storing user session:', error);
      throw error;
    }
  }

  /**
   * Retrieve user session data
   */
  static async getSession(): Promise<{
    userId: string | null;
    userProfile: any;
    preferences: any;
    lastActive: number | null;
  }> {
    try {
      const [userId, userProfile, preferences, lastActive] = await Promise.all([
        this.getData<string>(this.STORAGE_CATEGORIES.SENSITIVE, 'user_id'),
        this.getData(this.STORAGE_CATEGORIES.CACHE, 'user_profile'),
        this.getData(this.STORAGE_CATEGORIES.PREFERENCES, 'user_preferences'),
        this.getData<number>(this.STORAGE_CATEGORIES.STATE, 'last_active'),
      ]);

      return {
        userId,
        userProfile,
        preferences,
        lastActive,
      };
    } catch (error) {
      console.error('Error retrieving user session:', error);
      return { userId: null, userProfile: null, preferences: null, lastActive: null };
    }
  }

  /**
   * Clear user session data
   */
  static async clearSession(): Promise<void> {
    try {
      await Promise.all([
        this.removeData(this.STORAGE_CATEGORIES.SENSITIVE, 'user_id'),
        this.removeData(this.STORAGE_CATEGORIES.CACHE, 'user_profile'),
        this.removeData(this.STORAGE_CATEGORIES.STATE, 'last_active'),
        // Don't clear preferences as user might want to keep them
      ]);
    } catch (error) {
      console.error('Error clearing user session:', error);
      throw error;
    }
  }

  /**
   * Store offline health data for sync
   */
  static async storeOfflineHealthData(data: {
    deviceId: string;
    measurements: any[];
    timestamp: number;
  }): Promise<void> {
    try {
      const pendingSync = await this.getData<any[]>(this.STORAGE_CATEGORIES.CACHE, 'pending_sync') || [];
      
      pendingSync.push({
        ...data,
        id: `${data.deviceId}_${Date.now()}`,
        synced: false,
      });

      // Keep only last 1000 pending sync items
      if (pendingSync.length > 1000) {
        pendingSync.splice(0, pendingSync.length - 1000);
      }

      await this.storeData(this.STORAGE_CATEGORIES.CACHE, 'pending_sync', pendingSync);
    } catch (error) {
      console.error('Error storing offline health data:', error);
      throw error;
    }
  }

  /**
   * Retrieve offline health data for sync
   */
  static async getOfflineHealthData(): Promise<any[]> {
    try {
      return await this.getData<any[]>(this.STORAGE_CATEGORIES.CACHE, 'pending_sync') || [];
    } catch (error) {
      console.error('Error retrieving offline health data:', error);
      return [];
    }
  }

  /**
   * Mark health data as synced
   */
  static async markHealthDataSynced(syncIds: string[]): Promise<void> {
    try {
      const pendingSync = await this.getData<any[]>(this.STORAGE_CATEGORIES.CACHE, 'pending_sync') || [];
      
      const updatedSync = pendingSync.filter(item => !syncIds.includes(item.id));
      
      await this.storeData(this.STORAGE_CATEGORIES.CACHE, 'pending_sync', updatedSync);
    } catch (error) {
      console.error('Error marking health data as synced:', error);
      throw error;
    }
  }

  /**
   * Store app settings with validation
   */
  static async storeAppSettings(settings: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notificationSettings: any;
    privacySettings: any;
  }): Promise<void> {
    try {
      // Validate settings before storing
      const validatedSettings = {
        theme: ['light', 'dark', 'auto'].includes(settings.theme) ? settings.theme : 'auto',
        language: settings.language || 'en',
        notificationSettings: settings.notificationSettings || {},
        privacySettings: settings.privacySettings || {},
        lastUpdated: Date.now(),
      };

      await this.storeData(this.STORAGE_CATEGORIES.PREFERENCES, 'app_settings', validatedSettings);
    } catch (error) {
      console.error('Error storing app settings:', error);
      throw error;
    }
  }

  /**
   * Retrieve app settings with defaults
   */
  static async getAppSettings(): Promise<{
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notificationSettings: any;
    privacySettings: any;
    lastUpdated: number;
  }> {
    try {
      const settings = await this.getData(this.STORAGE_CATEGORIES.PREFERENCES, 'app_settings');
      
      if (settings) {
        return settings;
      }

      // Return default settings
      return {
        theme: 'auto',
        language: 'en',
        notificationSettings: {
          healthAlerts: true,
          deviceConnection: true,
          weeklyReports: false,
          medicationReminders: true,
        },
        privacySettings: {
          shareDataWithProviders: false,
          shareDataForResearch: false,
          showInEmergency: true,
        },
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('Error retrieving app settings:', error);
      // Return defaults on error
      return {
        theme: 'auto',
        language: 'en',
        notificationSettings: {},
        privacySettings: {},
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    secureStorage: { totalKeys: number; available: boolean };
    asyncStorage: { totalKeys: number; estimatedSize: number };
    categories: Record<string, number>;
  }> {
    try {
      const [secureAvailable, asyncInfo] = await Promise.all([
        secureStorage.isAvailable(),
        asyncStorage.getStorageInfo(),
      ]);

      // Count keys by category (this is approximate)
      const categoryCounts: Record<string, number> = {};
      Object.values(this.STORAGE_CATEGORIES).forEach(category => {
        categoryCounts[category] = 0; // Would need actual key counting implementation
      });

      return {
        secureStorage: {
          totalKeys: 0, // SecureStore doesn't provide key listing
          available: secureAvailable,
        },
        asyncStorage: {
          totalKeys: asyncInfo.totalKeys,
          estimatedSize: asyncInfo.estimatedSize,
        },
        categories: categoryCounts,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        secureStorage: { totalKeys: 0, available: false },
        asyncStorage: { totalKeys: 0, estimatedSize: 0 },
        categories: {},
      };
    }
  }

  /**
   * Clear all storage data (for logout or app reset)
   */
  static async clearAll(): Promise<void> {
    try {
      await Promise.all([
        secureStorage.clearAll(),
        asyncStorage.clearAll(),
      ]);
    } catch (error) {
      console.error('Error clearing all storage:', error);
      throw error;
    }
  }

  /**
   * Perform storage maintenance (cleanup old data, etc.)
   */
  static async performMaintenance(): Promise<void> {
    try {
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

      // Clean old analytics events (keep only last month)
      const analyticsEvents = await asyncStorage.getAnalyticsEvents();
      const recentAnalytics = analyticsEvents.filter(event => 
        event.timestamp && event.timestamp > oneMonthAgo
      );
      
      if (recentAnalytics.length !== analyticsEvents.length) {
        await asyncStorage.setItem('analytics_events', recentAnalytics);
      }

      // Clean old cached health data (keep only last week)
      const cachedHealthData = await asyncStorage.getCachedHealthData();
      if (cachedHealthData && cachedHealthData.cachedAt < oneWeekAgo) {
        await asyncStorage.removeItem('cached_health_data');
      }

      console.log('Storage maintenance completed');
    } catch (error) {
      console.error('Error during storage maintenance:', error);
      // Don't throw error for maintenance tasks
    }
  }
}

// Export categories for external use
export const STORAGE_CATEGORIES = StorageService.STORAGE_CATEGORIES;

// Export singleton utility functions
export const storage = {
  storeData: StorageService.storeData,
  getData: StorageService.getData,
  removeData: StorageService.removeData,
  storeSession: StorageService.storeSession,
  getSession: StorageService.getSession,
  clearSession: StorageService.clearSession,
  storeOfflineHealthData: StorageService.storeOfflineHealthData,
  getOfflineHealthData: StorageService.getOfflineHealthData,
  markHealthDataSynced: StorageService.markHealthDataSynced,
  storeAppSettings: StorageService.storeAppSettings,
  getAppSettings: StorageService.getAppSettings,
  getStorageStats: StorageService.getStorageStats,
  clearAll: StorageService.clearAll,
  performMaintenance: StorageService.performMaintenance,
};