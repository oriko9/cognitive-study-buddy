import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Liveness probe. Deliberately holds no model code: per CLAUDE.md section 4,
 * every provider call goes through a single adapter that does not exist yet.
 */
export default function handler(_request: VercelRequest, response: VercelResponse): void {
  response.status(200).json({ ok: true });
}
