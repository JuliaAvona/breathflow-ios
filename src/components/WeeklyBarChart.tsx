import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants';
import { useThemeColors } from '../hooks/useColorScheme';

interface BarData {
  label: string;
  value: number;
}

interface WeeklyBarChartProps {
  data: BarData[];
  maxValue?: number;
  color?: string;
  height?: number;
}

const BAR_WIDTH = 24;
const BAR_RADIUS = 6;

export function WeeklyBarChart({
  data,
  maxValue: maxValueProp,
  color = COLORS.primary,
  height = 120,
}: WeeklyBarChartProps) {
  const theme = useThemeColors();
  const maxValue = maxValueProp ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.container}>
      <View style={styles.barsRow}>
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * height : 0;
          const isEmpty = item.value === 0;

          return (
            <View key={index} style={styles.barColumn}>
              <Svg width={BAR_WIDTH} height={height}>
                {/* Background bar */}
                <Rect
                  x={0}
                  y={0}
                  width={BAR_WIDTH}
                  height={height}
                  rx={BAR_RADIUS}
                  ry={BAR_RADIUS}
                  fill={`${color}12`}
                />
                {/* Value bar */}
                {!isEmpty && (
                  <Rect
                    x={0}
                    y={height - barHeight}
                    width={BAR_WIDTH}
                    height={barHeight}
                    rx={BAR_RADIUS}
                    ry={BAR_RADIUS}
                    fill={color}
                    opacity={0.85}
                  />
                )}
              </Svg>
              {!isEmpty && (
                <Text style={[styles.valueLabel, { color: theme.text }]}>
                  {item.value}
                </Text>
              )}
              <Text style={[styles.dayLabel, { color: theme.textSecondary }]}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.sm,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  valueLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    marginTop: 4,
  },
  dayLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
