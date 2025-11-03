import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Bluetooth, RefreshCw, CheckCircle } from 'lucide-react-native';
import { BluetoothDevice, bluetoothManager } from '@/services/bluetooth/manager';
import { bluetoothPermissions } from '@/services/bluetooth/permissions';
import colors from '@/constants/colors';

interface DeviceSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onDeviceSelected: (device: BluetoothDevice) => void;
}

export default function DeviceSelectionModal({
  visible,
  onClose,
  onDeviceSelected,
}: DeviceSelectionModalProps) {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null);
  const [connectingDevice, setConnectingDevice] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const checkPermissions = useCallback(async () => {
    try {
      const canProceed = await bluetoothPermissions.canProceedWithBluetooth();
      if (!canProceed.canProceed) {
        setPermissionError(canProceed.reason || 'Bluetooth permissions required');
        return false;
      }
      setPermissionError(null);
      return true;
    } catch (error) {
      setPermissionError('Error checking Bluetooth permissions');
      return false;
    }
  }, []);

  const startScanning = useCallback(async () => {
    try {
      const hasPermissions = await checkPermissions();
      if (!hasPermissions) {
        return;
      }

      setIsScanning(true);
      setDevices([]);
      setSelectedDevice(null);

      // Set up device discovery listener
      bluetoothManager.on('onDeviceDiscovered', (device: BluetoothDevice) => {
        setDevices(prev => {
          // Avoid duplicates
          if (prev.some(d => d.id === device.id)) {
            return prev;
          }
          return [...prev, device];
        });
      });

      // Set up error listener
      bluetoothManager.on('onError', (error: Error) => {
        console.error('Bluetooth error:', error);
        Alert.alert('Bluetooth Error', error.message);
      });

      await bluetoothManager.startScanning(15000); // Scan for 15 seconds

    } catch (error) {
      console.error('Error starting scan:', error);
      Alert.alert('Scan Error', 'Failed to start Bluetooth scanning');
      setIsScanning(false);
    }
  }, [checkPermissions]);

  const stopScanning = useCallback(async () => {
    try {
      await bluetoothManager.stopScanning();
      setIsScanning(false);
      // Remove listeners
      bluetoothManager.off('onDeviceDiscovered');
      bluetoothManager.off('onError');
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  }, []);

  const connectToDevice = useCallback(async (device: BluetoothDevice) => {
    try {
      setConnectingDevice(device.id);
      
      await bluetoothManager.connectToDevice(device.id);
      onDeviceSelected(device);
      onClose();
      
    } catch (error) {
      console.error('Error connecting to device:', error);
      Alert.alert('Connection Failed', 'Failed to connect to the selected device');
    } finally {
      setConnectingDevice(null);
    }
  }, [onDeviceSelected, onClose]);

  const handleDevicePress = useCallback((device: BluetoothDevice) => {
    setSelectedDevice(device);
    connectToDevice(device);
  }, [connectToDevice]);

  const handleClose = useCallback(() => {
    stopScanning();
    onClose();
  }, [stopScanning, onClose]);

  useEffect(() => {
    if (visible) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [visible, startScanning, stopScanning]);

  const renderDeviceItem = useCallback(({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity
      style={[
        styles.deviceItem,
        selectedDevice?.id === item.id && styles.deviceItemSelected,
        connectingDevice === item.id && styles.deviceItemConnecting,
      ]}
      onPress={() => handleDevicePress(item)}
      disabled={connectingDevice !== null}
    >
      <View style={styles.deviceInfo}>
        <Bluetooth size={20} color={colors.primary} />
        <View style={styles.deviceDetails}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceId}>{item.id}</Text>
          {item.rssi && (
            <Text style={styles.deviceRssi}>Signal: {item.rssi} dBm</Text>
          )}
        </View>
      </View>
      {connectingDevice === item.id ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : selectedDevice?.id === item.id ? (
        <CheckCircle size={20} color={colors.success} />
      ) : null}
    </TouchableOpacity>
  ), [selectedDevice, connectingDevice, handleDevicePress]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Bluetooth Device</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {permissionError && (
          <View style={styles.permissionError}>
            <Text style={styles.permissionErrorText}>{permissionError}</Text>
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={checkPermissions}
            >
              <Text style={styles.permissionButtonText}>Check Permissions</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.scanSection}>
          <View style={styles.scanHeader}>
            <Text style={styles.scanTitle}>
              Available Devices ({devices.length})
            </Text>
            <TouchableOpacity 
              onPress={startScanning} 
              style={styles.scanButton}
              disabled={isScanning}
            >
              <RefreshCw 
                size={20} 
                color={colors.primary} 
                style={isScanning && styles.scanningIcon}
              />
            </TouchableOpacity>
          </View>
          
          {isScanning && (
            <View style={styles.scanningIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.scanningText}>Scanning for devices...</Text>
            </View>
          )}
        </View>

        <FlatList
          data={devices}
          renderItem={renderDeviceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.deviceList}
          ListEmptyComponent={
            !isScanning ? (
              <View style={styles.emptyState}>
                <Bluetooth size={48} color={colors.textMuted} />
                <Text style={styles.emptyStateText}>
                  No devices found. Make sure your device is in pairing mode.
                </Text>
              </View>
            ) : null
          }
        />

        {connectingDevice && (
          <View style={styles.connectingOverlay}>
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={styles.connectingText}>Connecting to device...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  permissionError: {
    margin: 20,
    padding: 16,
    backgroundColor: colors.danger + '20',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  permissionErrorText: {
    fontSize: 14,
    color: colors.danger,
    marginBottom: 8,
  },
  permissionButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  scanSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  scanButton: {
    padding: 8,
  },
  scanningIcon: {
    transform: [{ rotate: '360deg' }],
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  scanningText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  deviceList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  deviceItemConnecting: {
    opacity: 0.7,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  deviceId: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  deviceRssi: {
    fontSize: 11,
    color: colors.textLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 200,
  },
  connectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  connectingText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});