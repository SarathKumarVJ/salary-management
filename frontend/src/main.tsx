import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApiError } from './api/client'
import App from './App'

const theme = createTheme({ typography: { fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif' } })

const isClientError = (error: Error) => error instanceof ApiError && error.status < 500

// Network errors and 5xx get one more try; a 4xx would fail again, so it isn't retried.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (failureCount, error) => failureCount === 0 && !isClientError(error) } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
