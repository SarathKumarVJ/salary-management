// Shapes of the Rails API JSON (see docs/design.md, "API surface").

/** `{ "errors": { field: [messages] } }`; `base` holds errors not tied to a field. */
export type ApiErrors = Record<string, string[]>

export type User = { email: string; role: 'hr_manager' | null }

export type Employee = {
  id: number
  full_name: string
  email: string
  job_title: string
  department: string
  level: string
  country: string
  currency: string
  /** Exact decimal string with two places, e.g. "1500000.00". */
  salary: string
  /** ISO date, e.g. "2020-04-01". */
  hire_date: string
}

export type EmployeePage = {
  employees: Employee[]
  meta: { page: number; limit: number; count: number; pages: number }
}

export type FilterOptions = { countries: string[]; levels: string[]; departments: string[]; job_titles: string[] }
