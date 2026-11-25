import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const hrManager = { email: 'hr@acme.test', role: 'hr_manager' }

// Baseline responses so every signed-in page renders; tests override them with server.use(...).
export const server = setupServer(
  http.get('*/api/v1/session', () => HttpResponse.json({ user: hrManager })),
  http.get('*/api/v1/employees', () =>
    HttpResponse.json({ employees: [], meta: { page: 1, limit: 25, count: 0, pages: 1 } }),
  ),
  http.get('*/api/v1/filters', () =>
    HttpResponse.json({ countries: [], currencies: {}, levels: [], departments: [], job_titles: [] }),
  ),
)
