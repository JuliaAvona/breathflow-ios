import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../hooks/useColorScheme';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants';

export interface PickerOption<T> {
  label: string;
  value: T;
}

interface PickerModalProps<T> {
  visible: boolean;
  title: string;
  options: PickerOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  accentColor?: string;
  /** When false, selecting an option doesn't dismiss the sheet — only the close button/backdrop does. Defaults to true. */
  closeOnSelect?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;

export function PickerModal<T>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  accentColor,
  closeOnSelect = true,
}: PickerModalProps<T>) {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const slideAnim = useRef(new Animated.Value(MAX_SHEET_HEIGHT)).current;
  const overlayFade = useRef(new Animated.Value(0)).current;
  const color = accentColor ?? theme.primary;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(MAX_SHEET_HEIGHT);
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
        toValue: MAX_SHEET_HEIGHT,
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

  const handleSelect = (value: T) => {
    onSelect(value);
    if (closeOnSelect) handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: overlayFade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessible={false} />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Options */}
          <ScrollView
            style={styles.optionsList}
            contentContainerStyle={styles.optionsContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {options.map((option, index) => {
              const isSelected = option.value === selectedValue;
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[
                    styles.optionRow,
                    index < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                    isSelected && { backgroundColor: color + '12' },
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: theme.text },
                      isSelected && { color, fontWeight: '700' },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    maxHeight: MAX_SHEET_HEIGHT,
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
  closeBtn: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.md,
    padding: 4,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  optionsList: {
    flexGrow: 0,
  },
  optionsContent: {
    paddingHorizontal: SPACING.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 48,
  },
  optionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
});
