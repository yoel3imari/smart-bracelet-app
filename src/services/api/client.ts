import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Environment configuration
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'https://api.medband.example.com';
const API_TIMEOUT = 30000; // 30 seconds

// Custom error classes
export class NetworkError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ServerError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ServerError';
  }
}

// Request configuration interface
interface ApiRequestConfig extends AxiosRequestConfig {
  retryCount?: number;
  requireAuth?: boolean;
}

// Response wrapper
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

// Extended config for retry requests
interface RetryRequestConfig extends ApiRequestConfig {
  method: string;
  url: string;
  data?: any;
}

class ApiClient {
  private client: AxiosInstance;
  private retryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryCondition: (error: any) => {
      // Retry on network errors or 5xx status codes
      return !error.response || (error.response.status >= 500 && error.response.status < 600);
    },
  };

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config: AxiosRequestConfig) => {
        const apiConfig = config as ApiRequestConfig;
        
        // Add auth token if required
        if (apiConfig.requireAuth !== false) {
          const token = await SecureStore.getItemAsync('auth_token');
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Add request ID for tracking
        config.headers = config.headers || {};
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Log request in development
        if (__DEV__) {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
        }

        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (__DEV__) {
          console.log(`✅ API Response: ${response.status} ${response.config.url}`, response.data);
        }

        return response;
      },
      async (error: any) => {
        // Log error in development
        if (__DEV__) {
          console.log(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
        }

        // Handle authentication errors
        if (error.response?.status === 401) {
          await this.handleAuthError();
        }

        return Promise.reject(this.transformError(error));
      }
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private transformError(error: any): Error {
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      return new NetworkError('Network connection failed. Please check your internet connection.');
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        return new ValidationError(
          data?.message || 'Invalid request data',
          data?.fieldErrors
        );
      case 401:
        return new AuthError(data?.message || 'Authentication required');
      case 403:
        return new AuthError(data?.message || 'Access denied');
      case 404:
        return new NetworkError(data?.message || 'Resource not found', status);
      case 422:
        return new ValidationError(
          data?.message || 'Validation failed',
          data?.fieldErrors
        );
      case 429:
        return new NetworkError('Too many requests. Please try again later.', status);
      case 500:
      case 502:
      case 503:
        return new ServerError(data?.message || 'Server error occurred', status);
      default:
        return new NetworkError(data?.message || 'An unexpected error occurred', status);
    }
  }

  private async handleAuthError() {
    // Clear stored tokens
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    
    // TODO: Navigate to login screen or show auth modal
    console.warn('Authentication failed. User should be redirected to login.');
  }

  private async retryRequest(
    config: RetryRequestConfig,
    retryCount: number = 0
  ): Promise<AxiosResponse> {
    try {
      return await this.client.request(config);
    } catch (error) {
      if (
        retryCount < this.retryConfig.maxRetries &&
        this.retryConfig.retryCondition(error)
      ) {
        await new Promise(resolve => setTimeout(resolve, this.retryConfig.retryDelay * (retryCount + 1)));
        return this.retryRequest(config, retryCount + 1);
      }
      throw error;
    }
  }

  // Public API methods
  async get<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.retryRequest({ ...config, method: 'GET', url } as RetryRequestConfig);
    return {
      data: response.data,
      status: response.status,
      message: response.data?.message,
    };
  }

  async post<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.retryRequest({ ...config, method: 'POST', url, data } as RetryRequestConfig);
    return {
      data: response.data,
      status: response.status,
      message: response.data?.message,
    };
  }

  async put<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.retryRequest({ ...config, method: 'PUT', url, data } as RetryRequestConfig);
    return {
      data: response.data,
      status: response.status,
      message: response.data?.message,
    };
  }

  async patch<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.retryRequest({ ...config, method: 'PATCH', url, data } as RetryRequestConfig);
    return {
      data: response.data,
      status: response.status,
      message: response.data?.message,
    };
  }

  async delete<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.retryRequest({ ...config, method: 'DELETE', url } as RetryRequestConfig);
    return {
      data: response.data,
      status: response.status,
      message: response.data?.message,
    };
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();