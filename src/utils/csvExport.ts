import { Share } from 'react-native';
import { Session } from '../types';

export async function exportSessionsAsCSV(sessions: Session[]): Promise<void> {
  const header = 'Date,Started At,Completed At,Rounds,Total Rounds,Fast Duration (s),Slow Duration (s),Total Duration (s),Calories,Completed,Steps,Distance (m)';

  const rows = sessions.map((s) => {
    return [
      s.date,
      new Date(s.startedAt).toISOString(),
      new Date(s.completedAt).toISOString(),
      s.rounds,
      s.totalRounds,
      s.fastDuration,
      s.slowDuration,
      s.totalDuration,
      s.estimatedCalories,
      s.completed ? 'Yes' : 'No',
      s.steps ?? '',
      s.distance ?? '',
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');

  await Share.share({
    message: csv,
    title: 'WalkPace Sessions Export',
  });
}
