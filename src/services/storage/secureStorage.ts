import * as SecureStore from 'expo-secure-store';

/**
 * Secure Storage Service
 * Handles storage of sensitive data like tokens, credentials, and personal information
 */
export class SecureStorageService {
  private static readonly PREFIX = 'medband_secure_';

  /**
   * Store sensitive data securely
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      const storageKey = `${this.PREFIX}${key}`;
      await SecureStore.setItemAsync(storageKey, value);
    } catch (error) {
      console.error(`Error storing secure item ${key}:`, error);
      throw new Error(`Failed to store secure data: ${error}`);
    }
  }

  /**
   * Retrieve sensitive data
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      const storageKey = `${this.PREFIX}${key}`;
      return await SecureStore.getItemAsync(storageKey);
    } catch (error) {
      console.error(`Error retrieving secure item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove sensitive data
   */
  static async removeItem(key: string): Promise<void> {
    try {
      const storageKey = `${this.PREFIX}${key}`;
      await SecureStore.deleteItemAsync(storageKey);
    } catch (error) {
      console.error(`Error removing secure item ${key}:`, error);
      throw new Error(`Failed to remove secure data: ${error}`);
    }
  }

  /**
   * Store authentication tokens
   */
  static async setAuthTokens(tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt?: number;
  }): Promise<void> {
    try {
      await this.setItem('access_token', tokens.accessToken);
      await this.setItem('refresh_token', tokens.refreshToken);
      
      if (tokens.expiresAt) {
        await this.setItem('token_expires_at', tokens.expiresAt.toString());
      }
    } catch (error) {
      console.error('Error storing auth tokens:', error);
      throw error;
    }
  }

  /**
   * Retrieve authentication tokens
   */
  static async getAuthTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  }> {
    try {
      const [accessToken, refreshToken, expiresAt] = await Promise.all([
        this.getItem('access_token'),
        this.getItem('refresh_token'),
        this.getItem('token_expires_at'),
      ]);

      return {
        accessToken,
        refreshToken,
        expiresAt: expiresAt ? parseInt(expiresAt, 10) : null,
      };
    } catch (error) {
      console.error('Error retrieving auth tokens:', error);
      return { accessToken: null, refreshToken: null, expiresAt: null };
    }
  }

  /**
   * Clear all authentication data
   */
  static async clearAuthData(): Promise<void> {
    try {
      await Promise.all([
        this.removeItem('access_token'),
        this.removeItem('refresh_token'),
        this.removeItem('token_expires_at'),
        this.removeItem('user_id'),
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  }

  /**
   * Store user credentials (for biometric auth)
   */
  static async storeUserCredentials(credentials: {
    username: string;
    password: string;
    biometricEnabled: boolean;
  }): Promise<void> {
    try {
      // Only store if biometric is enabled
      if (credentials.biometricEnabled) {
        await this.setItem('user_credentials', JSON.stringify({
          username: credentials.username,
          // In a real app, you would encrypt the password
          password: credentials.password,
          biometricEnabled: true,
        }));
      }
    } catch (error) {
      console.error('Error storing user credentials:', error);
      throw error;
    }
  }

  /**
   * Retrieve user credentials
   */
  static async getUserCredentials(): Promise<{
    username: string | null;
    password: string | null;
    biometricEnabled: boolean;
  }> {
    try {
      const credentials = await this.getItem('user_credentials');
      if (credentials) {
        const parsed = JSON.parse(credentials);
        return {
          username: parsed.username,
          password: parsed.password,
          biometricEnabled: parsed.biometricEnabled,
        };
      }
      return { username: null, password: null, biometricEnabled: false };
    } catch (error) {
      console.error('Error retrieving user credentials:', error);
      return { username: null, password: null, biometricEnabled: false };
    }
  }

  /**
   * Store device pairing information
   */
  static async storeDevicePairing(deviceInfo: {
    deviceId: string;
    pairingKey: string;
    deviceName: string;
    pairedAt: number;
  }): Promise<void> {
    try {
      await this.setItem(`device_${deviceInfo.deviceId}`, JSON.stringify({
        pairingKey: deviceInfo.pairingKey,
        deviceName: deviceInfo.deviceName,
        pairedAt: deviceInfo.pairedAt,
      }));
    } catch (error) {
      console.error('Error storing device pairing:', error);
      throw error;
    }
  }

  /**
   * Retrieve device pairing information
   */
  static async getDevicePairing(deviceId: string): Promise<{
    pairingKey: string | null;
    deviceName: string | null;
    pairedAt: number | null;
  }> {
    try {
      const pairing = await this.getItem(`device_${deviceId}`);
      if (pairing) {
        const parsed = JSON.parse(pairing);
        return {
          pairingKey: parsed.pairingKey,
          deviceName: parsed.deviceName,
          pairedAt: parsed.pairedAt,
        };
      }
      return { pairingKey: null, deviceName: null, pairedAt: null };
    } catch (error) {
      console.error('Error retrieving device pairing:', error);
      return { pairingKey: null, deviceName: null, pairedAt: null };
    }
  }

  /**
   * Remove device pairing information
   */
  static async removeDevicePairing(deviceId: string): Promise<void> {
    try {
      await this.removeItem(`device_${deviceId}`);
    } catch (error) {
      console.error('Error removing device pairing:', error);
      throw error;
    }
  }

  /**
   * Store sensitive user profile data
   */
  static async storeSensitiveProfileData(profileData: {
    ssn?: string;
    insuranceId?: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
    medicalConditions?: string[];
    allergies?: string[];
    medications?: string[];
  }): Promise<void> {
    try {
      await this.setItem('sensitive_profile', JSON.stringify(profileData));
    } catch (error) {
      console.error('Error storing sensitive profile data:', error);
      throw error;
    }
  }

  /**
   * Retrieve sensitive user profile data
   */
  static async getSensitiveProfileData(): Promise<{
    ssn?: string;
    insuranceId?: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
    medicalConditions?: string[];
    allergies?: string[];
    medications?: string[];
  }> {
    try {
      const data = await this.getItem('sensitive_profile');
      if (data) {
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('Error retrieving sensitive profile data:', error);
      return {};
    }
  }

  /**
   * Clear all secure storage data
   */
  static async clearAll(): Promise<void> {
    try {
      // Get all keys and remove those with our prefix
      // Note: SecureStore doesn't have a way to list all keys in Expo
      // We'll clear known keys
      const knownKeys = [
        'access_token',
        'refresh_token',
        'token_expires_at',
        'user_id',
        'user_credentials',
        'sensitive_profile',
      ];

      await Promise.all(
        knownKeys.map(key => this.removeItem(key))
      );

      // Also clear any device pairings (we don't know all device IDs)
      // This would need to be handled differently in a real app
    } catch (error) {
      console.error('Error clearing all secure storage:', error);
      throw error;
    }
  }

  /**
   * Check if secure storage is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Test storage by writing and reading a test value
      const testKey = 'test_availability';
      const testValue = 'test_value';
      
      await this.setItem(testKey, testValue);
      const retrieved = await this.getItem(testKey);
      await this.removeItem(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      console.error('Secure storage not available:', error);
      return false;
    }
  }
}

// Export singleton utility functions
export const secureStorage = {
  setItem: SecureStorageService.setItem,
  getItem: SecureStorageService.getItem,
  removeItem: SecureStorageService.removeItem,
  setAuthTokens: SecureStorageService.setAuthTokens,
  getAuthTokens: SecureStorageService.getAuthTokens,
  clearAuthData: SecureStorageService.clearAuthData,
  storeUserCredentials: SecureStorageService.storeUserCredentials,
  getUserCredentials: SecureStorageService.getUserCredentials,
  storeDevicePairing: SecureStorageService.storeDevicePairing,
  getDevicePairing: SecureStorageService.getDevicePairing,
  removeDevicePairing: SecureStorageService.removeDevicePairing,
  storeSensitiveProfileData: SecureStorageService.storeSensitiveProfileData,
  getSensitiveProfileData: SecureStorageService.getSensitiveProfileData,
  clearAll: SecureStorageService.clearAll,
  isAvailable: SecureStorageService.isAvailable,
};