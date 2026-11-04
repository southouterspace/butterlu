import { DriveStore } from './drive';
import type { Env } from './env';

/** One rendered file to keep. */
export interface RenderFile {
  /** File name a person sees, e.g. "2026-11-04 Etsy 3412 - print.pdf". */
  name: string;
  kind: 'print' | 'proof';
  bytes: Uint8Array;
}

/** Where a saved file ended up. */
export interface StoredFile {
  /** The store's own id for the file. */
  id: string;
  /** A link a person with access can open. */
  url: string;
}

/**
 * Where render_frame keeps its PDFs. Google Drive today (src/drive.ts). The
 * interface stays small so another store (R2, for customer photo uploads later)
 * can slot in without touching the tools.
 */
export interface RenderStore {
  readonly name: string;
  save(file: RenderFile): Promise<StoredFile>;
}

export type StoreChoice = { ok: true; store: RenderStore } | { ok: false; missing: string[] };

const DRIVE_SECRETS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'DRIVE_FOLDER_ID'] as const;

/** The configured store, or the names (never values) of the secrets still missing. */
export function renderStore(env: Env): StoreChoice {
  const missing = DRIVE_SECRETS.filter((k) => !env[k]?.trim());
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, store: new DriveStore(env) };
}
