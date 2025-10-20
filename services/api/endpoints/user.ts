import { apiClient, ApiResponse } from '../client';
import { ApiErrorBoundary } from '../errors';

// Types for user data
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  photoUrl?: string;
  bloodType: string;
  height?: number; // in cm
  weight?: number; // in kg
  conditions: string[];
  allergies: string[];
  medications: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
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
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    units: 'metric' | 'imperial';
  };
}

export interface ConnectedDevice {
  id: string;
  name: string;
  type: 'bracelet' | 'watch' | 'patch' | 'other';
  model: string;
  manufacturer: string;
  lastConnected: string;
  batteryLevel: number;
  isPrimary: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

/**
 * User Profile API Service
 * Handles all user-related API calls
 */
export class UserApiService {
  private static readonly BASE_PATH = '/user';

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<UserProfile> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<UserProfile> = await apiClient.get(
        `${this.BASE_PATH}/profile`
      );
      return response.data;
    }, 'getProfile');
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<UserProfile> = await apiClient.patch(
        `${this.BASE_PATH}/profile`,
        updates
      );
      return response.data;
    }, 'updateProfile');
  }

  /**
   * Get user preferences
   */
  static async getPreferences(): Promise<UserPreferences> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<UserPreferences> = await apiClient.get(
        `${this.BASE_PATH}/preferences`
      );
      return response.data;
    }, 'getPreferences');
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<UserPreferences> = await apiClient.patch(
        `${this.BASE_PATH}/preferences`,
        updates
      );
      return response.data;
    }, 'updatePreferences');
  }

  /**
   * Get connected devices
   */
  static async getConnectedDevices(): Promise<ConnectedDevice[]> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<ConnectedDevice[]> = await apiClient.get(
        `${this.BASE_PATH}/devices`
      );
      return response.data;
    }, 'getConnectedDevices');
  }

  /**
   * Add a new device
   */
  static async addDevice(deviceData: {
    name: string;
    type: string;
    model: string;
    manufacturer: string;
    identifier: string;
  }): Promise<ConnectedDevice> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<ConnectedDevice> = await apiClient.post(
        `${this.BASE_PATH}/devices`,
        deviceData
      );
      return response.data;
    }, 'addDevice');
  }

  /**
   * Remove a device
   */
  static async removeDevice(deviceId: string): Promise<void> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      await apiClient.delete(`${this.BASE_PATH}/devices/${deviceId}`);
    }, 'removeDevice');
  }

  /**
   * Set primary device
   */
  static async setPrimaryDevice(deviceId: string): Promise<void> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      await apiClient.patch(`${this.BASE_PATH}/devices/${deviceId}/primary`);
    }, 'setPrimaryDevice');
  }

  /**
   * Upload profile photo
   */
  static async uploadPhoto(photoUri: string): Promise<{ photoUrl: string }> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'profile-photo.jpg',
      } as any);

      const response: ApiResponse<{ photoUrl: string }> = await apiClient.post(
        `${this.BASE_PATH}/profile/photo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    }, 'uploadPhoto');
  }

  /**
   * Delete profile photo
   */
  static async deletePhoto(): Promise<void> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      await apiClient.delete(`${this.BASE_PATH}/profile/photo`);
    }, 'deletePhoto');
  }

  /**
   * Change password
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      await apiClient.post(`${this.BASE_PATH}/change-password`, {
        currentPassword,
        newPassword,
      });
    }, 'changePassword');
  }

  /**
   * Request data export
   */
  static async requestDataExport(): Promise<{ exportId: string; estimatedTime: number }> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<{ exportId: string; estimatedTime: number }> = 
        await apiClient.post(`${this.BASE_PATH}/data-export`);
      return response.data;
    }, 'requestDataExport');
  }

  /**
   * Get export status
   */
  static async getExportStatus(exportId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
    error?: string;
  }> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<{
        status: 'pending' | 'processing' | 'completed' | 'failed';
        downloadUrl?: string;
        error?: string;
      }> = await apiClient.get(`${this.BASE_PATH}/data-export/${exportId}`);
      return response.data;
    }, 'getExportStatus');
  }

  /**
   * Delete account
   */
  static async deleteAccount(confirmation: string): Promise<void> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      await apiClient.post(`${this.BASE_PATH}/delete-account`, { confirmation });
    }, 'deleteAccount');
  }
}