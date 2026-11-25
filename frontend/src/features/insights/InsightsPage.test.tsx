import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { TOKEN_KEY } from '../../api/token'
import type { InsightRow } from '../../types/api'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const byCountry: InsightRow[] = [
  { name: 'IN', currency: 'INR', headcount: 3, min: '1000000.00', median: '2000000.00', avg: '2100000.00', max: '3300000.00', median_usd: '24000.00' },
  { name: 'US', currency: 'USD', headcount: 2, min: '90000.00', median: '120000.00', avg: '120000.00', max: '150000.00', median_usd: '120000.00' },
]
const jobTitlesInUsd: InsightRow[] = [
  { name: 'Recruiter', currency: 'USD', headcount: 4, min: '20000.00', median: '50000.00', avg: '55000.00', max: '90000.00', median_usd: '50000.00' },
]
const departmentsInUsd: InsightRow[] = [
  { name: 'Engineering', currency: 'USD', headcount: 4, min: '60000.00', median: '90000.00', avg: '95000.00', max: '140000.00', median_usd: '90000.00' },
]
const jobTitlesInIndia: InsightRow[] = [
  { name: 'Recruiter', currency: 'INR', headcount: 2, min: '900000.00', median: '1000000.00', avg: '1000000.00', max: '1100000.00', median_usd: '12000.00' },
]

// Answers /insights like the API: by country, or by job title in USD or within one country.
function mockInsights() {
  const requests: URLSearchParams[] = []
  server.use(
    http.get('*/api/v1/insights', ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      const group = params.get('group')
      const country = params.get('country')
      if (country && country !== 'IN') return HttpResponse.json({ errors: { country: ['is not supported'] } }, { status: 400 })
      const rows =
        group === 'country' ? byCountry : group === 'department' ? departmentsInUsd : country ? jobTitlesInIndia : jobTitlesInUsd
      return HttpResponse.json({ group, rates_as_of: '2026-11-01', rows })
    }),
    http.get('*/api/v1/filters', () =>
      HttpResponse.json({ countries: ['IN', 'US'], currencies: { IN: 'INR', US: 'USD' }, levels: [], departments: [], job_titles: [] }),
    ),
  )
  return { last: () => requests.at(-1)! }
}

describe('insights', () => {
  beforeEach(() => localStorage.setItem(TOKEN_KEY, 'valid-token'))

  it('compares countries in their own currency and side by side in USD', async () => {
    const requests = mockInsights()
    renderApp('/insights')

    const india = (await screen.findByRole('rowheader', { name: 'India' })).closest('tr')!
    expect(within(india).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '3', '₹2,000,000.00', '₹1,000,000.00', '₹2,100,000.00', '₹3,300,000.00', '$24,000.00',
    ])
    expect(screen.getByText(/5 employees in 2 countries/i)).toHaveTextContent('USD at fixed rates as of 2026-11-01')
    expect(requests.last().get('group')).toBe('country')

    const chart = screen.getByRole('figure', { name: /median salary in usd by country/i })
    expect(within(chart).getAllByRole('listitem').map((bar) => bar.textContent)).toEqual([
      'United States$120,000.00', 'India$24,000.00',
    ])
  })

  it('shows what a job title pays across the org, in USD', async () => {
    const requests = mockInsights()
    const { user } = renderApp('/insights')
    await screen.findByRole('rowheader', { name: 'India' })

    await user.click(screen.getByRole('button', { name: 'Job title' }))

    expect(await screen.findByRole('rowheader', { name: 'Recruiter' })).toBeInTheDocument()
    expect(requests.last().get('group')).toBe('job_title')
    expect(requests.last().get('country')).toBeNull()
    expect(screen.getByRole('figure', { name: /median salary in usd by job title/i })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /median \(usd\)/i })).not.toBeInTheDocument()
  })

  it('shows what a job title pays within one country, in its currency', async () => {
    const requests = mockInsights()
    const { user } = renderApp('/insights?group=job_title')
    await screen.findByRole('rowheader', { name: 'Recruiter' })

    await user.click(screen.getByRole('combobox', { name: 'Country' }))
    await user.click(await screen.findByRole('option', { name: 'India' }))

    await waitFor(() => expect(requests.last().get('country')).toBe('IN'))
    const row = (await screen.findByRole('rowheader', { name: 'Recruiter' })).closest('tr')!
    expect(await within(row).findAllByText('₹1,000,000.00')).toHaveLength(2) // median and average
    expect(screen.getByRole('figure', { name: /median salary in INR by job title/i })).toBeInTheDocument()
    expect(screen.getByText(/2 employees in 1 job title$/i)).toBeInTheDocument() // nothing converted, so no USD note
  })

  it('accepts a lower-case country in the URL', async () => {
    const requests = mockInsights()
    renderApp('/insights?group=job_title&country=in')

    await screen.findByRole('rowheader', { name: 'Recruiter' })
    expect(requests.last().get('country')).toBe('IN')
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('India')
  })

  it('explains an unsupported country from the URL instead of crashing', async () => {
    mockInsights()
    renderApp('/insights?group=job_title&country=foo')

    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't supported/i)
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('FOO')
  })

  it('counts people per department', async () => {
    const requests = mockInsights()
    renderApp('/insights?group=department')

    const engineering = (await screen.findByRole('rowheader', { name: 'Engineering' })).closest('tr')!
    expect(within(engineering).getAllByRole('cell')[0]).toHaveTextContent('4')
    expect(requests.last().get('group')).toBe('department')
    expect(screen.getByRole('button', { name: 'Department' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says so when there are no employees to summarise', async () => {
    server.use(http.get('*/api/v1/insights', () => HttpResponse.json({ group: 'country', rates_as_of: '2026-11-01', rows: [] })))
    renderApp('/insights')

    expect(await screen.findByText(/no employees to summarise/i)).toBeInTheDocument()
  })

  it('explains a failed load', async () => {
    server.use(http.get('*/api/v1/insights', () => HttpResponse.json({}, { status: 500 })))
    renderApp('/insights')

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load insights/i)
  })

  it('explains when the account has no access', async () => {
    server.use(
      http.get('*/api/v1/insights', () => HttpResponse.json({ errors: { base: ['Not allowed'] } }, { status: 403 })),
    )
    renderApp('/insights')

    expect(await screen.findByRole('alert')).toHaveTextContent(/doesn't have access/i)
  })
})
