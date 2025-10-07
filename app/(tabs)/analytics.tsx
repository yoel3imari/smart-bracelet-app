import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { Download, TrendingUp } from 'lucide-react-native';
import { useHealthData } from '@/contexts/HealthDataContext';
import colors from '@/constants/colors';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;
const CHART_HEIGHT = 200;

type TimeFilter = 'daily' | 'weekly' | 'monthly';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { historicalData } = useHealthData();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('daily');

  const filteredData = useMemo(() => {
    const now = new Date();
    let hoursBack = 24;
    
    if (timeFilter === 'weekly') hoursBack = 24 * 7;
    if (timeFilter === 'monthly') hoursBack = 24 * 30;

    const cutoff = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
    return historicalData.filter((d) => d.timestamp >= cutoff);
  }, [historicalData, timeFilter]);

  const renderChart = (
    data: number[],
    label: string,
    unit: string,
    color: string,
    minVal: number,
    maxVal: number
  ) => {
    if (data.length === 0) return null;

    const padding = 40;
    const chartWidth = CHART_WIDTH - padding * 2;
    const chartHeight = CHART_HEIGHT - padding * 2;

    const min = Math.min(...data, minVal);
    const max = Math.max(...data, maxVal);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y, value };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{label}</Text>
          <View style={styles.trendBadge}>
            <TrendingUp size={14} color={colors.success} />
            <Text style={styles.trendText}>Normal</Text>
          </View>
        </View>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <SvgLine
            x1={padding}
            y1={padding + chartHeight}
            x2={padding + chartWidth}
            y2={padding + chartHeight}
            stroke={colors.border}
            strokeWidth="1"
          />
          <SvgLine
            x1={padding}
            y1={padding}
            x2={padding}
            y2={padding + chartHeight}
            stroke={colors.border}
            strokeWidth="1"
          />
          <Path d={pathData} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <Circle key={index} cx={point.x} cy={point.y} r="4" fill={color} />
          ))}
          <SvgText x={padding - 30} y={padding + 5} fontSize="12" fill={colors.textMuted}>
            {max.toFixed(0)}
          </SvgText>
          <SvgText x={padding - 30} y={padding + chartHeight + 5} fontSize="12" fill={colors.textMuted}>
            {min.toFixed(0)}
          </SvgText>
        </Svg>
        <Text style={styles.chartUnit}>{unit}</Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <TouchableOpacity style={styles.exportButton}>
            <Download size={20} color={colors.primary} />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, timeFilter === 'daily' && styles.filterButtonActive]}
            onPress={() => setTimeFilter('daily')}
          >
            <Text style={[styles.filterText, timeFilter === 'daily' && styles.filterTextActive]}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, timeFilter === 'weekly' && styles.filterButtonActive]}
            onPress={() => setTimeFilter('weekly')}
          >
            <Text style={[styles.filterText, timeFilter === 'weekly' && styles.filterTextActive]}>Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, timeFilter === 'monthly' && styles.filterButtonActive]}
            onPress={() => setTimeFilter('monthly')}
          >
            <Text style={[styles.filterText, timeFilter === 'monthly' && styles.filterTextActive]}>Monthly</Text>
          </TouchableOpacity>
        </View>

        {renderChart(
          filteredData.map((d) => d.heartRate),
          'Heart Rate',
          'BPM',
          colors.heart,
          60,
          100
        )}

        {renderChart(
          filteredData.map((d) => d.oxygenLevel),
          'Oxygen Saturation',
          'SpO₂ %',
          colors.success,
          90,
          100
        )}

        {renderChart(
          filteredData.map((d) => d.temperature),
          'Body Temperature',
          '°C',
          colors.warning,
          36,
          38
        )}
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
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  exportText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.white,
  },
  chartCard: {
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.secondary,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.success,
  },
  chartUnit: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
