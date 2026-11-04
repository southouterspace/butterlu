export interface Env {
  ASSETS: Fetcher;
  /** Stripe secret key. Test mode (sk_test_ / rk_test_) unless STRIPE_ALLOW_LIVE is "true". */
  STRIPE_SECRET_KEY?: string;
  /** Signing secret of the Stripe webhook endpoint for /api/stripe/webhook. */
  STRIPE_WEBHOOK_SECRET?: string;
  /** Set to "true" only when the owner turns on live payments. */
  STRIPE_ALLOW_LIVE?: string;
}
