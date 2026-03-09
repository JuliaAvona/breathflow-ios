import type { BreathingTechnique, TechniqueCategory } from '../types';

export const TECHNIQUES: BreathingTechnique[] = [
  // ─── FREE TECHNIQUES ────────────────────────────────────────────

  {
    id: 'box',
    nameKey: 'techniques.box.name',
    descriptionKey: 'techniques.box.description',
    category: 'focus',
    phases: [
      { type: 'inhale', duration: 4, instructionKey: 'breatheIn' },
      { type: 'holdIn', duration: 4, instructionKey: 'hold' },
      { type: 'exhale', duration: 4, instructionKey: 'breatheOut' },
      { type: 'holdOut', duration: 4, instructionKey: 'holdOut' },
    ],
    defaultCycles: 0,
    defaultDuration: 300,
    adjustable: true,
    shape: 'square',
    color: '#4A90D9',
    icon: 'grid-outline',
    mode: 'standard',
    isPro: false,
  },

  {
    id: 'fourSevenEight',
    nameKey: 'techniques.fourSevenEight.name',
    descriptionKey: 'techniques.fourSevenEight.description',
    category: 'sleep',
    phases: [
      { type: 'inhale', duration: 4, instructionKey: 'breatheIn' },
      { type: 'holdIn', duration: 7, instructionKey: 'hold' },
      { type: 'exhale', duration: 8, instructionKey: 'breatheOut' },
    ],
    defaultCycles: 8,
    adjustable: true,
    shape: 'triangle',
    color: '#7B68AE',
    icon: 'moon-outline',
    mode: 'standard',
    isPro: false,
  },

  {
    id: 'physioSigh',
    nameKey: 'techniques.physioSigh.name',
    descriptionKey: 'techniques.physioSigh.description',
    category: 'calm',
    phases: [
      { type: 'inhale', duration: 2, instructionKey: 'breatheIn' },
      { type: 'inhale', duration: 1, instructionKey: 'topUpInhale' },
      { type: 'exhale', duration: 6, instructionKey: 'breatheOut' },
    ],
    defaultCycles: 0,
    defaultDuration: 300,
    adjustable: true,
    shape: 'wave',
    color: '#7BC4A8',
    icon: 'leaf-outline',
    mode: 'standard',
    isPro: false,
  },

  {
    id: 'coherence',
    nameKey: 'techniques.coherence.name',
    descriptionKey: 'techniques.coherence.description',
    category: 'calm',
    phases: [
      { type: 'inhale', duration: 5.5, instructionKey: 'breatheIn' },
      { type: 'exhale', duration: 5.5, instructionKey: 'breatheOut' },
    ],
    defaultCycles: 0,
    defaultDuration: 300,
    adjustable: true,
    shape: 'circle',
    color: '#5BA4C8',
    icon: 'radio-outline',
    mode: 'standard',
    isPro: false,
  },

  {
    id: 'triangle',
    nameKey: 'techniques.triangle.name',
    descriptionKey: 'techniques.triangle.description',
    category: 'calm',
    phases: [
      { type: 'inhale', duration: 4, instructionKey: 'breatheIn' },
      { type: 'holdIn', duration: 4, instructionKey: 'hold' },
      { type: 'exhale', duration: 4, instructionKey: 'breatheOut' },
    ],
    defaultCycles: 0,
    defaultDuration: 300,
    adjustable: true,
    shape: 'triangle',
    color: '#4ECDC4',
    icon: 'triangle-outline',
    mode: 'standard',
    isPro: false,
  },

  // ─── PRO TECHNIQUES ─────────────────────────────────────────────

  {
    id: 'power',
    nameKey: 'techniques.power.name',
    descriptionKey: 'techniques.power.description',
    category: 'advanced',
    phases: [
      { type: 'inhale', duration: 1, instructionKey: 'breatheIn' },
      { type: 'exhale', duration: 1, instructionKey: 'breatheOut' },
    ],
    defaultCycles: 0,
    adjustable: true,
    mode: 'power',
    hasRetention: true,
    hasRecovery: true,
    breathCount: 30,
    roundCount: 3,
    shape: 'burst',
    color: '#E85D4A',
    icon: 'flash-outline',
    isPro: true,
  },

  {
    id: 'fourFourSixTwo',
    nameKey: 'techniques.fourFourSixTwo.name',
    descriptionKey: 'techniques.fourFourSixTwo.description',
    category: 'calm',
    phases: [
      { type: 'inhale', duration: 4, instructionKey: 'breatheIn' },
      { type: 'holdIn', duration: 4, instructionKey: 'hold' },
      { type: 'exhale', duration: 6, instructionKey: 'breatheOut' },
      { type: 'holdOut', duration: 2, instructionKey: 'holdOut' },
    ],
    defaultCycles: 0,
    defaultDuration: 300,
    adjustable: true,
    shape: 'oval',
    color: '#6B9BD2',
    icon: 'water-outline',
    mode: 'standard',
    isPro: true,
  },

  {
    id: 'kapalabhati',
    nameKey: 'techniques.kapalabhati.name',
    descriptionKey: 'techniques.kapalabhati.description',
    category: 'energy',
    phases: [
      { type: 'exhale', duration: 0.5, instructionKey: 'breatheOut' },
      { type: 'inhale', duration: 0.5, instructionKey: 'breatheIn' },
    ],
    defaultCycles: 0,
    adjustable: true,
    mode: 'kapalabhati',
    setCount: 3,
    setDuration: 30,
    restDuration: 30,
    shape: 'burst',
    color: '#F5A623',
    icon: 'sunny-outline',
    isPro: true,
  },

  {
    id: 'twoToOne',
    nameKey: 'techniques.twoToOne.name',
    descriptionKey: 'techniques.twoToOne.description',
    category: 'sleep',
    phases: [
      { type: 'inhale', duration: 4, instructionKey: 'breatheIn' },
      { type: 'exhale', duration: 8, instructionKey: 'breatheOut' },
    ],
    defaultCycles: 0,
    defaultDuration: 300,
    adjustable: true,
    shape: 'oval',
    color: '#9B7FBD',
    icon: 'cloudy-night-outline',
    mode: 'standard',
    isPro: true,
  },

  {
    id: 'cyclicSigh',
    nameKey: 'techniques.cyclicSigh.name',
    descriptionKey: 'techniques.cyclicSigh.description',
    category: 'calm',
    phases: [
      { type: 'inhale', duration: 3, instructionKey: 'breatheIn' },
      { type: 'inhale', duration: 1.5, instructionKey: 'topUpInhale' },
      { type: 'exhale', duration: 8, instructionKey: 'breatheOut' },
    ],
    defaultCycles: 0,
    defaultDuration: 300,
    adjustable: false,
    shape: 'wave',
    color: '#5BAD7A',
    icon: 'pulse-outline',
    mode: 'standard',
    isPro: true,
  },
];

// ─── HELPER FUNCTIONS ────────────────────────────────────────────

export function getTechniqueById(id: string): BreathingTechnique | undefined {
  return TECHNIQUES.find((t) => t.id === id);
}

export function getTechniquesByCategory(category: TechniqueCategory): BreathingTechnique[] {
  return TECHNIQUES.filter((t) => t.category === category);
}

export function getFreeTechniques(): BreathingTechnique[] {
  return TECHNIQUES.filter((t) => !t.isPro);
}

export function getProTechniques(): BreathingTechnique[] {
  return TECHNIQUES.filter((t) => t.isPro);
}
