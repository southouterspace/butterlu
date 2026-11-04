export interface Env {
  /**
   * Backgrounds and fonts, uploaded with the Worker as static assets
   * (build/assets, made by scripts/prepare-assets.mjs): backgrounds/<id>.jpg,
   * fonts/<fontId>.woff. run_worker_first keeps them off the public web.
   */
  ASSETS: Fetcher;
  /** Bearer token every /mcp caller must send. A Worker secret; unset means every request is refused. */
  MCP_TOKEN?: string;

  // Google Drive, where rendered PDFs are saved (src/storage.ts). All Worker
  // secrets, set by scripts/google-setup.mjs. While any is missing, render_frame
  // refuses with a message naming the missing ones.
  /** OAuth client id of the owner's Google Cloud "Desktop app" client. */
  GOOGLE_CLIENT_ID?: string;
  /** That client's secret. */
  GOOGLE_CLIENT_SECRET?: string;
  /** Refresh token from the owner's one-time sign-in, scope drive.file only. */
  GOOGLE_REFRESH_TOKEN?: string;
  /** Drive folder for print PDFs. Created by the setup script, so the drive.file scope can write to it. */
  DRIVE_FOLDER_ID?: string;
  /** Drive folder for proofs. Optional: without it, proofs go in DRIVE_FOLDER_ID named "PROOF ...". */
  DRIVE_PROOF_FOLDER_ID?: string;
  /**
   * Local runs only: points the Google token and upload calls at the mock in
   * scripts/mock-google.mjs. Honoured only for http://127.0.0.1 or localhost,
   * so a stray value can never send the refresh token to another host.
   */
  GOOGLE_API_BASE?: string;
}
