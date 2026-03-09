import { TIMER_DEFAULTS, MET_VALUES } from '../constants';

export function estimateCalories(
  fastSeconds: number,
  slowSeconds: number,
): number {
  const fastMinutes = fastSeconds / 60;
  const slowMinutes = slowSeconds / 60;
  const calories =
    fastMinutes * TIMER_DEFAULTS.caloriesPerMinuteFast +
    slowMinutes * TIMER_DEFAULTS.caloriesPerMinuteSlow;
  return Math.round(calories);
}

export function estimateCaloriesMET(
  fastSeconds: number,
  slowSeconds: number,
  warmUpSeconds: number,
  coolDownSeconds: number,
  weightKg?: number,
): number {
  const weight = weightKg ?? MET_VALUES.defaultWeightKg;

  const fastHours = fastSeconds / 3600;
  const slowHours = slowSeconds / 3600;
  const warmUpHours = warmUpSeconds / 3600;
  const coolDownHours = coolDownSeconds / 3600;

  const calories =
    MET_VALUES.fastWalking * weight * fastHours +
    MET_VALUES.slowWalking * weight * slowHours +
    MET_VALUES.warmUpCoolDown * weight * warmUpHours +
    MET_VALUES.warmUpCoolDown * weight * coolDownHours;

  return Math.round(calories);
}
