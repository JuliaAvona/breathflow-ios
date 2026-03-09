import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useColorScheme';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants';

export interface WheelColumn {
  min: number;
  max: number;
  step: number;
  pad?: number;
}

interface WheelPickerModalProps {
  visible: boolean;
  title: string;
  columns: WheelColumn[];
  values: number[];
  separator?: string;
  onConfirm: (values: number[]) => void;
  onClose: () => void;
  accentColor?: string;
}

const SHEET_HEIGHT = 300;

export function WheelPickerModal({
  visible,
  title,
  columns,
  values: initialValues,
  separator = ':',
  onConfirm,
  onClose,
  accentColor,
}: WheelPickerModalProps) {
  const theme = useThemeColors();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayFade = useRef(new Animated.Value(0)).current;
  const [values, setValues] = useState(initialValues);
  const color = accentColor ?? theme.primary;

  useEffect(() => {
    if (visible) {
      setValues(initialValues);
      slideAnim.setValue(SHEET_HEIGHT);
      overlayFade.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(overlayFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleConfirm = () => {
    onConfirm(values);
    handleClose();
  };

  const increment = (colIndex: number) => {
    setValues((prev) => {
      const next = [...prev];
      const col = columns[colIndex];
      next[colIndex] += col.step;
      if (next[colIndex] > col.max) next[colIndex] = col.min;
      return next;
    });
  };

  const decrement = (colIndex: number) => {
    setValues((prev) => {
      const next = [...prev];
      const col = columns[colIndex];
      next[colIndex] -= col.step;
      if (next[colIndex] < col.min) next[colIndex] = col.max;
      return next;
    });
  };

  const formatValue = (val: number, col: WheelColumn) => {
    const pad = col.pad ?? 2;
    return String(val).padStart(pad, '0');
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: overlayFade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

          {/* Display value */}
          <View style={[styles.displayRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.displayText, { color: theme.text }]}>
              {values.map((v, i) => formatValue(v, columns[i])).join(separator)}
            </Text>
          </View>

          {/* Wheel columns */}
          <View style={styles.wheelsContainer}>
            {columns.map((col, colIndex) => (
              <React.Fragment key={colIndex}>
                {colIndex > 0 && (
                  <Text style={[styles.separatorText, { color: theme.textSecondary }]}>
                    {separator}
                  </Text>
                )}
                <View style={styles.wheelColumn}>
                  <TouchableOpacity
                    style={[styles.arrowButton, { backgroundColor: theme.background }]}
                    onPress={() => increment(colIndex)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="chevron-up" size={24} color={color} />
                  </TouchableOpacity>

                  <View style={[styles.valueContainer, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                    <Text style={[styles.valueText, { color }]}>
                      {formatValue(values[colIndex], col)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.arrowButton, { backgroundColor: theme.background }]}
                    onPress={() => decrement(colIndex)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="chevron-down" size={24} color={color} />
                  </TouchableOpacity>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: color }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={22} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: SPACING.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  displayRow: {
    marginHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  displayText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  wheelsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  wheelColumn: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  arrowButton: {
    width: 48,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueContainer: {
    width: 64,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  separatorText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  confirmButton: {
    marginHorizontal: SPACING.xl,
    height: 48,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
