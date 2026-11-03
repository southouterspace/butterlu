import type { Env } from './env';

/**
 * AUTH SEAM. Every /mcp request passes through here before any tool runs.
 * It allows everything today, so this Worker must not be deployed where the
 * public can reach it. Return a Response (401/403) to refuse a request.
 */
export function authorizeMcpRequest(_request: Request, _env: Env): Response | undefined {
  return undefined;
}
