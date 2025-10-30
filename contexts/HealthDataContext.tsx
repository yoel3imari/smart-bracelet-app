import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { HealthDataPacket, bluetoothManager } from '@/services/bluetooth/manager';

export interface HealthData {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  temperature: number;
  oxygenLevel: number;
  lastUpdated: Date;
}

export interface HistoricalData {
  timestamp: Date;
  heartRate: number;
  oxygenLevel: number;
  temperature: number;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  photoUrl: string;
  bloodType: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
}

export const [HealthDataProvider, useHealthData] = createContextHook(() => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [hasAlerts, setHasAlerts] = useState<boolean>(false);
  const [currentData, setCurrentData] = useState<HealthData>({
    heartRate: 0,
    bloodPressureSystolic: 0,
    bloodPressureDiastolic: 0,
    temperature: 0,
    oxygenLevel: 0,
    lastUpdated: new Date(),
  });

  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Sarah Johnson',
    age: 32,
    gender: 'Female',
    photoUrl: 'https://i.pravatar.cc/150?img=47',
    bloodType: 'A+',
    conditions: ['Hypertension', 'Asthma'],
    allergies: ['Penicillin', 'Peanuts'],
    medications: ['Lisinopril 10mg', 'Albuterol inhaler'],
  });

  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);

  // Initialize Bluetooth manager listeners
  useEffect(() => {
    // Listen for connection state changes
    bluetoothManager.on('onConnectionStateChanged', (state) => {
      setIsConnected(state === 'connected');
    });

    // Listen for health data updates
    bluetoothManager.on('onHealthDataReceived', (data: HealthDataPacket) => {
      setCurrentData({
        heartRate: data.heartRate,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        temperature: data.temperature,
        oxygenLevel: data.oxygenLevel,
        lastUpdated: data.timestamp,
      });

      // Add to historical data
      setHistoricalData(prev => {
        const newData = [...prev];
        newData.push({
          timestamp: data.timestamp,
          heartRate: data.heartRate,
          oxygenLevel: data.oxygenLevel,
          temperature: data.temperature,
        });
        
        // Keep only last 24 hours of data
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return newData.filter(item => item.timestamp > twentyFourHoursAgo);
      });

      // Check for alerts based on health data
      checkForAlerts(data);
    });

    // Listen for device connection
    bluetoothManager.on('onDeviceConnected', (device) => {
      setConnectedDevice(device.id);
      setIsConnected(true);
    });

    // Listen for device disconnection
    bluetoothManager.on('onDeviceDisconnected', (deviceId) => {
      setConnectedDevice(null);
      setIsConnected(false);
      setHasAlerts(false);
    });

    // Check initial connection state
    setIsConnected(bluetoothManager.isConnected());

    return () => {
      // Clean up listeners
      bluetoothManager.off('onConnectionStateChanged');
      bluetoothManager.off('onHealthDataReceived');
      bluetoothManager.off('onDeviceConnected');
      bluetoothManager.off('onDeviceDisconnected');
    };
  }, []);

  const checkForAlerts = useCallback((data: HealthDataPacket) => {
    const alerts = [];
    
    if (data.heartRate < 60 || data.heartRate > 100) {
      alerts.push('Abnormal heart rate detected');
    }
    
    if (data.bloodPressureSystolic > 140 || data.bloodPressureDiastolic > 90) {
      alerts.push('High blood pressure detected');
    }
    
    if (data.temperature < 36.0 || data.temperature > 37.5) {
      alerts.push('Abnormal body temperature');
    }
    
    if (data.oxygenLevel < 95) {
      alerts.push('Low oxygen saturation');
    }

    if (alerts.length > 0) {
      setHasAlerts(true);
      // Auto-clear alerts after 10 seconds
      setTimeout(() => setHasAlerts(false), 10000);
    }
  }, []);

  const refreshData = useCallback(() => {
    console.log('Refreshing health data...');
    // In a real implementation, this would trigger a manual read from the device
    // For now, we'll just update the timestamp
    setCurrentData(prev => ({
      ...prev,
      lastUpdated: new Date(),
    }));
  }, []);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleConnection = useCallback(async () => {
    if (isConnected) {
      // Disconnect from current device
      try {
        await bluetoothManager.disconnectFromDevice();
      } catch (error) {
        console.error('Error disconnecting device:', error);
      }
    } else {
      // Connection is handled through the device selection modal
      console.log('Use device selection modal to connect');
    }
  }, [isConnected]);

  const connectToDevice = useCallback(async (deviceId: string) => {
    try {
      await bluetoothManager.connectToDevice(deviceId);
    } catch (error) {
      console.error('Error connecting to device:', error);
      throw error;
    }
  }, []);

  const disconnectFromDevice = useCallback(async () => {
    try {
      await bluetoothManager.disconnectFromDevice();
    } catch (error) {
      console.error('Error disconnecting from device:', error);
      throw error;
    }
  }, []);

  return useMemo(
    () => ({
      isConnected,
      hasAlerts,
      currentData,
      historicalData,
      userProfile,
      connectedDevice,
      refreshData,
      updateUserProfile,
      toggleConnection,
      connectToDevice,
      disconnectFromDevice,
    }),
    [
      isConnected,
      hasAlerts,
      currentData,
      historicalData,
      userProfile,
      connectedDevice,
      refreshData,
      updateUserProfile,
      toggleConnection,
      connectToDevice,
      disconnectFromDevice,
    ]
  );
});
