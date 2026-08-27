/**
 * Discriminated result returned by server actions to client forms.
 *
 * Actions never leak raw errors to the client — they return `{ ok: false,
 * error }` with a user-safe message, or `{ ok: true, ...data }` on success.
 */
export type ActionResult<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };
