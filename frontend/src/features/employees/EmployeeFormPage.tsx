import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, InputAdornment,
  MenuItem, Paper, TextField, Typography, type TextFieldProps,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createEmployee, deleteEmployee, fetchEmployee, fetchFilterOptions, updateEmployee } from '../../api/employees'
import { countryName } from '../../format'
import type { Employee, EmployeeInput } from '../../types/api'

const FIELDS = ['full_name', 'email', 'job_title', 'department', 'level', 'country', 'salary', 'hire_date'] as const
const humanize = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replaceAll('_', ' ')
const toInput = (employee?: Employee) =>
  Object.fromEntries(FIELDS.map((field) => [field, employee?.[field] ?? ''])) as EmployeeInput

// /employees/new adds an employee; /employees/:id edits (or deletes) one.
export default function EmployeeFormPage() {
  const { id } = useParams()
  const validId = id !== undefined && /^\d+$/.test(id)
  // The form copies the employee once, so a background refetch would show nothing new; it could
  // only fail and replace the form (and unsaved edits) with an error.
  const query = useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id!),
    enabled: validId,
    refetchOnWindowFocus: false,
  })

  // key: a different employee (or "new") gets a fresh form, never the previous one's values.
  if (id === undefined) return <EmployeeForm key="new" />
  if (!validId || query.isError) {
    const gone = !validId || (query.error instanceof ApiError && query.error.status === 404)
    return (
      <Alert severity="error">
        {gone ? 'This employee no longer exists.' : "Couldn't load the employee. Please try again."}{' '}
        <Link to="/employees">Back to the list</Link>
      </Alert>
    )
  }
  if (!query.data) return <Typography>Loading employee…</Typography>
  return <EmployeeForm key={id} employee={query.data.employee} />
}

function EmployeeForm({ employee }: { employee?: Employee }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const options = useQuery({ queryKey: ['filters'], queryFn: fetchFilterOptions })
  const [values, setValues] = useState(() => toInput(employee))
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Back to the list with the search and filters it had when the user left it.
  const list = (location.state as { list?: string } | null)?.list
  const listUrl = list ? `/employees?${list}` : '/employees'

  // Salaries, filter options and insights may all have changed. Remove (not just invalidate) cached
  // data except who is signed in, so the list shows "Loading" rather than flashing a deleted row.
  // replace: Back from the list doesn't reopen this (now stale) form.
  function finish() {
    queryClient.removeQueries({ predicate: ({ queryKey }) => queryKey[0] !== 'session' })
    navigate(listUrl, { replace: true })
  }

  const save = useMutation({
    mutationFn: () => (employee ? updateEmployee(employee.id, values) : createEmployee(values)),
    onSuccess: finish,
  })
  const remove = useMutation({
    mutationFn: () => deleteEmployee(employee!.id),
    onSuccess: finish,
    // Already deleted elsewhere: the outcome the user wanted.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) finish()
    },
  })

  // 422: `{ errors: { field: [messages] } }`. Form fields show theirs underneath; any other
  // (base, or an attribute not on the form) goes in the banner.
  const invalid = save.error instanceof ApiError && save.error.status === 422
  const fieldErrors = invalid ? (save.error as ApiError).errors : {}
  const otherErrors = Object.entries(fieldErrors)
    .filter(([key]) => !(FIELDS as readonly string[]).includes(key))
    .flatMap(([key, messages]) => messages.map((message) => (key === 'base' ? message : `${humanize(key)} ${message}`)))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  const field = (name: (typeof FIELDS)[number], label: string, props: TextFieldProps = {}) => (
    <TextField
      label={label}
      required
      value={values[name]}
      onChange={(event) => setValues({ ...values, [name]: event.target.value })}
      error={Boolean(fieldErrors[name])}
      helperText={fieldErrors[name]?.map((message) => `${label} ${message}`).join('. ')}
      {...props}
    />
  )

  // The saved value stays selectable even before the options load.
  const choices = (current: string, available: string[] = []) => [...new Set([...(current ? [current] : []), ...available])]
  const currency = options.data?.currencies[values.country]

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, maxWidth: 720 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {employee ? 'Edit employee' : 'Add employee'}
      </Typography>
      {save.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {invalid
            ? otherErrors.join('. ') || 'Please correct the highlighted fields.'
            : "Couldn't save the employee. Please try again."}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2 }}>
        {field('full_name', 'Full name')}
        {field('email', 'Email', { type: 'email' })}
        {/* Free text, with existing values suggested so groups in insights don't split on typos. */}
        {field('job_title', 'Job title', { slotProps: { htmlInput: { list: 'job-titles' } } })}
        {field('department', 'Department', { slotProps: { htmlInput: { list: 'departments' } } })}
        {field('level', 'Level', {
          select: true,
          children: choices(values.level, options.data?.levels).map((level) => (
            <MenuItem key={level} value={level}>{level}</MenuItem>
          )),
        })}
        {field('country', 'Country', {
          select: true,
          children: choices(values.country, options.data?.countries).map((code) => (
            <MenuItem key={code} value={code}>{countryName(code)}</MenuItem>
          )),
        })}
        {field('salary', 'Salary', {
          type: 'number',
          slotProps: {
            htmlInput: { min: 0.01, max: 9999999999.99, step: 0.01 }, // the API's limits
            input: { endAdornment: currency && <InputAdornment position="end">{currency}</InputAdornment> },
          },
        })}
        {field('hire_date', 'Hire date', { type: 'date', slotProps: { inputLabel: { shrink: true } } })}
      </Box>
      <datalist id="job-titles">
        {options.data?.job_titles.map((title) => <option key={title} value={title} />)}
      </datalist>
      <datalist id="departments">
        {options.data?.departments.map((department) => <option key={department} value={department} />)}
      </datalist>

      <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
        <Button type="submit" variant="contained" loading={save.isPending}>
          Save
        </Button>
        <Button component={Link} to={listUrl}>
          Cancel
        </Button>
        {employee && (
          <Button color="error" sx={{ ml: 'auto' }} onClick={() => setConfirmingDelete(true)}>
            Delete
          </Button>
        )}
      </Box>

      {employee && (
        <Dialog
          open={confirmingDelete}
          onClose={() => setConfirmingDelete(false)}
          aria-describedby="delete-employee-description"
        >
          <DialogTitle>Delete employee?</DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-employee-description">
              {employee.full_name} will be removed permanently.
            </DialogContentText>
            {remove.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Couldn't delete the employee. Please try again.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmingDelete(false)}>Cancel</Button>
            <Button color="error" loading={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Paper>
  )
}
