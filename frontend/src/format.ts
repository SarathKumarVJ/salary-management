const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** "IN" → "India". Anything that isn't a region code (e.g. typed into the URL) is shown as is. */
export function countryName(code: string) {
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code // Intl throws RangeError for codes like "foo"
  }
}

/** Display only: the API's exact decimal string as money, e.g. ("2300000.00", "INR") → "₹2,300,000.00". */
export const formatMoney = (amount: string, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(amount))

/** Select options that always include the current value, so it shows before the options load (or if no longer offered). */
export const optionsWith = (current: string, available: string[] = []) =>
  [...new Set([...(current ? [current] : []), ...available])]
