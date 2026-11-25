import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { TOKEN_KEY } from '../../api/token'
import type { Employee } from '../../types/api'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const ana: Employee = {
  id: 7, full_name: 'Ana Silva', email: 'ana.silva@acme.test', job_title: 'Software Engineer',
  department: 'Engineering', level: 'L3', country: 'IN', currency: 'INR', salary: '2300000.00', hire_date: '2020-04-01',
}

type User = ReturnType<typeof renderApp>['user']

function mockApi() {
  const listRequests: URLSearchParams[] = []
  const sent: { method: string; path: string; body?: unknown }[] = []
  server.use(
    http.get('*/api/v1/filters', () =>
      HttpResponse.json({
        countries: ['IN', 'US'], currencies: { IN: 'INR', US: 'USD' }, levels: ['L1', 'L2', 'L3'],
        departments: ['Engineering'], job_titles: ['Software Engineer'],
      }),
    ),
    http.get('*/api/v1/employees', ({ request }) => {
      listRequests.push(new URL(request.url).searchParams)
      return HttpResponse.json({ employees: [ana], meta: { page: 1, limit: 25, count: 1, pages: 1 } })
    }),
    http.get('*/api/v1/employees/7', () => HttpResponse.json({ employee: ana })),
    http.post('*/api/v1/employees', async ({ request }) => {
      sent.push({ method: 'POST', path: '/employees', body: await request.json() })
      return HttpResponse.json({ employee: { ...ana, id: 8 } }, { status: 201 })
    }),
    http.patch('*/api/v1/employees/7', async ({ request }) => {
      sent.push({ method: 'PATCH', path: '/employees/7', body: await request.json() })
      return HttpResponse.json({ employee: ana })
    }),
    http.delete('*/api/v1/employees/7', () => {
      sent.push({ method: 'DELETE', path: '/employees/7' })
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return { listRequests, sent }
}

async function choose(user: User, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function fillNewEmployee(user: User) {
  await user.type(screen.getByLabelText(/full name/i), 'Ravi Kumar')
  await user.type(screen.getByLabelText(/email/i), 'ravi.kumar@acme.test')
  await user.type(screen.getByLabelText(/job title/i), 'Software Engineer')
  await user.type(screen.getByLabelText(/department/i), 'Engineering')
  await choose(user, 'Level', 'L2')
  await choose(user, 'Country', 'India')
  await user.type(screen.getByLabelText(/salary/i), '1800000.50')
  await user.type(screen.getByLabelText(/hire date/i), '2024-05-01')
}

describe('employee form', () => {
  beforeEach(() => localStorage.setItem(TOKEN_KEY, 'valid-token'))

  it('adds an employee, with the salary in the country currency, and returns to the list', async () => {
    const requests = mockApi()
    const { user } = renderApp('/employees')
    await user.click(await screen.findByRole('link', { name: /add employee/i }))
    await screen.findByRole('heading', { name: /add employee/i })

    await fillNewEmployee(user)
    expect(screen.getByText('INR')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /save/i }))

    await screen.findByRole('heading', { name: 'Employees' })
    expect(requests.sent).toEqual([{
      method: 'POST', path: '/employees',
      body: { employee: {
        full_name: 'Ravi Kumar', email: 'ravi.kumar@acme.test', job_title: 'Software Engineer', department: 'Engineering',
        level: 'L2', country: 'IN', salary: '1800000.50', hire_date: '2024-05-01',
      } },
    }])
  })

  it('shows the API validation errors next to their fields', async () => {
    mockApi()
    server.use(
      http.post('*/api/v1/employees', () =>
        HttpResponse.json(
          { errors: { email: ['has already been taken'], hire_date: ["can't be in the future"] } },
          { status: 422 },
        ),
      ),
    )
    const { user } = renderApp('/employees/new')
    await screen.findByRole('heading', { name: /add employee/i })

    await fillNewEmployee(user)
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Email has already been taken')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toHaveAccessibleDescription('Email has already been taken')
    expect(screen.getByLabelText(/hire date/i)).toHaveAccessibleDescription("Hire date can't be in the future")
    expect(screen.getByRole('heading', { name: /add employee/i })).toBeInTheDocument()
  })

  it('edits an employee from the list and returns to the same filtered list', async () => {
    const requests = mockApi()
    const { user } = renderApp('/employees?country=IN')
    await user.click(await screen.findByRole('link', { name: 'Ana Silva' }))

    const salary = await screen.findByLabelText(/salary/i)
    expect(salary).toHaveValue(2300000)
    await user.clear(salary)
    await user.type(salary, '2500000')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await screen.findByRole('heading', { name: 'Employees' })
    expect(requests.sent[0]).toMatchObject({ method: 'PATCH', body: { employee: { salary: '2500000', country: 'IN' } } })
    await waitFor(() => expect(requests.listRequests.at(-1)?.get('country')).toBe('IN'))
  })

  it('deletes an employee after confirmation', async () => {
    const requests = mockApi()
    const { user } = renderApp('/employees/7')
    await user.click(await screen.findByRole('button', { name: /delete/i }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Ana Silva')
    await user.click(within(dialog).getByRole('button', { name: /delete/i }))

    await screen.findByRole('heading', { name: 'Employees' })
    expect(requests.sent).toEqual([{ method: 'DELETE', path: '/employees/7' }])
  })

  it('keeps the employee when the deletion is cancelled', async () => {
    const requests = mockApi()
    const { user } = renderApp('/employees/7')
    await user.click(await screen.findByRole('button', { name: /delete/i }))

    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /cancel/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(requests.sent).toEqual([])
  })

  it('says so when the employee does not exist', async () => {
    mockApi()
    server.use(
      http.get('*/api/v1/employees/99', () => HttpResponse.json({ errors: { base: ['Not found'] } }, { status: 404 })),
    )
    renderApp('/employees/99')

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer exists/i)
  })

  it('shows validation errors for attributes that are not on the form in the banner', async () => {
    mockApi()
    server.use(
      http.post('*/api/v1/employees', () =>
        HttpResponse.json({ errors: { currency: ["can't be blank"] } }, { status: 422 }),
      ),
    )
    const { user } = renderApp('/employees/new')
    await screen.findByRole('heading', { name: /add employee/i })

    await fillNewEmployee(user)
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Currency can't be blank")
  })

  it('explains a failed save', async () => {
    mockApi()
    server.use(http.patch('*/api/v1/employees/7', () => HttpResponse.json({}, { status: 500 })))
    const { user } = renderApp('/employees/7')

    await user.click(await screen.findByRole('button', { name: /save/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't save the employee/i)
  })

  it('explains a failed deletion inside the confirmation dialog', async () => {
    mockApi()
    server.use(http.delete('*/api/v1/employees/7', () => HttpResponse.json({}, { status: 500 })))
    const { user } = renderApp('/employees/7')
    await user.click(await screen.findByRole('button', { name: /delete/i }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleDescription(/removed permanently/i)
    await user.click(within(dialog).getByRole('button', { name: /delete/i }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/couldn't delete/i)
  })

  it('returns to the list when the employee was already deleted elsewhere', async () => {
    mockApi()
    server.use(
      http.delete('*/api/v1/employees/7', () => HttpResponse.json({ errors: { base: ['Not found'] } }, { status: 404 })),
    )
    const { user } = renderApp('/employees/7')
    await user.click(await screen.findByRole('button', { name: /delete/i }))

    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /delete/i }))

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument()
  })

  it('does not look up an id that is not a number', async () => {
    mockApi()
    renderApp('/employees/abc')

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer exists/i)
  })
})
