import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BreathingSession } from '../types';
import { formatTotalTime } from '../utils/time';
import { useThemeColors } from '../hooks/useColorScheme';
import { useHaptics } from '../hooks/useHaptics';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants';
import { getTechniqueById } from '../constants/techniques';

interface SessionCardProps {
  session: BreathingSession;
}

export function SessionCard({ session }: SessionCardProps) {
  const { t, i18n } = useTranslation();
  const theme = useThemeColors();
  const haptics = useHaptics();
  const locale = i18n.language;
  const [showDetail, setShowDetail] = useState(false);
  const technique = getTechniqueById(session.techniqueId);

  const dateObj = new Date(session.date + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const timeLabel = new Date(session.startedAt).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const statusColor = session.completed ? theme.primary : theme.accent;

  return (
    <>
      <Pressable
        onPress={() => {
          haptics.light();
          setShowDetail(true);
        }}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.card, opacity: pressed ? 0.92 : 1 },
        ]}
      >
        <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.left}>
            <Text style={[styles.date, { color: theme.text }]}>{dateLabel}</Text>
            <Text style={[styles.time, { color: theme.textSecondary }]}>{timeLabel}</Text>
          </View>
          <View style={styles.right}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatTotalTime(session.totalDuration)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>{t('sessionCard.time')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {session.cyclesCompleted}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>{t('sessionCard.cycles')}</Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Detail Modal */}
      <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowDetail(false)}>
          <Pressable style={[styles.modal, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: statusColor }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>{dateLabel}</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>{timeLabel}</Text>

            <View style={styles.modalGrid}>
              <View style={[styles.modalStat, { backgroundColor: `${theme.primary}12` }]}>
                <Ionicons name="timer-outline" size={20} color={theme.primary} />
                <Text style={[styles.modalStatValue, { color: theme.text }]}>
                  {formatTotalTime(session.totalDuration)}
                </Text>
                <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>{t('sessionCard.time')}</Text>
              </View>
              <View style={[styles.modalStat, { backgroundColor: `${theme.accent}12` }]}>
                <Ionicons name="repeat-outline" size={20} color={theme.accent} />
                <Text style={[styles.modalStatValue, { color: theme.text }]}>
                  {session.cyclesCompleted}
                </Text>
                <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>{t('sessionCard.cycles')}</Text>
              </View>
            </View>

            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>{t('sessionCard.technique')}</Text>
                <Text style={[styles.modalDetailValue, { color: theme.text }]}>
                  {technique ? t(technique.nameKey) : session.techniqueId}
                </Text>
              </View>
              {session.completed && (
                <View style={styles.modalDetailRow}>
                  <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>{t('sessionCard.completed')}</Text>
                  <Ionicons name="checkmark" size={16} color={theme.primary} />
                </View>
              )}
            </View>

            <Pressable
              style={[styles.closeButton, { backgroundColor: theme.background }]}
              onPress={() => setShowDetail(false)}
            >
              <Text style={[styles.closeButtonText, { color: theme.text }]}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  statusBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  left: {
    flex: 1,
  },
  date: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  time: {
    fontSize: FONT_SIZE.xs,
    marginTop: 3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stat: {
    alignItems: 'center',
    minWidth: 44,
  },
  statDivider: {
    width: 1,
    height: 24,
    opacity: 0.4,
  },
  statValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modal: {
    width: '100%',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHandle: {
    height: 4,
    borderRadius: 2,
    width: 40,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modalStat: {
    flex: 1,
    minWidth: '28%' as unknown as number,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: 4,
  },
  modalStatValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
  },
  modalStatLabel: {
    fontSize: FONT_SIZE.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalDetails: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDetailLabel: {
    fontSize: FONT_SIZE.sm,
  },
  modalDetailValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
