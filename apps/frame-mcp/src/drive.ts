import type { Env } from './env';
import { GoogleError, accessToken, googleEndpoints, resetTokenCache } from './google';
import type { RenderFile, RenderStore, StoredFile } from './storage';

/**
 * Saves PDFs into the owner's Google Drive with their own sign-in (OAuth
 * refresh token, scope drive.file). drive.file reaches only files and folders
 * this app made, so the target folders are created by scripts/google-setup.mjs,
 * and nothing else in the Drive is visible to the Worker.
 */
export class DriveStore implements RenderStore {
  readonly name = 'google-drive';

  constructor(
    private readonly env: Env,
    // Wrapped so the Workers runtime sees fetch called unbound (calling it as a method throws "Illegal invocation").
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  async save(file: RenderFile): Promise<StoredFile> {
    const folder = file.kind === 'proof' && this.env.DRIVE_PROOF_FOLDER_ID?.trim() ? this.env.DRIVE_PROOF_FOLDER_ID.trim() : this.env.DRIVE_FOLDER_ID!.trim();
    const token = await accessToken(this.env, this.fetcher);

    const boundary = `butterlu-${crypto.randomUUID()}`;
    const metadata = { name: file.name, mimeType: 'application/pdf', parents: [folder] };
    const enc = new TextEncoder();
    const body = concat([
      enc.encode(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
      enc.encode(`--${boundary}\r\ncontent-type: application/pdf\r\n\r\n`),
      file.bytes,
      enc.encode(`\r\n--${boundary}--\r\n`),
    ]);

    const url = `${googleEndpoints(this.env).upload}/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink`;
    const res = await this.fetcher(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/related; boundary=${boundary}` },
      body,
    });
    const out = (await res.json().catch(() => ({}))) as { id?: string; webViewLink?: string; error?: { message?: string } };
    if (!res.ok || !out.id) {
      // A rejected access token is not reused; the next save refreshes it.
      if (res.status === 401) resetTokenCache();
      const hint = res.status === 404 ? ' (the folder is gone, or was not made by the setup script, so drive.file cannot reach it)' : '';
      throw new GoogleError(`Drive upload of "${file.name}" failed: ${res.status} ${out.error?.message ?? ''}${hint}`.trim());
    }
    return { id: out.id, url: out.webViewLink ?? `https://drive.google.com/file/d/${out.id}/view` };
  }
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
