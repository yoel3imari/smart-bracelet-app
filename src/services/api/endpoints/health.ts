import { apiClient, ApiResponse } from '../client';
import { ApiErrorBoundary } from '../errors';

// Types for health data
export interface HealthData {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  temperature: number;
  oxygenLevel: number;
  lastUpdated: string;
  deviceId: string;
}

export interface HistoricalData {
  timestamp: string;
  heartRate: number;
  oxygenLevel: number;
  temperature: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
}

export interface HealthAlert {
  id: string;
  type: 'heart_rate' | 'blood_pressure' | 'oxygen' | 'temperature' | 'fall_detection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  data?: {
    currentValue: number;
    normalRange: { min: number; max: number };
  };
}

export interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  batteryLevel: number;
  firmwareVersion: string;
  lastConnected: string;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export interface HealthStats {
  averageHeartRate: number;
  averageOxygenLevel: number;
  averageTemperature: number;
  minHeartRate: number;
  maxHeartRate: number;
  trends: {
    heartRate: 'stable' | 'increasing' | 'decreasing';
    oxygenLevel: 'stable' | 'increasing' | 'decreasing';
    temperature: 'stable' | 'increasing' | 'decreasing';
  };
}

/**
 * Health Data API Service
 * Handles all health-related API calls
 */
export class HealthApiService {
  private static readonly BASE_PATH = '/health';

  /**
   * Get current health data from connected device
   */
  static async getCurrentData(deviceId?: string): Promise<HealthData> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const params = deviceId ? { deviceId } : undefined;
      const response: ApiResponse<HealthData> = await apiClient.get(
        `${this.BASE_PATH}/current`,
        { params }
      );
      return response.data;
    }, 'getCurrentData');
  }

  /**
   * Get historical health data with time range
   */
  static async getHistoricalData(
    startDate: string,
    endDate: string,
    metrics: string[] = ['heartRate', 'oxygenLevel', 'temperature']
  ): Promise<HistoricalData[]> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<HistoricalData[]> = await apiClient.get(
        `${this.BASE_PATH}/historical`,
        {
          params: {
            startDate,
            endDate,
            metrics: metrics.join(','),
          },
        }
      );
      return response.data;
    }, 'getHistoricalData');
  }

  /**
   * Get active health alerts
   */
  static async getActiveAlerts(): Promise<HealthAlert[]> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<HealthAlert[]> = await apiClient.get(
        `${this.BASE_PATH}/alerts/active`
      );
      return response.data;
    }, 'getActiveAlerts');
  }

  /**
   * Acknowledge a health alert
   */
  static async acknowledgeAlert(alertId: string): Promise<void> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      await apiClient.post(`${this.BASE_PATH}/alerts/${alertId}/acknowledge`);
    }, 'acknowledgeAlert');
  }

  /**
   * Get connected device information
   */
  static async getDeviceInfo(deviceId?: string): Promise<DeviceInfo> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const params = deviceId ? { deviceId } : undefined;
      const response: ApiResponse<DeviceInfo> = await apiClient.get(
        `${this.BASE_PATH}/device`,
        { params }
      );
      return response.data;
    }, 'getDeviceInfo');
  }

  /**
   * Get health statistics for a time period
   */
  static async getHealthStats(
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<HealthStats> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<HealthStats> = await apiClient.get(
        `${this.BASE_PATH}/stats`,
        { params: { period } }
      );
      return response.data;
    }, 'getHealthStats');
  }

  /**
   * Sync health data with server
   */
  static async syncData(data: Partial<HealthData>[]): Promise<void> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      await apiClient.post(`${this.BASE_PATH}/sync`, { data });
    }, 'syncData');
  }

  /**
   * Export health data for a time period
   */
  static async exportData(
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<Blob> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response = await apiClient.get(
        `${this.BASE_PATH}/export`,
        {
          params: { startDate, endDate, format },
          responseType: 'blob',
        }
      );
      return response.data;
    }, 'exportData');
  }

  /**
   * Set health data thresholds for alerts
   */
  static async setThresholds(thresholds: {
    heartRate?: { min: number; max: number };
    bloodPressureSystolic?: { min: number; max: number };
    bloodPressureDiastolic?: { min: number; max: number };
    oxygenLevel?: { min: number; max: number };
    temperature?: { min: number; max: number };
  }): Promise<void> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      await apiClient.post(`${this.BASE_PATH}/thresholds`, thresholds);
    }, 'setThresholds');
  }

  /**
   * Get current thresholds
   */
  static async getThresholds(): Promise<Record<string, { min: number; max: number }>> {
    return ApiErrorBoundary.withErrorHandling(async () => {
      const response: ApiResponse<Record<string, { min: number; max: number }>> = 
        await apiClient.get(`${this.BASE_PATH}/thresholds`);
      return response.data;
    }, 'getThresholds');
  }
}