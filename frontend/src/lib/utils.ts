// Utilities ported from index.html

export function fmt(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
}

export function fmtShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

export function evalAmount(raw: string): number | null {
  if (!raw.trim()) return null
  if (!/^[\d\s\+\-\*\/\.]+$/.test(raw)) return parseFloat(raw) || null
  try {
    const result = Function('"use strict"; return (' + raw + ')')() as number
    if (typeof result === 'number' && isFinite(result) && result > 0) return result
  } catch { /* empty */ }
  return null
}

export function evalAmountHint(raw: string): string {
  if (!raw.trim() || !/^[\d\s\+\-\*\/\.]+$/.test(raw)) return ''
  try {
    const result = Function('"use strict"; return (' + raw + ')')() as number
    if (typeof result === 'number' && isFinite(result) && result > 0 && raw.match(/[\+\-\*\/]/)) {
      return '= ' + fmt(result)
    }
  } catch { /* empty */ }
  return ''
}

export const PALETTE = [
  '#f6d365','#fda085','#f7797d','#84fab0','#8fd3f4',
  '#c8f135','#5b8dee','#ff9f43','#a29bfe','#ff7675'
]
