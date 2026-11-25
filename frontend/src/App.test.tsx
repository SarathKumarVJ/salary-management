import { screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TOKEN_KEY } from './api/token'
import { renderApp } from './test/render'
import { hrManager, server } from './test/server'

function mockCurrentUser() {
  server.use(
    http.get('*/api/v1/session', ({ request }) =>
      request.headers.get('Authorization') === 'Bearer valid-token'
        ? HttpResponse.json({ user: hrManager })
        : HttpResponse.json({ errors: { base: ['Not signed in'] } }, { status: 401 }),
    ),
  )
}

async function signIn(user: ReturnType<typeof renderApp>['user']) {
  await user.type(screen.getByLabelText(/email/i), 'hr@acme.test')
  await user.type(screen.getByLabelText(/password/i), 'local-dev-password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('sign-in and protected pages', () => {
  it('sends a signed-out visitor to the sign-in page', async () => {
    renderApp('/employees')

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('signs in, keeps the token and returns to the page that was asked for', async () => {
    mockCurrentUser()
    server.use(
      http.post('*/api/v1/session', async ({ request }) => {
        const body = (await request.json()) as { email: string; password: string }
        return body.password === 'local-dev-password'
          ? HttpResponse.json({ token: 'valid-token', user: hrManager }, { status: 201 })
          : HttpResponse.json({ errors: { base: ['Invalid email or password'] } }, { status: 401 })
      }),
    )
    const { user } = renderApp('/insights')

    await signIn(user)

    expect(await screen.findByRole('heading', { name: /insights/i })).toBeInTheDocument()
    expect(await screen.findByText('hr@acme.test')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('aria-current', 'page')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('valid-token')
  })

  it('shows the error from the API when the credentials are wrong', async () => {
    server.use(
      http.post('*/api/v1/session', () =>
        HttpResponse.json({ errors: { base: ['Invalid email or password'] } }, { status: 401 }),
      ),
    )
    const { user } = renderApp('/sign-in')

    await signIn(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('shows a friendly error when the server cannot be reached', async () => {
    server.use(http.post('*/api/v1/session', () => HttpResponse.error()))
    const { user } = renderApp('/sign-in')

    await signIn(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(/can't reach the server/i)
  })

  it('explains when sign-in is rate limited', async () => {
    server.use(http.post('*/api/v1/session', () => new HttpResponse(null, { status: 429 })))
    const { user } = renderApp('/sign-in')

    await signIn(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many attempts/i)
  })

  it('sends a user with an expired token back to sign-in and forgets the token', async () => {
    mockCurrentUser()
    localStorage.setItem(TOKEN_KEY, 'expired-token')
    renderApp('/employees')

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('sends a signed-in user from sign-in to the employees page', async () => {
    mockCurrentUser()
    localStorage.setItem(TOKEN_KEY, 'valid-token')
    renderApp('/sign-in')

    expect(await screen.findByRole('heading', { name: /employees/i })).toBeInTheDocument()
  })

  it('signs out on the server and locally', async () => {
    mockCurrentUser()
    let revokedToken: string | null = null
    server.use(
      http.delete('*/api/v1/session', ({ request }) => {
        revokedToken = request.headers.get('Authorization')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    localStorage.setItem(TOKEN_KEY, 'valid-token')
    const { user } = renderApp('/employees')

    await user.click(await screen.findByRole('button', { name: /sign out/i }))

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(revokedToken).toBe('Bearer valid-token')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('signs out at once, without waiting for a slow server', async () => {
    mockCurrentUser()
    server.use(http.delete('*/api/v1/session', () => delay('infinite')))
    localStorage.setItem(TOKEN_KEY, 'valid-token')
    const { user } = renderApp('/employees')

    await user.click(await screen.findByRole('button', { name: /sign out/i }))

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('signs out when another tab signs out', async () => {
    mockCurrentUser()
    localStorage.setItem(TOKEN_KEY, 'valid-token')
    renderApp('/employees')
    await screen.findByText('hr@acme.test')

    // The other tab removes the token; the browser tells this tab with a storage event.
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY }))

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })
})
