import {
  Alert, Box, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { fetchFilterOptions } from '../../api/employees'
import { fetchInsights } from '../../api/insights'
import { countryName, formatMoney, optionsWith } from '../../format'
import type { InsightGroup } from '../../types/api'

const GROUPS: Record<InsightGroup, { label: string; one: string; many: string }> = {
  country: { label: 'Country', one: 'country', many: 'countries' },
  job_title: { label: 'Job title', one: 'job title', many: 'job titles' },
  department: { label: 'Department', one: 'department', many: 'departments' },
}

// "How do we pay people?": salary statistics per country, job title or department (?group=&country=).
// By country: each country in its own currency, compared side by side through the median in USD.
// By job title or department: one country's currency, or USD org-wide (converted before aggregating).
export default function InsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const group = (Object.keys(GROUPS) as InsightGroup[]).find((key) => key === searchParams.get('group')) ?? 'country'
  const byCountry = group === 'country'
  const country = byCountry ? '' : (searchParams.get('country') ?? '').trim().toUpperCase()

  const insights = useQuery({ queryKey: ['insights', group, country], queryFn: () => fetchInsights(group, country) })
  const options = useQuery({ queryKey: ['filters'], queryFn: fetchFilterOptions })

  // The country filter only applies to job titles and departments.
  const change = (nextGroup: InsightGroup, nextCountry: string) =>
    setSearchParams(nextGroup !== 'country' && nextCountry ? { group: nextGroup, country: nextCountry } : { group: nextGroup })

  const rows = insights.data?.rows ?? []
  const label = (name: string) => (byCountry ? countryName(name) : name)

  let content: ReactNode
  if (insights.isError) {
    const status = insights.error instanceof ApiError ? insights.error.status : 0
    content = (
      <Alert severity="error">
        {status === 403
          ? "Your account doesn't have access to salary data."
          : status === 400
            ? `${country} isn't supported. Choose a country from the list.`
            : "Couldn't load insights. Please try again."}
      </Alert>
    )
  } else if (!insights.data) {
    content = <Typography>Loading insights…</Typography>
  } else if (rows.length === 0) {
    content = <Typography>There are no employees to summarise.</Typography>
  } else {
    // The chart needs one currency: by country it plots the USD median; otherwise every row shares one currency.
    const chartCurrency = byCountry ? 'USD' : rows[0].currency
    const chartValue = (row: (typeof rows)[number]) => Number(byCountry ? row.median_usd : row.median)
    const max = Math.max(...rows.map(chartValue))
    const headcount = rows.reduce((sum, row) => sum + row.headcount, 0)
    const { one, many } = GROUPS[group]
    const converted = byCountry || !country

    content = (
      <>
        <Typography sx={{ mb: 2 }}>
          {headcount.toLocaleString('en')} employees in {rows.length} {rows.length === 1 ? one : many}
          {converted && ` · USD at fixed rates as of ${insights.data.rates_as_of} (illustrative, not live)`}
        </Typography>

        <Paper sx={{ mb: 3 }}>
          <TableContainer>
            <Table size="small" aria-label={`Salaries by ${one}`}>
              <TableHead>
                <TableRow>
                  <TableCell>{GROUPS[group].label}</TableCell>
                  <TableCell align="right">Headcount</TableCell>
                  <TableCell align="right">Median</TableCell>
                  <TableCell align="right">Min</TableCell>
                  <TableCell align="right">Average</TableCell>
                  <TableCell align="right">Max</TableCell>
                  {byCountry && <TableCell align="right">Median (USD)</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell component="th" scope="row">
                      {label(row.name)}
                    </TableCell>
                    <TableCell align="right">{row.headcount.toLocaleString('en')}</TableCell>
                    <TableCell align="right">{formatMoney(row.median, row.currency)}</TableCell>
                    <TableCell align="right">{formatMoney(row.min, row.currency)}</TableCell>
                    <TableCell align="right">{formatMoney(row.avg, row.currency)}</TableCell>
                    <TableCell align="right">{formatMoney(row.max, row.currency)}</TableCell>
                    {byCountry && <TableCell align="right">{formatMoney(row.median_usd, 'USD')}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* One chart, no chart library: a bar per group, longest first, with its value as text. */}
        <Paper component="figure" aria-labelledby="insights-chart-title" sx={{ m: 0, p: 2 }}>
          <Typography component="figcaption" id="insights-chart-title" variant="h6" gutterBottom>
            Median salary in {chartCurrency} by {one}
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
            {[...rows]
              .sort((a, b) => chartValue(b) - chartValue(a))
              .map((row) => (
                <Box
                  component="li"
                  key={row.name}
                  sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 160px) minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}
                >
                  <Typography variant="body2" noWrap title={label(row.name)}>
                    {label(row.name)}
                  </Typography>
                  <Box sx={{ height: 16, bgcolor: 'primary.main', borderRadius: 1, width: max > 0 ? `${(chartValue(row) / max) * 100}%` : 0 }} />
                  <Typography variant="body2" align="right">
                    {formatMoney(String(chartValue(row)), chartCurrency)}
                  </Typography>
                </Box>
              ))}
          </Box>
        </Paper>
      </>
    )
  }

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Insights
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          aria-label="Group by"
          value={group}
          onChange={(_event, value: InsightGroup | null) => value && change(value, country)}
        >
          {Object.entries(GROUPS).map(([value, { label: text }]) => (
            <ToggleButton key={value} value={value}>
              {text}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {!byCountry && (
          <TextField
            select
            size="small"
            label="Country"
            value={country}
            onChange={(event) => change(group, event.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All countries (in USD)</MenuItem>
            {optionsWith(country, options.data?.countries).map((code) => (
              <MenuItem key={code} value={code}>
                {countryName(code)}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>
      {content}
    </>
  )
}
