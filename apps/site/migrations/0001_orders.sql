-- Orders (docs/10, docs/07). Written only by the Stripe webhook, one row per
-- Checkout Session, so a retried delivery never duplicates an order.
CREATE TABLE IF NOT EXISTS orders (
  session_id      TEXT PRIMARY KEY,           -- Stripe Checkout Session id (cs_...)
  created_at      TEXT NOT NULL,              -- when the webhook saved it, ISO 8601 UTC
  livemode        INTEGER NOT NULL DEFAULT 0, -- 1 only for real payments
  payment_status  TEXT NOT NULL,              -- paid, unpaid (bank debit pending), no_payment_required
  status          TEXT NOT NULL DEFAULT 'new',-- new, proofing, printing, shipped, cancelled
  amount_total    INTEGER NOT NULL DEFAULT 0, -- cents
  currency        TEXT NOT NULL DEFAULT 'usd',
  email           TEXT,
  name            TEXT,
  phone           TEXT,
  ship_name       TEXT,
  ship_address    TEXT,                       -- JSON: line1, line2, city, state, postal_code, country
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  recovered_from  TEXT,                       -- set when an abandoned checkout came back
  fid             TEXT,                       -- funnel id, joins the order to its visit
  tracking_number TEXT,
  carrier         TEXT,
  shipped_at      TEXT,
  note            TEXT
);
CREATE INDEX IF NOT EXISTS orders_created ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS order_lines (
  session_id   TEXT NOT NULL REFERENCES orders (session_id),
  line_no      INTEGER NOT NULL,
  handle       TEXT,
  name         TEXT,
  quantity     INTEGER NOT NULL,
  amount_total INTEGER NOT NULL,             -- cents, for the whole line
  design       TEXT,                         -- FrameSpec JSON, what gets printed
  summary      TEXT,                         -- one line a person can read
  design_errors TEXT,                        -- JSON array; non-empty means check by hand
  PRIMARY KEY (session_id, line_no)
);
