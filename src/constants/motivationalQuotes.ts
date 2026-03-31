const MOTIVATIONAL_QUOTE_KEYS = [
  'summary.quote1',
  'summary.quote2',
  'summary.quote3',
  'summary.quote4',
  'summary.quote5',
  'summary.quote6',
  'summary.quote7',
  'summary.quote8',
  'summary.quote9',
  'summary.quote10',
  'summary.quote11',
  'summary.quote12',
  'summary.quote13',
  'summary.quote14',
  'summary.quote15',
  'summary.quote16',
  'summary.quote17',
  'summary.quote18',
  'summary.quote19',
  'summary.quote20',
  'summary.quote21',
  'summary.quote22',
  'summary.quote23',
  'summary.quote24',
  'summary.quote25',
  'summary.quote26',
  'summary.quote27',
  'summary.quote28',
  'summary.quote29',
  'summary.quote30',
] as const;

export function getRandomQuoteKey(): string {
  return MOTIVATIONAL_QUOTE_KEYS[
    Math.floor(Math.random() * MOTIVATIONAL_QUOTE_KEYS.length)
  ];
}

/** Returns a stable quote key for the current day */
export function getDailyQuoteKey(): string {
  const now = new Date();
  const dayIndex = (now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate()) % MOTIVATIONAL_QUOTE_KEYS.length;
  return MOTIVATIONAL_QUOTE_KEYS[dayIndex];
}
