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
}
