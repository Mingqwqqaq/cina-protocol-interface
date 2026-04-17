export function resolveText(value: string, key: string, fallback: string) {
  return value === key ? fallback : value
}
