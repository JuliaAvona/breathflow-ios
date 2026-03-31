export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTotalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isConsecutiveDay(date1: string, date2: string): boolean {
  // Parse as local dates to avoid UTC timezone issues
  const [y1, m1, day1] = date1.split('-').map(Number);
  const [y2, m2, day2] = date2.split('-').map(Number);
  const t1 = new Date(y1, m1 - 1, day1).getTime();
  const t2 = new Date(y2, m2 - 1, day2).getTime();
  const diffDays = Math.round(Math.abs(t2 - t1) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
