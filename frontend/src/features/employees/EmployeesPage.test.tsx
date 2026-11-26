import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TOKEN_KEY } from '../../api/token'
import type { Employee } from '../../types/api'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const ana: Employee = {
  id: 1, full_name: 'Ana Silva', email: 'ana.silva@acme.test', job_title: 'Software Engineer',
  department: 'Engineering', level: 'L3', country: 'IN', currency: 'INR', salary: '2300000.00', hire_date: '2020-04-01',
}
const bob: Employee = {
  id: 2, full_name: 'Bob Stone', email: 'bob.stone@acme.test', job_title: 'Recruiter',
  department: 'People', level: 'L2', country: 'US', currency: 'USD', salary: '83200.50', hire_date: '2019-01-15',
}

// Answers the list endpoint and records the query string of every request.
function mockEmployees(employees: Employee[] = [ana, bob], count = employees.length) {
  const requests: URLSearchParams[] = []
  server.use(
    http.get('*/api/v1/employees', ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      const page = Number(params.get('page') ?? 1)
      return HttpResponse.json({ employees, meta: { page, limit: 25, count, pages: Math.ceil(count / 25) } })
    }),
  )
  return { last: () => requests.at(-1)! }
}

function mockFilters() {
  server.use(
    http.get('*/api/v1/filters', () =>
      HttpResponse.json({
        countries: ['IN', 'US'], currencies: { IN: 'INR', US: 'USD' }, levels: ['L1', 'L2', 'L3'],
        departments: ['Engineering', 'People'], job_titles: ['Recruiter', 'Software Engineer'],
        job_titles_by_department: { Engineering: ['Software Engineer'], People: ['Recruiter'] },
      }),
    ),
  )
}

async function choose(user: ReturnType<typeof renderApp>['user'], label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('employee list', () => {
  beforeEach(() => localStorage.setItem(TOKEN_KEY, 'valid-token'))

  it('shows a page of employees with salaries in their own currency', async () => {
    mockEmployees([ana, bob], 60)
    renderApp('/employees')

    expect(screen.getByText(/loading employees/i)).toBeInTheDocument()
    const anaRow = (await screen.findByText('Ana Silva')).closest('tr')!
    expect(within(anaRow).getByText('₹2,300,000.00')).toBeInTheDocument()
    expect(within(anaRow).getByText('India')).toBeInTheDocument()
    expect(screen.getByText('$83,200.50')).toBeInTheDocument()
    expect(screen.getByText('1–25 of 60')).toBeInTheDocument()
  })

  it('searches by name or email from page 1', async () => {
    const requests = mockEmployees([ana], 60)
    const { user } = renderApp('/employees?page=2')
    await screen.findByText('Ana Silva')

    await user.type(screen.getByRole('searchbox', { name: /search/i }), 'ana{Enter}')

    await waitFor(() => expect(requests.last().get('q')).toBe('ana'))
    expect(requests.last().get('page')).toBeNull()
  })

  it('filters by country, department and job title from the filter options', async () => {
    mockFilters()
    const requests = mockEmployees()
    const { user } = renderApp('/employees')
    await screen.findByText('Ana Silva')

    await choose(user, 'Country', 'India')
    await choose(user, 'Department', 'Engineering')
    await choose(user, 'Job title', 'Software Engineer')

    await waitFor(() => expect(requests.last().get('job_title')).toBe('Software Engineer'))
    expect(requests.last().get('country')).toBe('IN')
    expect(requests.last().get('department')).toBe('Engineering')
  })

  it('offers only the job titles of the chosen department', async () => {
    mockFilters()
    mockEmployees()
    const { user } = renderApp('/employees')
    await screen.findByText('Ana Silva')

    await choose(user, 'Department', 'People')
    await user.click(screen.getByRole('combobox', { name: 'Job title' }))

    const titles = within(await screen.findByRole('listbox')).getAllByRole('option').map((option) => option.textContent)
    expect(titles).toEqual(['All', 'Recruiter'])
  })

  it('clears a job title that is not in the newly chosen department', async () => {
    mockFilters()
    const requests = mockEmployees()
    const { user } = renderApp('/employees?department=Engineering&job_title=Software+Engineer')
    await screen.findByText('Ana Silva')

    await choose(user, 'Department', 'People')

    await waitFor(() => expect(requests.last().get('department')).toBe('People'))
    expect(requests.last().get('job_title')).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Job title' })).not.toHaveTextContent('Software Engineer')
  })

  it('offers every job title for a department the options do not know, even a crafted one', async () => {
    mockFilters()
    mockEmployees()
    const { user } = renderApp('/employees?department=__proto__')
    await screen.findByText('Ana Silva')

    await user.click(screen.getByRole('combobox', { name: 'Job title' }))

    const titles = within(await screen.findByRole('listbox')).getAllByRole('option').map((option) => option.textContent)
    expect(titles).toEqual(['All', 'Recruiter', 'Software Engineer'])
  })

  it('sorts by salary only once a country is chosen, since amounts are in local currency', async () => {
    mockFilters()
    const requests = mockEmployees()
    const { user } = renderApp('/employees')
    await screen.findByText('Ana Silva')
    expect(screen.queryByRole('button', { name: 'Salary' })).not.toBeInTheDocument()

    await choose(user, 'Country', 'India')
    await user.click(screen.getByRole('button', { name: 'Salary' }))
    await waitFor(() => expect(requests.last().get('sort')).toBe('salary'))
    expect(requests.last().get('dir')).toBe('asc')

    await user.click(screen.getByRole('button', { name: 'Salary' }))
    await waitFor(() => expect(requests.last().get('dir')).toBe('desc'))

    await choose(user, 'Country', 'All')
    await waitFor(() => expect(requests.last().get('country')).toBeNull())
    expect(requests.last().get('sort')).toBeNull()
  })

  it('moves to the next page', async () => {
    const requests = mockEmployees([ana], 60)
    const { user } = renderApp('/employees')
    await screen.findByText('Ana Silva')

    await user.click(screen.getByRole('button', { name: /next page/i }))

    await waitFor(() => expect(requests.last().get('page')).toBe('2'))
    expect(await screen.findByText('26–50 of 60')).toBeInTheDocument()
  })

  it('says so when no employee matches', async () => {
    mockEmployees([])
    renderApp('/employees?q=nobody')

    expect(await screen.findByText(/no employees match/i)).toBeInTheDocument()
  })

  it('explains a failed load', async () => {
    server.use(http.get('*/api/v1/employees', () => HttpResponse.json({}, { status: 500 })))
    renderApp('/employees')

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load employees/i)
  })

  it('explains when the account has no access to employee data', async () => {
    server.use(
      http.get('*/api/v1/employees', () =>
        HttpResponse.json({ errors: { base: ['Not allowed'] } }, { status: 403 }),
      ),
    )
    renderApp('/employees')

    expect(await screen.findByRole('alert')).toHaveTextContent(/doesn't have access/i)
  })

  it('downloads every matching employee as CSV with the current search and filters', async () => {
    mockEmployees()
    let csvQuery: URLSearchParams | undefined
    server.use(
      http.get('*/api/v1/employees.csv', ({ request }) => {
        csvQuery = new URL(request.url).searchParams
        return new HttpResponse('full_name\n', { headers: { 'Content-Type': 'text/csv' } })
      }),
    )
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { user } = renderApp('/employees?country=IN&q=ana')
    await screen.findByText('Ana Silva')

    await user.click(screen.getByRole('button', { name: /download csv/i }))

    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(csvQuery?.get('country')).toBe('IN')
    expect(csvQuery?.get('q')).toBe('ana')
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:test'))
  })

  it('explains a failed CSV download', async () => {
    mockEmployees()
    server.use(http.get('*/api/v1/employees.csv', () => new HttpResponse(null, { status: 500 })))
    const { user } = renderApp('/employees')
    await screen.findByText('Ana Silva')

    await user.click(screen.getByRole('button', { name: /download csv/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't download/i)
  })

  it('sends only known list parameters, and no salary sort without a country', async () => {
    const requests = mockEmployees()
    renderApp('/employees?sort=salary&dir=desc&limit=100&format=csv')
    await screen.findByText('Ana Silva')

    expect([...requests.last().keys()]).toEqual([])
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('offers a way back from a page past the end', async () => {
    const requests = mockEmployees([], 60)
    const { user } = renderApp('/employees?page=9')

    await user.click(await screen.findByRole('button', { name: /back to page 1/i }))

    await waitFor(() => expect(requests.last().get('page')).toBeNull())
  })

  it('shows the filter from the URL before the options have loaded', async () => {
    mockEmployees()
    renderApp('/employees?country=IN')

    expect(await screen.findByRole('combobox', { name: 'Country' })).toHaveTextContent('India')
  })

  it('does not crash on an unknown country code in the URL', async () => {
    mockEmployees()
    renderApp('/employees?country=foo')

    await screen.findByText('Ana Silva')
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('foo')
  })
})
