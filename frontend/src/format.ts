const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** "IN" → "India" */
export const countryName = (code: string) => regionNames.of(code) ?? code

/** Display only: the API's exact decimal string as money, e.g. ("2300000.00", "INR") → "₹2,300,000.00". */
export const formatMoney = (amount: string, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(amount))
