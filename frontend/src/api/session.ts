import type { User } from '../types/api'
import { api } from './client'

export const signIn = (email: string, password: string) =>
  api<{ token: string; user: User }>('/session', { method: 'POST', body: { email, password } })

export const fetchCurrentUser = () => api<{ user: User }>('/session')

export const signOut = () => api<void>('/session', { method: 'DELETE' })
