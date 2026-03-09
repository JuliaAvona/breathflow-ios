interface FoodEquivalent {
  key: string;
  caloriesPerServing: number;
  emoji: string;
}

const FOOD_EQUIVALENTS: FoodEquivalent[] = [
  { key: 'summary.foodApple', caloriesPerServing: 95, emoji: '\u{1F34E}' },
  { key: 'summary.foodBanana', caloriesPerServing: 105, emoji: '\u{1F34C}' },
  { key: 'summary.foodCookie', caloriesPerServing: 160, emoji: '\u{1F36A}' },
  { key: 'summary.foodChocolateBar', caloriesPerServing: 230, emoji: '\u{1F36B}' },
  { key: 'summary.foodIceCream', caloriesPerServing: 250, emoji: '\u{1F366}' },
  { key: 'summary.foodPizzaSlice', caloriesPerServing: 285, emoji: '\u{1F355}' },
];

export function getCalorieEquivalent(
  calories: number,
): { key: string; count: number; emoji: string } | null {
  for (const food of FOOD_EQUIVALENTS) {
    const count = Math.round(calories / food.caloriesPerServing);
    if (count >= 1 && count <= 5) {
      return { key: food.key, count, emoji: food.emoji };
    }
  }
  return null;
}
