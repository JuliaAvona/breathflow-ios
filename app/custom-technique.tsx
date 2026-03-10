import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../src/hooks/useColorScheme';
import { useSettingsStore } from '../src/store';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS, scale } from '../src/constants';
import type { BreathingTechnique, BreathPhase, BreathingShape, PhaseType } from '../src/types';

const SHAPES: { value: BreathingShape; icon: string; label: string }[] = [
  { value: 'circle', icon: 'ellipse-outline', label: 'Circle' },
  { value: 'square', icon: 'square-outline', label: 'Square' },
  { value: 'triangle', icon: 'triangle-outline', label: 'Triangle' },
  { value: 'wave', icon: 'water-outline', label: 'Wave' },
  { value: 'oval', icon: 'ellipse-outline', label: 'Oval' },
  { value: 'burst', icon: 'flash-outline', label: 'Burst' },
];

const TECHNIQUE_COLORS = [
  '#4A90D9', '#7BC4A8', '#7B68AE', '#F5A623',
  '#E85D75', '#5BA4C8', '#8BC34A', '#FF7043',
];

const PHASE_TYPES: { value: PhaseType; labelKey: string; color: string }[] = [
  { value: 'inhale', labelKey: 'customTechnique.inhale', color: COLORS.inhale },
  { value: 'holdIn', labelKey: 'customTechnique.holdIn', color: COLORS.holdIn },
  { value: 'exhale', labelKey: 'customTechnique.exhale', color: COLORS.exhale },
  { value: 'holdOut', labelKey: 'customTechnique.holdOut', color: COLORS.holdOut },
];

const INSTRUCTION_KEYS: Record<PhaseType, string> = {
  inhale: 'session.breatheIn',
  holdIn: 'session.hold',
  exhale: 'session.breatheOut',
  holdOut: 'session.holdOut',
};

export default function CustomTechniqueScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const addCustomTechnique = useSettingsStore((s) => s.addCustomTechnique);

  const [name, setName] = useState('');
  const [selectedShape, setSelectedShape] = useState<BreathingShape>('circle');
  const [selectedColor, setSelectedColor] = useState(TECHNIQUE_COLORS[0]);
  const [cycles, setCycles] = useState(6);
  const [phases, setPhases] = useState<{ type: PhaseType; duration: number }[]>([
    { type: 'inhale', duration: 4 },
    { type: 'exhale', duration: 4 },
  ]);

  const patternStr = useMemo(() => {
    return phases.map((p) => `${p.duration}s`).join(' - ');
  }, [phases]);

  const addPhase = () => {
    if (phases.length >= 4) return;
    // Suggest next logical phase
    const lastType = phases[phases.length - 1]?.type;
    let nextType: PhaseType = 'inhale';
    if (lastType === 'inhale') nextType = 'holdIn';
    else if (lastType === 'holdIn') nextType = 'exhale';
    else if (lastType === 'exhale') nextType = 'holdOut';
    setPhases([...phases, { type: nextType, duration: 4 }]);
  };

  const removePhase = (index: number) => {
    if (phases.length <= 2) return;
    setPhases(phases.filter((_, i) => i !== index));
  };

  const updatePhaseDuration = (index: number, delta: number) => {
    setPhases(phases.map((p, i) => {
      if (i !== index) return p;
      const newDur = Math.max(1, Math.min(15, p.duration + delta));
      return { ...p, duration: newDur };
    }));
  };

  const updatePhaseType = (index: number, type: PhaseType) => {
    setPhases(phases.map((p, i) => (i === index ? { ...p, type } : p)));
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('customTechnique.error'), t('customTechnique.nameRequired'));
      return;
    }

    const id = `custom_${Date.now()}`;
    const technique: BreathingTechnique = {
      id,
      nameKey: name.trim(), // Custom techniques use raw name, not i18n key
      descriptionKey: t('customTechnique.customDescription'),
      category: 'calm',
      phases: phases.map((p) => ({
        type: p.type,
        duration: p.duration,
        instructionKey: INSTRUCTION_KEYS[p.type],
      })),
      defaultCycles: cycles,
      adjustable: true,
      shape: selectedShape,
      color: selectedColor,
      icon: 'create-outline',
      mode: 'standard',
      isPro: false,
    };

    addCustomTechnique(technique);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient hero */}
        <LinearGradient
          colors={[selectedColor, selectedColor + '80', theme.background]}
          locations={[0, 0.5, 1]}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('customTechnique.title')}</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Shape preview */}
          <View style={styles.shapePreview}>
            <Ionicons
              name={SHAPES.find((s) => s.value === selectedShape)?.icon as any ?? 'ellipse-outline'}
              size={64}
              color="rgba(255,255,255,0.5)"
            />
          </View>

          {/* Pattern preview */}
          <Text style={styles.patternPreview}>{patternStr}</Text>
        </LinearGradient>

        {/* Name input */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t('customTechnique.name')}
          </Text>
          <TextInput
            style={[styles.nameInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder={t('customTechnique.namePlaceholder')}
            placeholderTextColor={theme.textSecondary}
            maxLength={30}
          />
        </View>

        {/* Phases */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t('customTechnique.phases')}
          </Text>

          {phases.map((phase, index) => {
            const phaseInfo = PHASE_TYPES.find((p) => p.value === phase.type)!;
            return (
              <View key={index} style={[styles.phaseRow, { backgroundColor: theme.card }]}>
                {/* Phase type selector */}
                <View style={[styles.phaseColorDot, { backgroundColor: phaseInfo.color }]} />
                <TouchableOpacity
                  style={styles.phaseTypeBtn}
                  onPress={() => {
                    const currentIdx = PHASE_TYPES.findIndex((p) => p.value === phase.type);
                    const nextIdx = (currentIdx + 1) % PHASE_TYPES.length;
                    updatePhaseType(index, PHASE_TYPES[nextIdx].value);
                  }}
                >
                  <Text style={[styles.phaseTypeText, { color: theme.text }]}>
                    {t(phaseInfo.labelKey)}
                  </Text>
                  <Ionicons name="swap-horizontal" size={14} color={theme.textSecondary} />
                </TouchableOpacity>

                {/* Duration stepper */}
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: theme.background }]}
                    onPress={() => updatePhaseDuration(index, -1)}
                  >
                    <Ionicons name="remove" size={18} color={theme.text} />
                  </TouchableOpacity>
                  <Text style={[styles.stepperValue, { color: theme.text }]}>
                    {phase.duration}s
                  </Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: theme.background }]}
                    onPress={() => updatePhaseDuration(index, 1)}
                  >
                    <Ionicons name="add" size={18} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {/* Remove */}
                {phases.length > 2 && (
                  <TouchableOpacity onPress={() => removePhase(index)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#E85D75" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {phases.length < 4 && (
            <TouchableOpacity
              style={[styles.addPhaseBtn, { borderColor: theme.border }]}
              onPress={addPhase}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.addPhaseText, { color: COLORS.primary }]}>
                {t('customTechnique.addPhase')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cycles */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t('customTechnique.cycles')}
          </Text>
          <View style={[styles.cycleRow, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: theme.background }]}
              onPress={() => setCycles(Math.max(1, cycles - 1))}
            >
              <Ionicons name="remove" size={18} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.cycleValue, { color: theme.text }]}>{cycles}</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: theme.background }]}
              onPress={() => setCycles(Math.min(30, cycles + 1))}
            >
              <Ionicons name="add" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Shape picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t('customTechnique.shape')}
          </Text>
          <View style={styles.shapeGrid}>
            {SHAPES.map((shape) => (
              <TouchableOpacity
                key={shape.value}
                style={[
                  styles.shapeOption,
                  {
                    backgroundColor: selectedShape === shape.value ? selectedColor + '20' : theme.card,
                    borderColor: selectedShape === shape.value ? selectedColor : 'transparent',
                  },
                ]}
                onPress={() => setSelectedShape(shape.value)}
              >
                <Ionicons
                  name={shape.icon as any}
                  size={24}
                  color={selectedShape === shape.value ? selectedColor : theme.textSecondary}
                />
                <Text style={[
                  styles.shapeLabel,
                  { color: selectedShape === shape.value ? selectedColor : theme.textSecondary },
                ]}>
                  {shape.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t('customTechnique.color')}
          </Text>
          <View style={styles.colorRow}>
            {TECHNIQUE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorCircleSelected,
                ]}
                onPress={() => setSelectedColor(c)}
              >
                {selectedColor === c && (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: selectedColor }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>{t('customTechnique.save')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Hero
  hero: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: SPACING.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  shapePreview: {
    width: scale(100),
    height: scale(100),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  patternPreview: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },

  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },

  // Name
  nameInput: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.medium,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },

  // Phases
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xs + 2,
    gap: 8,
  },
  phaseColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  phaseTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phaseTypeText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.medium,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.bold,
    width: 32,
    textAlign: 'center',
  },
  addPhaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addPhaseText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.semibold,
  },

  // Cycles
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  cycleValue: {
    fontSize: 24,
    fontFamily: FONTS.heavy,
    width: 48,
    textAlign: 'center',
  },

  // Shape
  shapeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
  },
  shapeOption: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    gap: 4,
  },
  shapeLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
  },

  // Color
  colorRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Save
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});
