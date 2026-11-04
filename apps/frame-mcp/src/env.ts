export interface Env {
  /** Backgrounds and fonts: backgrounds/<id>.jpg, fonts/<fontId>.woff. */
  ASSETS: R2Bucket;
  /** Rendered files: renders/<id>/{proof,print}.pdf. */
  RENDERS: R2Bucket;
  /** Bearer token every /mcp caller must send. A Worker secret; unset means every request is refused. */
  MCP_TOKEN?: string;
}
