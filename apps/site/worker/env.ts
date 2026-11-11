export interface Env {
  ASSETS: Fetcher;
  /** Stripe secret key. Test mode (sk_test_ / rk_test_) unless STRIPE_ALLOW_LIVE is "true". */
  STRIPE_SECRET_KEY?: string;
  /** Signing secret of the Stripe webhook endpoint for /api/stripe/webhook. */
  STRIPE_WEBHOOK_SECRET?: string;
  /** Set to "true" only when the owner turns on live payments. */
  STRIPE_ALLOW_LIVE?: string;
  /** Funnel events (docs/11). Optional: without it events go to Workers Logs only. */
  EVENTS?: AnalyticsEngineDataset;
  /** Hours before an unpaid Checkout Session expires and counts as abandoned. Default 2, 0.5 to 24. */
  CHECKOUT_EXPIRES_HOURS?: string;
  /** "true" shows Stripe's promotion code field, in checkout and in recovered checkouts. Owner's call. */
  CHECKOUT_PROMO_CODES?: string;
  /**
   * Abandoned checkout follow-up (docs/11): "off" records nothing about recovery,
   * "log" (default) records what would be sent. Nothing sends email yet.
   */
  RECOVERY_EMAILS?: string;
  /** Orders database (migrations/0001_orders.sql). Stage only for now; without it orders are only logged. */
  ORDERS?: D1Database;
  /** Older shared-password sign-in for /admin. Ignored once Google sign-in is set up. */
  ADMIN_PASSWORD?: string;
  /** WorkOS AuthKit sign-in for /admin (admin-auth.ts): the environment's client ID and API key. */
  WORKOS_CLIENT_ID?: string;
  WORKOS_API_KEY?: string;
  /** The Google accounts allowed into /admin, comma separated. Kept as a secret because the repo is public. */
  ADMIN_EMAILS?: string;
  /** Optional key for signing admin sessions; defaults to one made from WORKOS_API_KEY. Changing it signs everyone out. */
  ADMIN_SESSION_SECRET?: string;
  /** Anthropic API key for Claude's SEO drafts in the store admin (docs/13). Without it the fields are hand-written only. */
  ANTHROPIC_API_KEY?: string;
  /** Model for SEO drafts. Default claude-opus-5-5. */
  SEO_MODEL?: string;
  /** Fine-grained GitHub token (Contents read and write on this repo) for Publish. Not used until the catalog handover. */
  GITHUB_CATALOG_TOKEN?: string;
}
