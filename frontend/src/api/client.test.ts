import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { api } from './client'
import { getToken, setToken } from './token'

describe('api', () => {
  it('keeps a newer token when a request made with an older one comes back 401', async () => {
    let respond = () => {}
    server.use(
      http.get('*/api/v1/session', async () => {
        await new Promise<void>((resolve) => (respond = resolve))
        return HttpResponse.json({ errors: { base: ['Not signed in'] } }, { status: 401 })
      }),
    )
    setToken('old-token')

    const request = api('/session')
    await new Promise((resolve) => setTimeout(resolve, 0))
    setToken('new-token') // signed in again while the old request was in flight
    respond()

    await expect(request).rejects.toThrow('Not signed in')
    expect(getToken()).toBe('new-token')
  })
})
