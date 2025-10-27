import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { bluetoothManager, BluetoothDevice } from '../bluetooth/manager';
import { storage, STORAGE_CATEGORIES } from '../storage';
import { apiClient } from '../api/client';

// Types for WiFi connectivity
export interface WiFiConfiguration {
  ssid: string;
  password: string;
  security: 'WPA2' | 'WPA3' | 'WEP' | 'OPEN';
  priority: number;
  autoConnect: boolean;
  hidden: boolean;
  deviceId: string;
  lastConnected: Date;
}

export interface WiFiConnectionStatus {
  connected: boolean;
  ssid?: string;
  signalStrength: number;
  ipAddress?: string;
  subnetMask?: string;
  gateway?: string;
  dnsServers?: string[];
  lastSync?: Date;
  connectionSpeed?: number;
}

export interface WiFiDeviceInfo {
  deviceId: string;
  name: string;
  model: string;
  firmwareVersion: string;
  batteryLevel: number;
  wifiCapable: boolean;
  wifiConfigured: boolean;
  lastSeen: Date;
  connectionType: 'bluetooth' | 'wifi' | 'dual';
}

export interface ConnectionMetrics {
  bluetoothRSSI: number;
  wifiSignalStrength: number;
  bluetoothThroughput: number;
  wifiThroughput: number;
  bluetoothLatency: number;
  wifiLatency: number;
  batteryImpact: number;
}

export type ConnectionType = 'bluetooth' | 'wifi' | 'dual' | 'offline';
export type WiFiErrorType = 
  | 'connection_timeout'
  | 'authentication_failed'
  | 'network_not_found'
  | 'ip_address_failure'
  | 'dns_resolution_failed'
  | 'ssl_handshake_failed'
  | 'server_unreachable'
  | 'data_transmission_failed';

export interface WiFiEvents {
  onWiFiConfigured: (deviceId: string, config: WiFiConfiguration) => void;
  onWiFiConnected: (deviceId: string, status: WiFiConnectionStatus) => void;
  onWiFiDisconnected: (deviceId: string) => void;
  onConnectionTypeChanged: (type: ConnectionType) => void;
  onDataTransmitted: (deviceId: string, dataSize: number) => void;
  onError: (error: WiFiErrorType, message: string) => void;
  onMetricsUpdated: (metrics: ConnectionMetrics) => void;
}

/**
 * WiFi Manager Service
 * Handles all WiFi connectivity operations for IoT devices
 */
export class WiFiManager {
  private static instance: WiFiManager;
  private connectionStatus: WiFiConnectionStatus = {
    connected: false,
    signalStrength: 0,
  };
  private connectionType: ConnectionType = 'offline';
  private connectedDevices: Map<string, WiFiDeviceInfo> = new Map();
  private events: Partial<WiFiEvents> = {};
  private isMonitoring = false;
  private metrics: ConnectionMetrics = {
    bluetoothRSSI: 0,
    wifiSignalStrength: 0,
    bluetoothThroughput: 0,
    wifiThroughput: 0,
    bluetoothLatency: 0,
    wifiLatency: 0,
    batteryImpact: 0,
  };

  private constructor() {
    this.setupNetworkMonitoring();
    this.setupBluetoothIntegration();
  }

  static getInstance(): WiFiManager {
    if (!WiFiManager.instance) {
      WiFiManager.instance = new WiFiManager();
    }
    return WiFiManager.instance;
  }

  // Event management
  on<K extends keyof WiFiEvents>(event: K, callback: WiFiEvents[K]): void {
    this.events[event] = callback;
  }

  off<K extends keyof WiFiEvents>(event: K): void {
    delete this.events[event];
  }

  private emit<K extends keyof WiFiEvents>(event: K, ...args: Parameters<WiFiEvents[K]>): void {
    const callback = this.events[event];
    if (callback) {
      (callback as any)(...args);
    }
  }

  // Network monitoring
  private setupNetworkMonitoring(): void {
    this.isMonitoring = true;
    
    // Monitor general network connectivity
    NetInfo.addEventListener(state => {
      this.handleNetworkStateChange(state);
    });

    // Monitor WiFi-specific metrics
    this.startMetricsCollection();
  }

  private handleNetworkStateChange(state: any): void {
    const wasConnected = this.connectionStatus.connected;
    const isNowConnected = state.isConnected && state.type === 'wifi';

    if (isNowConnected !== wasConnected) {
      this.connectionStatus = {
        connected: isNowConnected,
        ssid: state.details?.ssid,
        signalStrength: this.calculateSignalStrength(state.details?.strength),
        ipAddress: state.details?.ipAddress,
        subnetMask: state.details?.subnet,
        gateway: state.details?.gateway,
        lastSync: isNowConnected ? new Date() : undefined,
      };

      this.updateConnectionType();
      this.emit('onConnectionTypeChanged', this.connectionType);
    }
  }

  private calculateSignalStrength(strength?: number): number {
    if (strength === undefined) return 0;
    // Convert signal strength to percentage (0-100)
    return Math.max(0, Math.min(100, (strength + 100) * 2));
  }

  // Bluetooth integration for WiFi configuration
  private setupBluetoothIntegration(): void {
    bluetoothManager.on('onDeviceConnected', (device) => {
      this.checkDeviceWiFiCapability(device);
    });

    bluetoothManager.on('onHealthDataReceived', (data) => {
      this.handleHealthDataFromDevice(data);
    });
  }

  private async checkDeviceWiFiCapability(device: any): Promise<void> {
    try {
      // Check if device supports WiFi configuration
      const deviceInfo: WiFiDeviceInfo = {
        deviceId: device.id,
        name: device.name,
        model: 'Smart Bracelet',
        firmwareVersion: '1.0.0',
        batteryLevel: device.batteryLevel || 0,
        wifiCapable: true, // Assume all devices are WiFi capable for now
        wifiConfigured: await this.isDeviceWiFiConfigured(device.id),
        lastSeen: new Date(),
        connectionType: 'bluetooth',
      };

      this.connectedDevices.set(device.id, deviceInfo);
      
      if (deviceInfo.wifiCapable && !deviceInfo.wifiConfigured) {
        // Device supports WiFi but not configured - prompt user
        this.emit('onWiFiConfigured', device.id, await this.getDefaultWiFiConfig(device.id));
      }
    } catch (error) {
      console.error('Error checking device WiFi capability:', error);
    }
  }

  // WiFi configuration methods
  async configureDeviceWiFi(deviceId: string, config: WiFiConfiguration): Promise<void> {
    try {
      // Store configuration securely
      await storage.storeData(STORAGE_CATEGORIES.SENSITIVE, `wifi_config_${deviceId}`, config);

      // Send configuration to device via Bluetooth
      await this.sendWiFiConfigViaBluetooth(deviceId, config);

      // Update device info
      const deviceInfo = this.connectedDevices.get(deviceId);
      if (deviceInfo) {
        deviceInfo.wifiConfigured = true;
        this.connectedDevices.set(deviceId, deviceInfo);
      }

      this.emit('onWiFiConfigured', deviceId, config);
    } catch (error) {
      console.error('Error configuring device WiFi:', error);
      this.emit('onError', 'data_transmission_failed', 'Failed to send WiFi configuration to device');
      throw error;
    }
  }

  private async sendWiFiConfigViaBluetooth(deviceId: string, config: WiFiConfiguration): Promise<void> {
    // This would send the WiFi configuration to the device via BLE
    // For now, we'll simulate this operation
    console.log(`Sending WiFi config to device ${deviceId}:`, config.ssid);
    
    // In a real implementation, you would:
    // 1. Write to a specific BLE characteristic for WiFi configuration
    // 2. Wait for device acknowledgment
    // 3. Handle any errors that occur during transmission
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate transmission
  }

  async getDeviceWiFiConfig(deviceId: string): Promise<WiFiConfiguration | null> {
    try {
      return await storage.getData<WiFiConfiguration>(STORAGE_CATEGORIES.SENSITIVE, `wifi_config_${deviceId}`);
    } catch (error) {
      console.error('Error retrieving WiFi configuration:', error);
      return null;
    }
  }

  private async getDefaultWiFiConfig(deviceId: string): Promise<WiFiConfiguration> {
    return {
      ssid: '',
      password: '',
      security: 'WPA2',
      priority: 1,
      autoConnect: true,
      hidden: false,
      deviceId,
      lastConnected: new Date(),
    };
  }

  private async isDeviceWiFiConfigured(deviceId: string): Promise<boolean> {
    const config = await this.getDeviceWiFiConfig(deviceId);
    return config !== null && config.ssid !== '';
  }

  // Connection management
  private updateConnectionType(): void {
    const bluetoothConnected = bluetoothManager.isConnected();
    const wifiConnected = this.connectionStatus.connected;

    if (bluetoothConnected && wifiConnected) {
      this.connectionType = 'dual';
    } else if (bluetoothConnected) {
      this.connectionType = 'bluetooth';
    } else if (wifiConnected) {
      this.connectionType = 'wifi';
    } else {
      this.connectionType = 'offline';
    }
  }

  async switchConnectionType(type: 'auto' | 'wifi' | 'bluetooth'): Promise<void> {
    // In auto mode, let the system decide based on conditions
    if (type === 'auto') {
      this.updateConnectionType();
      return;
    }

    // For manual selection, we can prioritize one connection type
    // This would involve adjusting data routing preferences
    console.log(`Switching to ${type} connection preference`);
  }

  // Data transmission
  private async handleHealthDataFromDevice(data: any): Promise<void> {
    // Route data based on current connection type and preferences
    if (this.connectionType === 'wifi' || this.connectionType === 'dual') {
      await this.transmitDataViaWiFi(data);
    }
    
    // Data is always available via Bluetooth context
    // The HealthDataContext will handle the final data processing
  }

  private async transmitDataViaWiFi(data: any): Promise<void> {
    try {
      // Simulate WiFi data transmission to cloud
      const dataSize = JSON.stringify(data).length;
      
      // In real implementation, this would send data to your cloud API
      // await apiClient.post('/health/data', data);
      
      console.log(`Transmitted ${dataSize} bytes via WiFi`);
      this.emit('onDataTransmitted', data.deviceId, dataSize);
    } catch (error) {
      console.error('Error transmitting data via WiFi:', error);
      this.emit('onError', 'data_transmission_failed', 'Failed to transmit data via WiFi');
      
      // Fallback to Bluetooth or queue for later transmission
      await this.handleTransmissionFailure(data);
    }
  }

  private async handleTransmissionFailure(data: any): Promise<void> {
    // Store data for later sync
    await storage.storeOfflineHealthData({
      deviceId: data.deviceId,
      measurements: [data],
      timestamp: Date.now(),
    });
  }

  // Metrics collection
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectConnectionMetrics();
    }, 5000); // Collect metrics every 5 seconds
  }

  private async collectConnectionMetrics(): Promise<void> {
    // Collect Bluetooth metrics
    const bluetoothDevice = bluetoothManager.getConnectedDevice();
    const bluetoothRSSI = bluetoothDevice?.rssi || 0;

    // Collect WiFi metrics from NetInfo
    const netInfo = await NetInfo.fetch();
    const wifiSignalStrength = this.calculateSignalStrength(netInfo.details?.strength);

    // Update metrics
    this.metrics = {
      bluetoothRSSI,
      wifiSignalStrength,
      bluetoothThroughput: this.calculateBluetoothThroughput(),
      wifiThroughput: this.calculateWiFiThroughput(),
      bluetoothLatency: this.calculateBluetoothLatency(),
      wifiLatency: this.calculateWiFiLatency(),
      batteryImpact: this.calculateBatteryImpact(),
    };

    this.emit('onMetricsUpdated', this.metrics);
  }

  private calculateBluetoothThroughput(): number {
    // Simulate throughput calculation
    return Math.random() * 100;
  }

  private calculateWiFiThroughput(): number {
    // Simulate throughput calculation
    return Math.random() * 500;
  }

  private calculateBluetoothLatency(): number {
    // Simulate latency calculation
    return Math.random() * 100;
  }

  private calculateWiFiLatency(): number {
    // Simulate latency calculation
    return Math.random() * 50;
  }

  private calculateBatteryImpact(): number {
    // Simulate battery impact calculation
    return (this.metrics.bluetoothThroughput * 0.1) + (this.metrics.wifiThroughput * 0.05);
  }

  // Public API methods
  getConnectionStatus(): WiFiConnectionStatus {
    return this.connectionStatus;
  }

  getConnectionType(): ConnectionType {
    return this.connectionType;
  }

  getConnectedDevices(): WiFiDeviceInfo[] {
    return Array.from(this.connectedDevices.values());
  }

  getConnectionMetrics(): ConnectionMetrics {
    return this.metrics;
  }

  async forceSync(): Promise<void> {
    // Sync any pending offline data
    const pendingData = await storage.getOfflineHealthData();
    if (pendingData.length > 0 && this.connectionStatus.connected) {
      // Attempt to sync all pending data
      for (const data of pendingData) {
        await this.transmitDataViaWiFi(data);
      }
    }
  }

  async cleanup(): Promise<void> {
    this.isMonitoring = false;
    this.connectedDevices.clear();
    this.events = {};
  }
}

// Export singleton instance
export const wifiManager = WiFiManager.getInstance();