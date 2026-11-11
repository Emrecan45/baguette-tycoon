export function offlineReward(awaySeconds, incomePerSecond, nextUnlockPrice) {
  if (![awaySeconds, incomePerSecond, nextUnlockPrice].every(Number.isFinite)) return 0;
  if (awaySeconds < 120 || incomePerSecond <= 0 || nextUnlockPrice <= 0) return 0;
  const income = Math.min(awaySeconds, 30 * 60) * incomePerSecond * 0.05;

  return Math.floor(Math.min(income, nextUnlockPrice * 0.2));
}
