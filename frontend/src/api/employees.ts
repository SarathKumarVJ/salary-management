import type { Employee, EmployeeInput, EmployeePage, FilterOptions } from '../types/api'
import { api, download } from './client'

// `query` is the list's URL query string; its names match the API's (q, country, sort, page, ...).
export const fetchEmployees = (query: string) => api<EmployeePage>(`/employees?${query}`)

export const downloadEmployeesCsv = (query: string) => download(`/employees.csv?${query}`, 'employees.csv')

export const fetchFilterOptions = () => api<FilterOptions>('/filters')

// The id comes from the URL here (a string); update and delete take a loaded Employee's numeric id.
export const fetchEmployee = (id: string) => api<{ employee: Employee }>(`/employees/${encodeURIComponent(id)}`)

export const createEmployee = (employee: EmployeeInput) =>
  api<{ employee: Employee }>('/employees', { method: 'POST', body: { employee } })

export const updateEmployee = (id: number, employee: EmployeeInput) =>
  api<{ employee: Employee }>(`/employees/${id}`, { method: 'PATCH', body: { employee } })

export const deleteEmployee = (id: number) => api<void>(`/employees/${id}`, { method: 'DELETE' })
