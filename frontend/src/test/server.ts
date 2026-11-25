import { setupServer } from 'msw/node'

// Each test registers the API responses it needs with server.use(...).
export const server = setupServer()
