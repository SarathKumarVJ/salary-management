import type { EmployeePage, FilterOptions } from '../types/api'
import { api, download } from './client'

// `query` is the list's URL query string; its names match the API's (q, country, sort, page, ...).
export const fetchEmployees = (query: string) => api<EmployeePage>(`/employees?${query}`)

export const downloadEmployeesCsv = (query: string) => download(`/employees.csv?${query}`, 'employees.csv')

export const fetchFilterOptions = () => api<FilterOptions>('/filters')
