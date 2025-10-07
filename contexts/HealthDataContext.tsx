import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';

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
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [hasAlerts, setHasAlerts] = useState<boolean>(false);
  const [currentData, setCurrentData] = useState<HealthData>({
    heartRate: 72,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    temperature: 36.6,
    oxygenLevel: 98,
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

  useEffect(() => {
    const generateHistoricalData = () => {
      const data: HistoricalData[] = [];
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        data.push({
          timestamp,
          heartRate: 65 + Math.random() * 20,
          oxygenLevel: 95 + Math.random() * 4,
          temperature: 36.2 + Math.random() * 1.2,
        });
      }
      setHistoricalData(data);
    };

    generateHistoricalData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentData((prev) => ({
        heartRate: Math.max(60, Math.min(100, prev.heartRate + (Math.random() - 0.5) * 4)),
        bloodPressureSystolic: Math.max(110, Math.min(140, prev.bloodPressureSystolic + (Math.random() - 0.5) * 3)),
        bloodPressureDiastolic: Math.max(70, Math.min(90, prev.bloodPressureDiastolic + (Math.random() - 0.5) * 2)),
        temperature: Math.max(36.0, Math.min(37.5, prev.temperature + (Math.random() - 0.5) * 0.2)),
        oxygenLevel: Math.max(95, Math.min(100, prev.oxygenLevel + (Math.random() - 0.5) * 1)),
        lastUpdated: new Date(),
      }));

      if (Math.random() > 0.95) {
        setHasAlerts(true);
        setTimeout(() => setHasAlerts(false), 5000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const refreshData = useCallback(() => {
    console.log('Refreshing health data...');
    setCurrentData((prev) => ({
      ...prev,
      lastUpdated: new Date(),
    }));
  }, []);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleConnection = useCallback(() => {
    setIsConnected((prev) => !prev);
  }, []);

  return useMemo(
    () => ({
      isConnected,
      hasAlerts,
      currentData,
      historicalData,
      userProfile,
      refreshData,
      updateUserProfile,
      toggleConnection,
    }),
    [isConnected, hasAlerts, currentData, historicalData, userProfile, refreshData, updateUserProfile, toggleConnection]
  );
});
