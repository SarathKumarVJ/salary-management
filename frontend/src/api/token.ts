import { useSyncExternalStore } from 'react'

// The bearer token lives in localStorage so a page refresh keeps you signed in
// (trade-off in docs/design.md). Components read it with useToken() and re-render when it changes.
export const TOKEN_KEY = 'salary-management.token'
const listeners = new Set<() => void>()

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  listeners.forEach((notify) => notify())
}

// Also listens for `storage` events, which the browser fires when another tab signs in or out.
function subscribe(notify: () => void) {
  listeners.add(notify)
  window.addEventListener('storage', notify)
  return () => {
    listeners.delete(notify)
    window.removeEventListener('storage', notify)
  }
}

export function useToken() {
  return useSyncExternalStore(subscribe, getToken)
}
