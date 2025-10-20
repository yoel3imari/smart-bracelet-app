
import { Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import { BleManager, Device, Characteristic, Service, State } from 'react-native-ble-plx';

// Types for Bluetooth devices and data
export interface BluetoothDevice {
  id: string;
  name: string;
  localName?: string;
  rssi?: number;
  manufacturerData?: Record<string, any>;
  serviceUUIDs?: string[];
  isConnectable?: boolean;
}

export interface ConnectedDevice extends BluetoothDevice {
  connected: boolean;
  services: BluetoothService[];
  characteristics: BluetoothCharacteristic[];
  batteryLevel?: number;
  firmwareVersion?: string;
  lastSeen: Date;
}

export interface BluetoothService {
  uuid: string;
  isPrimary: boolean;
  characteristics: BluetoothCharacteristic[];
}

export interface BluetoothCharacteristic {
  uuid: string;
  properties: {
    read: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
  };
  value?: ArrayBuffer;
  descriptors?: BluetoothDescriptor[];
}

export interface BluetoothDescriptor {
  uuid: string;
  value?: ArrayBuffer;
}

export interface HealthDataPacket {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  temperature: number;
  oxygenLevel: number;
  acceleration?: {
    x: number;
    y: number;
    z: number;
  };
  batteryLevel: number;
  timestamp: Date;
  deviceId: string;
}

// Service UUIDs for health monitoring devices
export const HEALTH_SERVICE_UUIDS = {
  HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
  BLOOD_PRESSURE: '00001810-0000-1000-8000-00805f9b34fb',
  TEMPERATURE: '00001809-0000-1000-8000-00805f9b34fb',
  OXYGEN_SATURATION: '00001822-0000-1000-8000-00805f9b34fb',
  BATTERY: '0000180f-0000-1000-8000-00805f9b34fb',
  DEVICE_INFO: '0000180a-0000-1000-8000-00805f9b34fb',
};

// Characteristic UUIDs
export const CHARACTERISTIC_UUIDS = {
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
  BLOOD_PRESSURE_MEASUREMENT: '00002a35-0000-1000-8000-00805f9b34fb',
  TEMPERATURE_MEASUREMENT: '00002a1c-0000-1000-8000-00805f9b34fb',
  OXYGEN_SATURATION: '00002a5e-0000-1000-8000-00805f9b34fb',
  BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
  FIRMWARE_REVISION: '00002a26-0000-1000-8000-00805f9b34fb',
  MANUFACTURER_NAME: '00002a29-0000-1000-8000-00805f9b34fb',
};

// Bluetooth connection states
export type ConnectionState = 
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

// Bluetooth manager events
export interface BluetoothEvents {
  onDeviceDiscovered: (device: BluetoothDevice) => void;
  onDeviceConnected: (device: ConnectedDevice) => void;
  onDeviceDisconnected: (deviceId: string) => void;
  onHealthDataReceived: (data: HealthDataPacket) => void;
  onConnectionStateChanged: (state: ConnectionState) => void;
  onError: (error: Error) => void;
}

/**
 * Main Bluetooth Manager Class
 * Handles all Bluetooth operations using react-native-ble-plx
 */
export class BluetoothManager {
  private static instance: BluetoothManager;
  private bleManager: BleManager;
  private connectionState: ConnectionState = 'disconnected';
  private connectedDevice: ConnectedDevice | null = null;
  private isScanning = false;
  private events: Partial<BluetoothEvents> = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private scanSubscription: any = null;
  private notificationSubscriptions: Map<string, any> = new Map();

  private constructor() {
    this.bleManager = new BleManager();
    this.setupBleManagerListeners();
  }

  static getInstance(): BluetoothManager {
    if (!BluetoothManager.instance) {
      BluetoothManager.instance = new BluetoothManager();
    }
    return BluetoothManager.instance;
  }

  private setupBleManagerListeners(): void {
    // Monitor Bluetooth state
    this.bleManager.onStateChange((state) => {
      console.log('Bluetooth state changed:', state);
      if (state === State.PoweredOff) {
        this.setConnectionState('error');
        this.emit('onError', new Error('Bluetooth is turned off'));
      }
    }, true);
  }

  // Event management
  on<K extends keyof BluetoothEvents>(event: K, callback: BluetoothEvents[K]): void {
    this.events[event] = callback;
  }

  off<K extends keyof BluetoothEvents>(event: K): void {
    delete this.events[event];
  }

  private emit<K extends keyof BluetoothEvents>(event: K, ...args: Parameters<BluetoothEvents[K]>): void {
    const callback = this.events[event];
    if (callback) {
      (callback as any)(...args);
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('onConnectionStateChanged', state);
    }
  }

  // Permission management
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Request Bluetooth permissions for Android
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        return Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // iOS permissions are handled by the system
        return true;
      }
    } catch (error) {
      console.error('Error requesting Bluetooth permissions:', error);
      this.emit('onError', error as Error);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        const results = await Promise.all(
          permissions.map(permission => PermissionsAndroid.check(permission))
        );

        return results.every(result => result);
      }
      return true;
    } catch (error) {
      console.error('Error checking Bluetooth permissions:', error);
      return false;
    }
  }

  // Device scanning
  async startScanning(timeout: number = 30000): Promise<void> {
    try {
      if (this.isScanning) {
        console.log('Bluetooth scanning already in progress');
        return;
      }

      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Bluetooth permissions not granted');
        }
      }

      this.setConnectionState('scanning');
      this.isScanning = true;

      // Start scanning for health monitoring devices
      this.scanSubscription = this.bleManager.startDeviceScan(
        Object.values(HEALTH_SERVICE_UUIDS),
        null,
        (error, device) => {
          if (error) {
            console.error('Error during device scan:', error);
            this.setConnectionState('error');
            this.emit('onError', error);
            return;
          }

          if (device) {
            const bluetoothDevice: BluetoothDevice = {
              id: device.id,
              name: device.name || 'Unknown Device',
              localName: device.localName || undefined,
              rssi: device.rssi || undefined,
              manufacturerData: device.manufacturerData ? JSON.parse(device.manufacturerData) : undefined,
              serviceUUIDs: device.serviceUUIDs || undefined,
              isConnectable: device.isConnectable || undefined,
            };

            this.emit('onDeviceDiscovered', bluetoothDevice);
          }
        }
      );

      // Set scan timeout
      setTimeout(() => {
        this.stopScanning();
      }, timeout);

    } catch (error) {
      console.error('Error starting Bluetooth scan:', error);
      this.setConnectionState('error');
      this.emit('onError', error as Error);
      throw error;
    }
  }

  async stopScanning(): Promise<void> {
    try {
      if (this.scanSubscription) {
        this.bleManager.stopDeviceScan();
        this.scanSubscription = null;
      }

      this.isScanning = false;

      if (this.connectionState === 'scanning') {
        this.setConnectionState('disconnected');
      }
    } catch (error) {
      console.error('Error stopping Bluetooth scan:', error);
      this.emit('onError', error as Error);
    }
  }

  // Device connection
  async connectToDevice(deviceId: string): Promise<ConnectedDevice> {
    try {
      this.setConnectionState('connecting');

      // Connect to the device
      const device = await this.bleManager.connectToDevice(deviceId);
      
      // Discover services and characteristics
      await device.discoverAllServicesAndCharacteristics();

      // Get services and characteristics
      const services = await device.services();
      
      // Get characteristics for each service
      const allCharacteristics: Characteristic[] = [];
      for (const service of services) {
        const serviceCharacteristics = await device.characteristicsForService(service.uuid);
        allCharacteristics.push(...serviceCharacteristics);
      }

      const connectedDevice: ConnectedDevice = {
        id: device.id,
        name: device.name || 'Health Monitor',
        connected: true,
        services: await Promise.all(
          services.map(async (service: Service) => ({
            uuid: service.uuid,
            isPrimary: service.isPrimary,
            characteristics: allCharacteristics
              .filter((char: Characteristic) => char.serviceUUID === service.uuid)
              .map((char: Characteristic) => ({
                uuid: char.uuid,
                properties: {
                  read: char.isReadable,
                  write: char.isWritableWithResponse || char.isWritableWithoutResponse,
                  notify: char.isNotifiable,
                  indicate: char.isIndicatable,
                },
                value: char.value ? this.base64ToArrayBuffer(char.value) : undefined,
              })),
          }))
        ),
        characteristics: allCharacteristics.map((char: Characteristic) => ({
          uuid: char.uuid,
          properties: {
            read: char.isReadable,
            write: char.isWritableWithResponse || char.isWritableWithoutResponse,
            notify: char.isNotifiable,
            indicate: char.isIndicatable,
          },
          value: char.value ? this.base64ToArrayBuffer(char.value) : undefined,
        })),
        lastSeen: new Date(),
      };

      this.connectedDevice = connectedDevice;
      this.setConnectionState('connected');
      this.reconnectAttempts = 0;

      // Set up notifications for health data
      await this.setupHealthDataNotifications(device);

      this.emit('onDeviceConnected', connectedDevice);
      return connectedDevice;

    } catch (error) {
      console.error('Error connecting to Bluetooth device:', error);
      this.setConnectionState('error');
      this.emit('onError', error as Error);
      throw error;
    }
  }

  async disconnectFromDevice(): Promise<void> {
    try {
      if (!this.connectedDevice) {
        return;
      }

      this.setConnectionState('disconnecting');

      // Remove all notification subscriptions
      this.notificationSubscriptions.forEach((subscription, key) => {
        subscription.remove();
      });
      this.notificationSubscriptions.clear();

      const deviceId = this.connectedDevice.id;
      await this.bleManager.cancelDeviceConnection(deviceId);
      
      this.connectedDevice = null;
      this.setConnectionState('disconnected');

      this.emit('onDeviceDisconnected', deviceId);

    } catch (error) {
      console.error('Error disconnecting from Bluetooth device:', error);
      this.setConnectionState('error');
      this.emit('onError', error as Error);
      throw error;
    }
  }

  // Data handling
  private async setupHealthDataNotifications(device: Device): Promise<void> {
    try {
      // Set up notifications for heart rate
      const heartRateSubscription = device.monitorCharacteristicForService(
        HEALTH_SERVICE_UUIDS.HEART_RATE,
        CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT,
        (error, characteristic) => {
          if (error) {
            console.error('Error monitoring heart rate:', error);
            return;
          }
          if (characteristic) {
            this.handleCharacteristicValue(characteristic);
          }
        }
      );

      this.notificationSubscriptions.set('heart_rate', heartRateSubscription);

    } catch (error) {
      console.error('Error setting up health data notifications:', error);
      this.emit('onError', error as Error);
    }
  }

  private handleCharacteristicValue(characteristic: Characteristic): void {
    try {
      const value = characteristic.value;
      if (!value) return;

      const arrayBuffer = this.base64ToArrayBuffer(value);
      let healthData: Partial<HealthDataPacket> = {};

      switch (characteristic.uuid) {
        case CHARACTERISTIC_UUIDS.HEART_RATE_MEASUREMENT:
          healthData.heartRate = this.parseHeartRate(arrayBuffer);
          break;
        case CHARACTERISTIC_UUIDS.BLOOD_PRESSURE_MEASUREMENT:
          const bp = this.parseBloodPressure(arrayBuffer);
          healthData.bloodPressureSystolic = bp.systolic;
          healthData.bloodPressureDiastolic = bp.diastolic;
          break;
        case CHARACTERISTIC_UUIDS.TEMPERATURE_MEASUREMENT:
          healthData.temperature = this.parseTemperature(arrayBuffer);
          break;
        case CHARACTERISTIC_UUIDS.OXYGEN_SATURATION:
          healthData.oxygenLevel = this.parseOxygenSaturation(arrayBuffer);
          break;
        case CHARACTERISTIC_UUIDS.BATTERY_LEVEL:
          healthData.batteryLevel = this.parseBatteryLevel(arrayBuffer);
          break;
      }

      // Only emit if we have meaningful data
      if (Object.keys(healthData).length > 0) {
        const packet: HealthDataPacket = {
          heartRate: healthData.heartRate || 0,
          bloodPressureSystolic: healthData.bloodPressureSystolic || 0,
          bloodPressureDiastolic: healthData.bloodPressureDiastolic || 0,
          temperature: healthData.temperature || 0,
          oxygenLevel: healthData.oxygenLevel || 0,
          batteryLevel: healthData.batteryLevel || 0,
          timestamp: new Date(),
          deviceId: this.connectedDevice?.id || '',
        };

        this.emit('onHealthDataReceived', packet);
      }

    } catch (error) {
      console.error('Error handling characteristic value:', error);
      this.emit('onError', error as Error);
    }
  }

  // Utility functions
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Data parsing utilities
  private parseHeartRate(data: ArrayBuffer): number {
    // Heart rate measurement format according to Bluetooth spec
    const view = new DataView(data);
    const flags = view.getUint8(0);
    const is16Bit = (flags & 0x01) !== 0;
    
    if (is16Bit) {
      return view.getUint16(1, true);
    } else {
      return view.getUint8(1);
    }
  }

  private parseBloodPressure(data: ArrayBuffer): { systolic: number; diastolic: number } {
    const view = new DataView(data);
    const flags = view.getUint8(0);
    const systolic = view.getUint16(1, true) / 10; // Convert to mmHg
    const diastolic = view.getUint16(3, true) / 10; // Convert to mmHg
    
    return { systolic, diastolic };
  }

  private parseTemperature(data: ArrayBuffer): number {
    const view = new DataView(data);
    const temp = view.getInt32(0, true) / 100; // Convert to Celsius
    return temp;
  }

  private parseOxygenSaturation(data: ArrayBuffer): number {
    const view = new DataView(data);
    return view.getUint8(0); // Percentage
  }

  private parseBatteryLevel(data: ArrayBuffer): number {
    const view = new DataView(data);
    return view.getUint8(0); // Percentage
  }

  // Reconnection logic
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.setConnectionState('disconnected');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    try {
      if (this.connectedDevice) {
        await this.connectToDevice(this.connectedDevice.id);
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
      // Schedule next reconnection attempt with exponential backoff
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      this.reconnectTimeout = setTimeout(() => {
        this.attemptReconnect();
      }, delay) as unknown as NodeJS.Timeout;
    }
  }

  // Public methods
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getConnectedDevice(): ConnectedDevice | null {
    return this.connectedDevice;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && this.connectedDevice !== null;
  }

  async cleanup(): Promise<void> {
    try {
      await this.stopScanning();
      await this.disconnectFromDevice();
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Remove all listeners
      this.events = {};
    } catch (error) {
      console.error('Error during Bluetooth cleanup:', error);
    }
  }
}

// Export singleton instance
export const bluetoothManager = BluetoothManager.getInstance();
