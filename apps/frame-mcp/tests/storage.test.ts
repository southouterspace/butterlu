import { beforeEach, describe, expect, test } from 'bun:test';
import { DriveStore } from '../src/drive';
import type { Env } from '../src/env';
import { renderFileNames } from '../src/file-names';
import { accessToken, googleEndpoints, resetTokenCache } from '../src/google';
import { renderStore } from '../src/storage';

const env = (over: Partial<Env> = {}): Env => ({
  ASSETS: {} as Fetcher,
  GOOGLE_CLIENT_ID: 'client',
  GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_REFRESH_TOKEN: 'refresh',
  DRIVE_FOLDER_ID: 'print-folder',
  ...over,
});

type Call = { url: string; init: RequestInit };
function fakeGoogle(responses: Array<[number, unknown]>) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const [status, body] = responses.shift() ?? [500, {}];
    return Response.json(body, { status });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

beforeEach(() => resetTokenCache());

describe('renderStore', () => {
  test('names the missing secrets, never their values', () => {
    const choice = renderStore(env({ GOOGLE_REFRESH_TOKEN: '', DRIVE_FOLDER_ID: undefined }));
    expect(choice).toEqual({ ok: false, missing: ['GOOGLE_REFRESH_TOKEN', 'DRIVE_FOLDER_ID'] });
  });

  test('picks Google Drive once every secret is set', () => {
    const choice = renderStore(env());
    expect(choice.ok && choice.store.name).toBe('google-drive');
  });
});

describe('googleEndpoints', () => {
  test('uses Google by default', () => {
    expect(googleEndpoints({}).token).toBe('https://oauth2.googleapis.com/token');
  });

  test('honours a loopback mock', () => {
    expect(googleEndpoints({ GOOGLE_API_BASE: 'http://127.0.0.1:9999/' }).token).toBe('http://127.0.0.1:9999/token');
  });

  test('ignores any other override, so the refresh token only ever goes to Google', () => {
    for (const base of ['https://evil.example', 'http://evil.example', 'http://127.0.0.1.evil.example', 'not a url']) {
      expect(googleEndpoints({ GOOGLE_API_BASE: base }).token).toBe('https://oauth2.googleapis.com/token');
    }
  });
});

describe('accessToken', () => {
  test('refreshes once and reuses the token until it nearly expires', async () => {
    const { calls, fetcher } = fakeGoogle([
      [200, { access_token: 'a1', expires_in: 3600 }],
      [200, { access_token: 'a2', expires_in: 3600 }],
    ]);
    const now = 1_000_000;
    expect(await accessToken(env(), fetcher, now)).toBe('a1');
    expect(await accessToken(env(), fetcher, now + 10 * 60_000)).toBe('a1');
    expect(calls).toHaveLength(1);
    const form = new URLSearchParams(String(calls[0]!.init.body));
    expect(form.get('grant_type')).toBe('refresh_token');
    expect(form.get('refresh_token')).toBe('refresh');
    expect(await accessToken(env(), fetcher, now + 3600_000)).toBe('a2');
  });

  test('explains an expired or revoked sign-in', async () => {
    const { fetcher } = fakeGoogle([[400, { error: 'invalid_grant' }]]);
    await expect(accessToken(env(), fetcher)).rejects.toThrow(/sign-in has expired or was revoked/);
  });
});

describe('DriveStore', () => {
  const pdf = new TextEncoder().encode('%PDF-1.7 fake');

  async function upload(e: Env, kind: 'print' | 'proof') {
    const { calls, fetcher } = fakeGoogle([
      [200, { access_token: 'tok', expires_in: 3600 }],
      [200, { id: 'f1', webViewLink: 'https://drive.google.com/file/d/f1/view' }],
    ]);
    const saved = await new DriveStore(e, fetcher).save({ name: 'x.pdf', kind, bytes: pdf });
    const up = calls[1]!;
    const body = new TextDecoder().decode(up.init.body as Uint8Array);
    const metadata = JSON.parse(body.split('\r\n\r\n')[1]!.split('\r\n')[0]!);
    return { saved, up, body, metadata };
  }

  test('uploads one multipart request into the print folder with the access token', async () => {
    const { saved, up, body, metadata } = await upload(env(), 'print');
    expect(saved).toEqual({ id: 'f1', url: 'https://drive.google.com/file/d/f1/view' });
    expect(up.url).toStartWith('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
    expect((up.init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(metadata).toEqual({ name: 'x.pdf', mimeType: 'application/pdf', parents: ['print-folder'] });
    expect(body).toContain('%PDF-1.7 fake');
  });

  test('sends proofs to the proof folder when there is one, else the print folder', async () => {
    expect((await upload(env({ DRIVE_PROOF_FOLDER_ID: 'proof-folder' }), 'proof')).metadata.parents).toEqual(['proof-folder']);
    resetTokenCache();
    expect((await upload(env(), 'proof')).metadata.parents).toEqual(['print-folder']);
  });

  test('says when the folder is out of reach', async () => {
    const { fetcher } = fakeGoogle([
      [200, { access_token: 'tok', expires_in: 3600 }],
      [404, { error: { message: 'File not found: print-folder.' } }],
    ]);
    await expect(new DriveStore(env(), fetcher).save({ name: 'x.pdf', kind: 'print', bytes: pdf })).rejects.toThrow(/folder is gone/);
  });
});

describe('renderFileNames', () => {
  const when = new Date('2026-11-05T03:00:00Z'); // still Nov 4 in Texas

  test('dates by the shop day and keeps the label readable', () => {
    expect(renderFileNames('0123456789abcdef', 'Etsy 3412: Aunt/Sarah', when)).toEqual({
      print: '2026-11-04 Etsy 3412 Aunt Sarah - print.pdf',
      proof: 'PROOF 2026-11-04 Etsy 3412 Aunt Sarah - not for printing.pdf',
    });
  });

  test('falls back to the render id', () => {
    expect(renderFileNames('0123456789abcdef', '   ', when).print).toBe('2026-11-04 frame 01234567 - print.pdf');
  });
});

describe('token sharing', () => {
  test('two saves starting together on a cold isolate refresh once', async () => {
    let refreshes = 0;
    const fetcher = (async (url: string) => {
      if (url.endsWith('/token')) {
        refreshes++;
        await new Promise((r) => setTimeout(r, 5));
        return Response.json({ access_token: 'tok', expires_in: 3600 });
      }
      return Response.json({ id: 'f', webViewLink: 'https://drive.google.com/file/d/f/view' });
    }) as unknown as typeof fetch;
    const store = new DriveStore(env(), fetcher);
    const pdf = new Uint8Array([37, 80, 68, 70]);
    await Promise.all([store.save({ name: 'a.pdf', kind: 'print', bytes: pdf }), store.save({ name: 'b.pdf', kind: 'proof', bytes: pdf })]);
    expect(refreshes).toBe(1);
  });

  test('a 401 from Drive drops the cached token', async () => {
    const { calls, fetcher } = fakeGoogle([
      [200, { access_token: 'old', expires_in: 3600 }],
      [401, { error: { message: 'Invalid Credentials' } }],
      [200, { access_token: 'new', expires_in: 3600 }],
      [200, { id: 'f2' }],
    ]);
    const store = new DriveStore(env(), fetcher);
    const file = { name: 'x.pdf', kind: 'print' as const, bytes: new Uint8Array([1]) };
    await expect(store.save(file)).rejects.toThrow(/401/);
    expect((await store.save(file)).id).toBe('f2');
    expect((calls[3]!.init.headers as Record<string, string>).authorization).toBe('Bearer new');
  });
});
