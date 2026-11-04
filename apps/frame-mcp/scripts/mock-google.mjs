// A stand-in for the Google endpoints the frame MCP uses: the OAuth token
// refresh and the Drive multipart upload the Worker calls, plus the sign-in and
// folder calls of scripts/google-setup.mjs. The smoke test and `bun run dev`
// point the Worker at it with GOOGLE_API_BASE, so neither needs a real Google
// account. It checks the same things Google would reject: the client and
// refresh token, the bearer token, the folder, and the multipart body.
import http from 'node:http';

export const MOCK_CREDENTIALS = {
  GOOGLE_CLIENT_ID: 'mock-client.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'mock-client-secret',
  GOOGLE_REFRESH_TOKEN: 'mock-refresh-token',
  DRIVE_FOLDER_ID: 'mock-print-folder',
  DRIVE_PROOF_FOLDER_ID: 'mock-proof-folder',
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

/** Splits a multipart/related body into its parts: [{ headers, body }]. */
function parseMultipart(buf, boundary) {
  const delim = Buffer.from(`--${boundary}`);
  const parts = [];
  let at = buf.indexOf(delim);
  while (at !== -1) {
    const start = at + delim.length;
    if (buf.subarray(start, start + 2).toString() === '--') break;
    const next = buf.indexOf(delim, start);
    const chunk = buf.subarray(start + 2, next === -1 ? buf.length : next - 2); // drop leading and trailing CRLF
    const split = chunk.indexOf('\r\n\r\n');
    const headers = Object.fromEntries(
      chunk
        .subarray(0, split)
        .toString()
        .split('\r\n')
        .map((l) => l.split(/:\s*/, 2))
        .map(([k, v]) => [k.toLowerCase(), v]),
    );
    parts.push({ headers, body: chunk.subarray(split + 4) });
    at = next;
  }
  return parts;
}

export async function startMockGoogle({ credentials = MOCK_CREDENTIALS, port = 0 } = {}) {
  const files = new Map();
  const accessToken = `mock-access-${Math.random().toString(36).slice(2)}`;
  const folders = new Set([credentials.DRIVE_FOLDER_ID, credentials.DRIVE_PROOF_FOLDER_ID].filter(Boolean));
  const folderMeta = new Map();
  let tokenCalls = 0;

  const server = http.createServer(async (req, res) => {
    const send = (status, value) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(value));
    };
    const url = new URL(req.url, 'http://127.0.0.1');
    try {
      // Sign-in: consents at once and sends the browser back with a code.
      if (req.method === 'GET' && url.pathname === '/auth') {
        const back = new URL(url.searchParams.get('redirect_uri'));
        back.searchParams.set('code', 'mock-auth-code');
        back.searchParams.set('state', url.searchParams.get('state'));
        res.writeHead(302, { location: back.toString() });
        return res.end();
      }

      if (req.method === 'POST' && url.pathname === '/token') {
        tokenCalls++;
        const form = new URLSearchParams((await readBody(req)).toString());
        if (form.get('grant_type') === 'authorization_code') {
          if (form.get('code') !== 'mock-auth-code' || !form.get('code_verifier') || form.get('client_id') !== credentials.GOOGLE_CLIENT_ID)
            return send(400, { error: 'invalid_grant' });
          return send(200, { access_token: accessToken, refresh_token: credentials.GOOGLE_REFRESH_TOKEN, expires_in: 3599, scope: 'https://www.googleapis.com/auth/drive.file' });
        }
        const good =
          form.get('grant_type') === 'refresh_token' &&
          form.get('client_id') === credentials.GOOGLE_CLIENT_ID &&
          form.get('client_secret') === credentials.GOOGLE_CLIENT_SECRET &&
          form.get('refresh_token') === credentials.GOOGLE_REFRESH_TOKEN;
        if (!good) return send(400, { error: 'invalid_grant', error_description: 'Bad client or refresh token.' });
        return send(200, { access_token: accessToken, expires_in: 3599, token_type: 'Bearer', scope: 'https://www.googleapis.com/auth/drive.file' });
      }

      if (req.method === 'POST' && url.pathname === '/upload/drive/v3/files') {
        if (req.headers.authorization !== `Bearer ${accessToken}`) return send(401, { error: { message: 'Invalid Credentials' } });
        if (url.searchParams.get('uploadType') !== 'multipart') return send(400, { error: { message: 'uploadType must be multipart' } });
        const boundary = /boundary=([^;]+)/.exec(req.headers['content-type'] ?? '')?.[1];
        if (!boundary || !req.headers['content-type'].startsWith('multipart/related')) return send(400, { error: { message: 'expected multipart/related' } });
        const [meta, media] = parseMultipart(await readBody(req), boundary);
        const metadata = JSON.parse(meta.body.toString());
        const parent = metadata.parents?.[0];
        if (!folders.has(parent)) return send(404, { error: { message: `File not found: ${parent}.` } });
        const id = `mockfile${files.size + 1}`;
        files.set(id, { metadata, contentType: media.headers['content-type'], bytes: media.body });
        return send(200, { id, webViewLink: `http://127.0.0.1:${server.address().port}/files/${id}` });
      }

      // Folder list and create, as google-setup.mjs uses them.
      if (url.pathname === '/drive/v3/files') {
        if (req.headers.authorization !== `Bearer ${accessToken}`) return send(401, { error: { message: 'Invalid Credentials' } });
        if (req.method === 'GET') {
          const q = url.searchParams.get('q') ?? '';
          const name = /name = '([^']*)'/.exec(q)?.[1];
          const parent = /'([^']+)' in parents/.exec(q)?.[1];
          const hits = [...folderMeta.values()].filter((f) => f.name === name && (!parent || f.parents?.[0] === parent));
          return send(200, { files: hits.map(({ id, name }) => ({ id, name })) });
        }
        if (req.method === 'POST') {
          const meta = JSON.parse((await readBody(req)).toString());
          const id = `mockfolder${folderMeta.size + 1}`;
          folderMeta.set(id, { id, ...meta });
          folders.add(id);
          return send(200, { id });
        }
      }

      const file = /^\/files\/([^/]+)$/.exec(url.pathname);
      if (req.method === 'GET' && file && files.has(file[1])) {
        const f = files.get(file[1]);
        res.writeHead(200, { 'content-type': f.contentType });
        return res.end(f.bytes);
      }
      send(404, { error: { message: 'Not found' } });
    } catch (err) {
      send(500, { error: { message: String(err) } });
    }
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    files,
    folders: folderMeta,
    tokenCalls: () => tokenCalls,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// `node scripts/mock-google.mjs` runs it on its own and prints the base URL.
if (import.meta.url === `file://${process.argv[1]}`) {
  const mock = await startMockGoogle({ port: Number(process.env.PORT ?? 0) });
  console.log(`mock Google on ${mock.base}`);
}
