import { Alert, Box, Button, Container, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { signIn } from '../../api/session'
import { setToken, useToken } from '../../api/token'

export default function SignInPage() {
  const token = useToken()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const mutation = useMutation({
    mutationFn: () => signIn(email, password),
    onSuccess: (data) => setToken(data.token),
  })

  // Signed in (now or already): go back to the page that sent us here, if it is one of ours.
  const from = (location.state as { from?: string } | null)?.from
  if (token) return <Navigate to={from?.startsWith('/') && !from.startsWith('//') ? from : '/employees'} replace />

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  const error = mutation.error
  return (
    <Container maxWidth="xs" sx={{ mt: 12 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Sign in
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          {error && (
            <Alert severity="error">
              {error instanceof ApiError ? error.message : "Can't reach the server. Please try again."}
            </Alert>
          )}
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            Sign in
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
