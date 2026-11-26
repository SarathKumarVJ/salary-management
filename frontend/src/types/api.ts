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

/** What the form sends: currency is derived from country by the API. */
export type EmployeeInput = Omit<Employee, 'id' | 'currency'>

export type EmployeePage = {
  employees: Employee[]
  meta: { page: number; limit: number; count: number; pages: number }
}

export type FilterOptions = {
  countries: string[]
  /** Country code → its currency, e.g. { IN: "INR" }. */
  currencies: Record<string, string>
  levels: string[]
  departments: string[]
  job_titles: string[]
  /** Department → the job titles in use there, for narrowing the job title filter. */
  job_titles_by_department: Record<string, string[]>
}

/** One statistics group (a country, job title or department). Money values are 2dp decimal strings. */
export type InsightRow = {
  name: string
  currency: string
  headcount: number
  min: string
  median: string
  avg: string
  max: string
  median_usd: string
}

export type InsightGroup = 'country' | 'job_title' | 'department'

export type Insights = { group: InsightGroup; rates_as_of: string; rows: InsightRow[] }
