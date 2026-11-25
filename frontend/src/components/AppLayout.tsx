import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router-dom'
import { fetchCurrentUser, signOut } from '../api/session'
import { setToken } from '../api/token'

// NavLink adds the `active` class to the link of the current page.
const activeLink = { '&.active': { textDecoration: 'underline', textUnderlineOffset: 6 } }

// Header + page content for signed-in pages. Loading the current user also checks the stored
// token on every visit: an expired one gets a 401, which sends the user to sign-in.
export default function AppLayout() {
  const { data } = useQuery({ queryKey: ['session'], queryFn: fetchCurrentUser })

  function handleSignOut() {
    // Sign out locally at once, without waiting for the server (the request has already read the
    // token). If the server can't be reached, the session still expires on its own.
    signOut().catch(() => {})
    setToken(null)
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" component="span" sx={{ mr: 2 }}>
            Salary Management
          </Typography>
          <Button color="inherit" component={NavLink} to="/employees" sx={activeLink}>
            Employees
          </Button>
          <Button color="inherit" component={NavLink} to="/insights" sx={activeLink}>
            Insights
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2">{data?.user.email}</Typography>
          <Button color="inherit" onClick={handleSignOut}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </>
  )
}
