/**
 * Formatiert eine Zahl als deutschen Eurobetrag (z.B. 1.234,56 €)
 */
export function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Parst eine Preiseingabe — unterstützt deutsches Format (1.234,56) und
 * englisches Format (1234.56). Gibt 0 zurück bei ungültiger Eingabe.
 * Negative Werte werden auf 0 gesetzt.
 */
export function parsePrice(input: string): number {
  let s = input.trim()
  if (s.includes(',')) {
    // Deutsches Format: Punkte = Tausendertrennzeichen, Komma = Dezimalzeichen
    s = s.replace(/\./g, '').replace(',', '.')
  }
  const num = parseFloat(s)
  return isNaN(num) ? 0 : Math.max(0, num)
}

/**
 * Berechnet den Gesamtpreis (Menge × EP).
 * Gibt null zurück wenn die Menge nicht numerisch ist (z.B. "pauschal").
 */
export function calcGP(menge: string, ep: number): number | null {
  const m = parseFloat(menge.replace(',', '.'))
  if (isNaN(m)) return null
  return Math.round(m * ep * 100) / 100
}

/**
 * Berechnet die Angebotssumme aller Positionen.
 */
export function calcAngebotssumme(
  positionen: { menge: string; einheitspreis: number }[]
): number {
  return positionen.reduce((sum, p) => {
    const gp = calcGP(p.menge, p.einheitspreis)
    return sum + (gp ?? 0)
  }, 0)
}
