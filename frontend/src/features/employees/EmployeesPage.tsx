import {
  Alert, Box, Button, Link, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TableSortLabel, TextField, Typography,
} from '@mui/material'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import type { FormEvent, ReactNode } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { downloadEmployeesCsv, fetchEmployees, fetchFilterOptions } from '../../api/employees'
import { countryName, formatMoney } from '../../format'

const LIST_PARAMS = ['q', 'country', 'department', 'job_title', 'sort', 'dir', 'page']
const SORTABLE = ['full_name', 'hire_date', 'salary']

// Keeps only the list's own parameters (a hand-edited URL can't add others), and drops a salary
// sort without a country: salaries are in local currency, so they only compare within one country.
function listParams(params: URLSearchParams) {
  const kept = new URLSearchParams()
  LIST_PARAMS.forEach((key) => params.get(key) && kept.set(key, params.get(key)!))
  const sort = kept.get('sort')
  if (sort && (!SORTABLE.includes(sort) || (sort === 'salary' && !kept.get('country')))) {
    kept.delete('sort')
    kept.delete('dir')
  }
  return kept
}

// Search, filters, sort and page live in the URL (?q=&country=&sort=&page=...), so they survive a
// refresh and the back button. The API takes the same parameter names.
export default function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = listParams(searchParams)
  const query = params.toString()
  const country = params.get('country') ?? ''
  const sort = params.get('sort') ?? 'full_name'
  const dir = params.get('dir') === 'desc' ? 'desc' : 'asc'

  // keepPreviousData: the current rows stay on screen (dimmed) while the next page or filter loads.
  const list = useQuery({ queryKey: ['employees', query], queryFn: () => fetchEmployees(query), placeholderData: keepPreviousData })
  const options = useQuery({ queryKey: ['filters'], queryFn: fetchFilterOptions })
  // The CSV has every matching employee (the API ignores `page`).
  const csv = useMutation({ mutationFn: () => downloadEmployeesCsv(query) })

  // Empty values are removed. Any change except paging starts again from page 1.
  function update(changes: Record<string, string>) {
    csv.reset()
    setSearchParams((current) => {
      const next = listParams(current)
      Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
      if (!('page' in changes)) next.delete('page')
      return listParams(next)
    })
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    update({ q: String(new FormData(event.currentTarget).get('q')).trim() })
  }

  const sortableCell = (column: string, label: string, align: 'left' | 'right' = 'left') => (
    <TableCell align={align} sortDirection={sort === column ? dir : false}>
      <TableSortLabel
        active={sort === column}
        direction={sort === column ? dir : 'asc'}
        onClick={() => update({ sort: column, dir: sort === column && dir === 'asc' ? 'desc' : 'asc' })}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  )

  // The value from the URL stays selectable even before the options load (or if it is no longer in use).
  const filterSelect = (name: string, label: string, values: string[] = [], optionLabel = (value: string) => value) => {
    const value = params.get(name) ?? ''
    return (
      <TextField select size="small" label={label} value={value} onChange={(event) => update({ [name]: event.target.value })} sx={{ minWidth: 180 }}>
        <MenuItem value="">All</MenuItem>
        {[...new Set([...(value ? [value] : []), ...values])].map((option) => (
          <MenuItem key={option} value={option}>
            {optionLabel(option)}
          </MenuItem>
        ))}
      </TextField>
    )
  }

  const data = list.data
  let content: ReactNode
  if (list.isError) {
    const forbidden = list.error instanceof ApiError && list.error.status === 403
    content = (
      <Alert severity="error">
        {forbidden ? "Your account doesn't have access to employee data." : "Couldn't load employees. Please try again."}
      </Alert>
    )
  } else if (!data) {
    content = <Typography>Loading employees…</Typography>
  } else if (data.meta.count === 0) {
    content = <Typography>No employees match your search and filters.</Typography>
  } else if (data.employees.length === 0) {
    content = (
      <Typography>
        This page is past the end of the list. <Button onClick={() => update({ page: '' })}>Back to page 1</Button>
      </Typography>
    )
  } else {
    content = (
      <Paper sx={{ opacity: list.isPlaceholderData ? 0.6 : 1 }}>
        <TableContainer>
          <Table size="small" aria-label="Employees">
            <TableHead>
              <TableRow>
                {sortableCell('full_name', 'Name')}
                <TableCell>Job title</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Country</TableCell>
                {country ? sortableCell('salary', 'Salary', 'right') : <TableCell align="right">Salary</TableCell>}
                {sortableCell('hire_date', 'Hire date')}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    {/* state: the form returns to this list with the same search and filters. */}
                    <Link component={RouterLink} to={`/employees/${employee.id}`} state={{ list: query }}>
                      {employee.full_name}
                    </Link>
                    <Typography variant="body2" color="text.secondary">
                      {employee.email}
                    </Typography>
                  </TableCell>
                  <TableCell>{employee.job_title}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.level}</TableCell>
                  <TableCell>{countryName(employee.country)}</TableCell>
                  <TableCell align="right">{formatMoney(employee.salary, employee.currency)}</TableCell>
                  <TableCell>{employee.hire_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data.meta.count}
          page={data.meta.page - 1}
          rowsPerPage={data.meta.limit}
          rowsPerPageOptions={[]}
          onPageChange={(_event, page) => update({ page: String(page + 1) })}
        />
      </Paper>
    )
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Employees
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" loading={csv.isPending} onClick={() => csv.mutate()}>
            Download CSV
          </Button>
          <Button variant="contained" component={RouterLink} to="/employees/new" state={{ list: query }}>
            Add employee
          </Button>
        </Box>
      </Box>
      {csv.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Couldn't download the CSV. Please try again.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box component="form" role="search" onSubmit={handleSearch}>
          {/* key: remount when q changes in the URL (e.g. back button), so the box shows it. */}
          <TextField
            key={params.get('q')}
            name="q"
            type="search"
            size="small"
            label="Search name or email"
            defaultValue={params.get('q') ?? ''}
          />
        </Box>
        {filterSelect('country', 'Country', options.data?.countries, countryName)}
        {filterSelect('department', 'Department', options.data?.departments)}
        {filterSelect('job_title', 'Job title', options.data?.job_titles)}
      </Box>

      {content}
    </>
  )
}
