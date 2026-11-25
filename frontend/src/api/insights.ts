import type { InsightGroup, Insights } from '../types/api'
import { api } from './client'

/** Without a country, job titles and departments come back in USD (converted before aggregating). */
export const fetchInsights = (group: InsightGroup, country: string) =>
  api<Insights>(`/insights?${new URLSearchParams(country ? { group, country } : { group })}`)
