import type { ApiErrors } from '../types/api'
import { getToken, setToken } from './token'

// Unset in development: same-origin /api, proxied to Rails by Vite.
const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`

export class ApiError extends Error {
  readonly status: number
  readonly errors: ApiErrors

  constructor(status: number, errors: ApiErrors) {
    const fallback = status === 429 ? 'Too many attempts. Wait a few minutes and try again.' : `Request failed (${status})`
    super(errors.base?.[0] ?? fallback)
    this.status = status
    this.errors = errors
  }
}

/** Sends the request with the bearer token and handles an expired session. */
async function request(path: string, method: string, body?: unknown) {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(BASE_URL + path, { method, headers, body: JSON.stringify(body) })
  // Expired or revoked session: forgetting the token sends the user to sign-in. Only if it's still
  // the token we sent: a slow request from before a fresh sign-in must not sign the user out.
  if (response.status === 401 && token && getToken() === token) setToken(null)
  return response
}

/** Calls a JSON endpoint. Throws ApiError for any non-2xx response. */
export async function api<T>(path: string, { method = 'GET', body }: { method?: string; body?: unknown } = {}) {
  const response = await request(path, method, body)
  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, data.errors ?? {})
  return data as T
}

/** Saves a file from the API. A plain link can't send the bearer token, so fetch it and save the blob. */
export async function download(path: string, filename: string) {
  const response = await request(path, 'GET')
  if (!response.ok) throw new ApiError(response.status, {})

  const url = URL.createObjectURL(await response.blob())
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(link) // some browsers only download from a link that is in the page
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url)) // freeing it in the same tick can cancel the download
}
