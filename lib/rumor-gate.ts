export function isRumorHour(hour: number): boolean {
  return hour >= 20 || hour < 5;
}
