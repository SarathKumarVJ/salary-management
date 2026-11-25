// Shapes of the Rails API JSON (see docs/design.md, "API surface").

/** `{ "errors": { field: [messages] } }`; `base` holds errors not tied to a field. */
export type ApiErrors = Record<string, string[]>

export type User = { email: string; role: 'hr_manager' | null }
