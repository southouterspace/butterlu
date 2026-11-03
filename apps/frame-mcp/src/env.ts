export interface Env {
  /** Backgrounds and fonts: backgrounds/<id>.jpg, fonts/<fontId>.woff. */
  ASSETS: R2Bucket;
  /** Rendered files: renders/<id>/{proof,print}.pdf. */
  RENDERS: R2Bucket;
}
