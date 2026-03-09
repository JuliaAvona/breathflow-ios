import { Share } from 'react-native';
import { BreathingSession } from '../types';

export async function exportSessionsAsCSV(sessions: BreathingSession[]): Promise<void> {
  const header = 'Date,Started At,Completed At,Technique,Cycles Completed,Total Duration (s),Rounds Completed,Retention Times,Best Retention (s),Avg Retention (s),Mood,Completed';

  const rows = sessions.map((s) => {
    return [
      s.date,
      new Date(s.startedAt).toISOString(),
      new Date(s.completedAt).toISOString(),
      s.techniqueId,
      s.cyclesCompleted,
      s.totalDuration,
      s.roundsCompleted ?? '',
      s.retentionTimes ? s.retentionTimes.join(';') : '',
      s.bestRetention ?? '',
      s.avgRetention ?? '',
      s.moodAfter ?? '',
      s.completed ? 'Yes' : 'No',
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');

  await Share.share({
    message: csv,
    title: 'BreathFlow Sessions Export',
  });
}
