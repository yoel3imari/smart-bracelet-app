import { Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';

/**
 * Bluetooth Permission Service
 * Handles platform-specific Bluetooth permission requests and checks
 */
export class BluetoothPermissions {
  /**
   * Check if Bluetooth is available and enabled on the device
   * Note: react-native-ble-plx handles Bluetooth state internally
   */
  static async isBluetoothAvailable(): Promise<boolean> {
    try {
      // react-native-ble-plx will handle Bluetooth state checking
      // We'll assume it's available and handle errors during operations
      return true;
    } catch (error) {
      console.error('Error checking Bluetooth availability:', error);
      return false;
    }
  }

  /**
   * Request all necessary Bluetooth permissions for the platform
   */
  static async requestAllPermissions(): Promise<{
    granted: boolean;
    permissions: Record<string, boolean>;
  }> {
    try {
      const permissions: Record<string, boolean> = {};

      if (Platform.OS === 'android') {
        // Android 12+ requires these permissions
        const androidPermissions = [
          {
            name: PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            description: 'Allow app to scan for Bluetooth devices',
          },
          {
            name: PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            description: 'Allow app to connect to Bluetooth devices',
          },
          {
            name: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            description: 'Allow app to access location for Bluetooth scanning',
          },
        ];

        for (const permission of androidPermissions) {
          try {
            const granted = await PermissionsAndroid.request(permission.name, {
              title: 'Bluetooth Permissions',
              message: permission.description,
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            });
            
            permissions[permission.name] = granted === PermissionsAndroid.RESULTS.GRANTED;
          } catch (error) {
            console.error(`Error requesting permission ${permission.name}:`, error);
            permissions[permission.name] = false;
          }
        }

        // Check if all required permissions are granted
        const allGranted = Object.values(permissions).every(granted => granted);
        return { granted: allGranted, permissions };

      } else {
        // iOS handles permissions through system prompts
        // We'll request permission when needed and handle the result
        permissions['bluetooth'] = true; // iOS doesn't have granular Bluetooth permissions
        return { granted: true, permissions };
      }

    } catch (error) {
      console.error('Error requesting Bluetooth permissions:', error);
      return { granted: false, permissions: {} };
    }
  }

  /**
   * Check if all required Bluetooth permissions are granted
   */
  static async checkAllPermissions(): Promise<{
    granted: boolean;
    permissions: Record<string, boolean>;
  }> {
    try {
      const permissions: Record<string, boolean> = {};

      if (Platform.OS === 'android') {
        const androidPermissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        for (const permission of androidPermissions) {
          try {
            const hasPermission = await PermissionsAndroid.check(permission);
            permissions[permission] = hasPermission;
          } catch (error) {
            console.error(`Error checking permission ${permission}:`, error);
            permissions[permission] = false;
          }
        }

        const allGranted = Object.values(permissions).every(granted => granted);
        return { granted: allGranted, permissions };

      } else {
        // iOS: Assume permissions are granted unless we encounter errors
        permissions['bluetooth'] = true;
        return { granted: true, permissions };
      }

    } catch (error) {
      console.error('Error checking Bluetooth permissions:', error);
      return { granted: false, permissions: {} };
    }
  }

  /**
   * Enable Bluetooth on the device (Android only)
   * Note: react-native-ble-plx handles Bluetooth enabling internally
   */
  static async enableBluetooth(): Promise<boolean> {
    try {
      // react-native-ble-plx will prompt user to enable Bluetooth if needed
      return true;
    } catch (error) {
      console.error('Error enabling Bluetooth:', error);
      return false;
    }
  }

  /**
   * Get permission status with detailed information
   */
  static async getPermissionStatus(): Promise<{
    bluetoothAvailable: boolean;
    bluetoothEnabled: boolean;
    permissionsGranted: boolean;
    missingPermissions: string[];
    platform: string;
  }> {
    try {
      const bluetoothAvailable = await this.isBluetoothAvailable();
      const permissionCheck = await this.checkAllPermissions();

      const missingPermissions = Object.entries(permissionCheck.permissions)
        .filter(([_, granted]) => !granted)
        .map(([permission]) => permission);

      return {
        bluetoothAvailable,
        bluetoothEnabled: bluetoothAvailable, // For simplicity, assume available means enabled
        permissionsGranted: permissionCheck.granted,
        missingPermissions,
        platform: Platform.OS,
      };
    } catch (error) {
      console.error('Error getting permission status:', error);
      return {
        bluetoothAvailable: false,
        bluetoothEnabled: false,
        permissionsGranted: false,
        missingPermissions: [],
        platform: Platform.OS,
      };
    }
  }

  /**
   * Show permission guidance based on platform and missing permissions
   */
  static getPermissionGuidance(missingPermissions: string[]): {
    title: string;
    message: string;
    steps: string[];
  } {
    if (Platform.OS === 'android') {
      return {
        title: 'Bluetooth Permissions Required',
        message: 'To connect to your health monitoring device, we need the following permissions:',
        steps: [
          'Bluetooth Scan: To discover nearby devices',
          'Bluetooth Connect: To establish connection with your device',
          'Location: Required for Bluetooth device discovery on Android',
          'Please grant these permissions in the next screen',
        ],
      };
    } else {
      return {
        title: 'Bluetooth Access Required',
        message: 'To connect to your health monitoring device, we need Bluetooth access.',
        steps: [
          'Make sure Bluetooth is enabled in Settings',
          'Allow Bluetooth access when prompted',
          'Your device will appear in the list once connected',
        ],
      };
    }
  }

  /**
   * Check if we can proceed with Bluetooth operations
   */
  static async canProceedWithBluetooth(): Promise<{
    canProceed: boolean;
    reason?: string;
    needsPermissions: boolean;
    needsBluetoothEnabled: boolean;
  }> {
    try {
      const status = await this.getPermissionStatus();

      if (!status.bluetoothAvailable) {
        return {
          canProceed: false,
          reason: 'Bluetooth is not available on this device',
          needsPermissions: false,
          needsBluetoothEnabled: false,
        };
      }

      if (!status.permissionsGranted) {
        return {
          canProceed: false,
          reason: 'Bluetooth permissions are required',
          needsPermissions: true,
          needsBluetoothEnabled: false,
        };
      }

      if (!status.bluetoothEnabled) {
        return {
          canProceed: false,
          reason: 'Bluetooth is not enabled',
          needsPermissions: false,
          needsBluetoothEnabled: true,
        };
      }

      return {
        canProceed: true,
        needsPermissions: false,
        needsBluetoothEnabled: false,
      };

    } catch (error) {
      console.error('Error checking Bluetooth readiness:', error);
      return {
        canProceed: false,
        reason: 'Unable to check Bluetooth status',
        needsPermissions: false,
        needsBluetoothEnabled: false,
      };
    }
  }
}

// Export singleton utility functions
export const bluetoothPermissions = {
  isBluetoothAvailable: BluetoothPermissions.isBluetoothAvailable,
  requestAllPermissions: BluetoothPermissions.requestAllPermissions,
  checkAllPermissions: BluetoothPermissions.checkAllPermissions,
  enableBluetooth: BluetoothPermissions.enableBluetooth,
  getPermissionStatus: BluetoothPermissions.getPermissionStatus,
  getPermissionGuidance: BluetoothPermissions.getPermissionGuidance,
  canProceedWithBluetooth: BluetoothPermissions.canProceedWithBluetooth,
};