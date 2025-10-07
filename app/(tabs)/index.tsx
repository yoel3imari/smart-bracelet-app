import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Heart, Activity, Thermometer, Droplet, RefreshCw, Bell, User } from 'lucide-react-native';
import { useHealthData } from '@/contexts/HealthDataContext';
import colors from '@/constants/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isConnected, hasAlerts, currentData, refreshData } = useHealthData();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const heartBeatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );

    const heartBeat = Animated.loop(
      Animated.sequence([
        Animated.timing(heartBeatAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartBeatAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartBeatAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartBeatAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    heartBeat.start();

    return () => {
      pulse.stop();
      heartBeat.stop();
    };
  }, [pulseAnim, heartBeatAnim]);

  const heartScale = heartBeatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
            <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
          </View>
          <View style={styles.headerRight}>
            {hasAlerts && (
              <View style={styles.alertBadge}>
                <Bell size={20} color={colors.white} />
              </View>
            )}
            <TouchableOpacity style={styles.iconButton}>
              <User size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.anomalySection}>
          <View style={styles.anomalyHeader}>
            <Text style={styles.anomalyTitle}>Health Status</Text>
            <TouchableOpacity onPress={refreshData} style={styles.refreshButton}>
              <RefreshCw size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.anomalyText}>All vitals within normal range</Text>
        </View>

        <View style={styles.heartSection}>
          <Animated.View
            style={[
              styles.heartContainer,
              {
                transform: [{ scale: Animated.multiply(pulseAnim, heartScale) }],
              },
            ]}
          >
            <View style={styles.heartGlow} />
            <Heart size={120} color={colors.heart} fill={colors.heart} />
            <View style={styles.bpmBadge}>
              <Text style={styles.bpmText}>{Math.round(currentData.heartRate)}</Text>
              <Text style={styles.bpmLabel}>BPM</Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.secondary }]}>
              <Activity size={24} color={colors.primary} />
            </View>
            <Text style={styles.statLabel}>Blood Pressure</Text>
            <Text style={styles.statValue}>
              {Math.round(currentData.bloodPressureSystolic)}/{Math.round(currentData.bloodPressureDiastolic)}
            </Text>
            <Text style={styles.statUnit}>mmHg</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF4E6' }]}>
              <Thermometer size={24} color={colors.warning} />
            </View>
            <Text style={styles.statLabel}>Temperature</Text>
            <Text style={styles.statValue}>{currentData.temperature.toFixed(1)}</Text>
            <Text style={styles.statUnit}>°C</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E8F8F5' }]}>
              <Droplet size={24} color={colors.success} />
            </View>
            <Text style={styles.statLabel}>Oxygen</Text>
            <Text style={styles.statValue}>{Math.round(currentData.oxygenLevel)}</Text>
            <Text style={styles.statUnit}>%</Text>
          </View>

          <View style={[styles.statCard, styles.placeholderCard]}>
            <Text style={styles.placeholderText}>+</Text>
            <Text style={styles.placeholderLabel}>Add Metric</Text>
          </View>
        </View>

        <View style={styles.lastUpdated}>
          <Text style={styles.lastUpdatedText}>
            Last updated: {currentData.lastUpdated.toLocaleTimeString()}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connected: {
    backgroundColor: colors.success,
  },
  disconnected: {
    backgroundColor: colors.danger,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600' as const,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertBadge: {
    backgroundColor: colors.danger,
    borderRadius: 20,
    padding: 8,
  },
  iconButton: {
    padding: 8,
  },
  anomalySection: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  anomalyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  anomalyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  refreshButton: {
    padding: 4,
  },
  anomalyText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '500' as const,
  },
  heartSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  heartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.heartPulse,
    opacity: 0.2,
  },
  bpmBadge: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  bpmText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  bpmLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600' as const,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500' as const,
  },
  placeholderCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed' as const,
    backgroundColor: 'transparent',
  },
  placeholderText: {
    fontSize: 32,
    color: colors.textMuted,
    fontWeight: '300' as const,
  },
  placeholderLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  lastUpdated: {
    alignItems: 'center',
    marginTop: 24,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
