# 09 — Market research: Etsy, off-Etsy, and a Claude-run stack

Researched 2026-10-12, in six tracks. Each track report is in `docs/research/` with a URL
for every factual claim. This file is the synthesis. Scope (owner, 2026-10-12): ecommerce
only, on Etsy and off Etsy. No physical retail or wholesale.

| Track | File |
|---|---|
| A. ButterLu's own listing metadata | `research/a-own-listings.md` (script: `scripts/etsy-metadata-audit.mjs`) |
| B. Competitors on Etsy, via the Open API | `research/b-etsy-competitors.md` (script: `scripts/etsy-market-scan.mjs`) |
| C. Competitors off Etsy, and the off-Etsy channel playbook | `research/c-off-etsy-competitors.md` |
| E. Etsy platform rules, fees and features in 2026 | `research/e-etsy-platform.md` |
| F. The site as a hub for Etsy and Amazon Handmade listings | `research/f-marketplace-hub.md` |
| G. Official APIs and connectors across the funnel | `research/g-funnel-apis.md` |
| H. Agentic commerce: how AI shopping agents find and buy | `research/h-agentic-commerce.md` |

Correction (owner, 2026-10-12): the frame ships without a photo (the buyer adds their
own) and can be bought as designed; custom text is optional. An earlier draft
recommended making personalisation and a photo upload required. That was wrong and is
removed.

Method limits. B ranks by Etsy API relevance order, which is not etsy.com search order
(that is personalised and ad-driven). Views and favourites are lifetime counts, not sales.
Keyword volumes in C are third-party estimates. Several Etsy help pages blocked automated
reads, so some Etsy claims come from search excerpts; the track files mark which.

---

## Bottom line

1. **The Etsy shop is carried by old listings.** The 296 listings created 2015–2021 hold
   95% of favourites; the 323 created since 2022 hold 5% (about 3× worse after adjusting
   for age). New listings mostly compete with ButterLu's own older ones. (A)
2. **ButterLu wins niches and is invisible on broad searches.** It is a top-6 shop for
   godfather baptism (#1), aunt brag board (#1), godparents (#2), grandparent and baby
   announcement (#4), uncle (#5), great-grandparent (#6). It is absent from the top 100
   for every generic query ("personalized picture frame", "custom photo frame") and for
   couple wedding, mom, Father's Day and pet memorial. (B)
3. **Only one Etsy rival is ButterLu's size.** BrandonScottAD (77,955 sales, $28.42).
   Then ThePictureFrameShop (0.76×), WoobiesCorner (0.65×), MomentsInPine (0.32×),
   FlowersinDecemberDS (0.31×). ButterLu's $35.95 sits near the 75th percentile, above
   every direct rival. (B)
4. **Off Etsy, the incumbents are weak but paid ads don't pay on one frame.** PlanetArt is
   buying PersonalizationMall and Things Remembered for about $45M combined (1-800-Flowers
   paid $245M for PersonalizationMall alone in 2020). Median Meta cost per purchase
   ($38–49) exceeds a ~$32 order. The off-Etsy channel has to run on free surfaces,
   narrow intent, bundles and repeat occasions. (C)
5. **Etsy forbids using Etsy to build the off-Etsy channel.** No inserts or QR codes
   pointing to butterlu.com, no "buy direct" offers, no marketing to Etsy buyers, no
   piping Etsy buyer data into any ad or email platform. The site must find its own
   customers. (E, F)
6. **AI shopping agents can sell the frame as designed, but not a personalised one.** No
   agent checkout (Google UCP, OpenAI/Stripe ACP) carries custom text, and Google bans
   personalised goods from agent checkout. The frame ships empty (the buyer adds their
   own photo) and sells as designed, so each preset is an ordinary product an agent can
   buy. Custom wording hands off to the editor on butterlu.com. (H, corrected by owner)
7. **A Claude-run stack is mostly reachable through official interfaces.** The gaps are
   Etsy Ads, Etsy messages and Etsy label buying, which have no API and stay human. (G, F)

---

## 1. The Etsy shop: what to fix

Ranked by expected impact against effort. Counts are from `plans/etsy-metadata-audit.json`.

1. **Merge or retire listings that compete with each other.** 155 candidates (71 old with
   very low views and under 5 favourites; 84 newer with under 50 lifetime views). 167 of
   the 240 listings from 2025–26 sit on a search-intent page that already has an older
   listing with 100+ favourites. Etsy has no rule against several listings of one item,
   so this is about self-competition, not a penalty (E). Never delete and recreate a
   listing that has reviews (F).
2. **Alt text.** 16% of 6,361 images have any; three auto-captions ("a flyer for a fashion
   show" and similar) sit on 841 images across 450 listings. (A)
3. **Titles.** Median 18 words; Etsy's August 2025 guidance is under about 15 (E). They
   never say "wood" (0.8% vs 18.8% of competitors), never give a size, and never say
   "custom text" (B). 158 near-duplicate titles. Test short, format-first titles on a
   small batch before any bulk change.
4. **Price.** $37.95 announcement frames are the most exposed; $62.40 brag boards are
   above the segment's 75th percentile (median $40); $62 large frames are cheap (median
   $67). The $35.95 point likely exists to clear Etsy's $35 free-shipping line, which the
   API can't confirm without OAuth. (B)
5. **Tags are not the gap.** ButterLu uses 57 of competitors' 60 most common tags. Fix the
   smaller issues: 22% of tag uses repeat the title, 10 truncated tags, 2 listings with
   none. (A, B)
6. **Attributes, sections, materials.** Attributes were not in the export and need an
   OAuth read. 28 frames sit in a mismatched section; 49 listings have no materials. (A)
7. **Use Marketplace Insights.** Etsy's search-demand tool: 15 searches a week free,
   unlimited with Etsy Plus ($10/month). It is the missing keyword-volume source for G2. (E)

Fees for context (E): $0.20 per listing per 4 months, 6.5% transaction, about 3% + $0.25
processing, and Offsite Ads at 12% (capped at $100 per order), mandatory for a shop past
$10k in sales. Etsy's take rate reached 25.9% in Q2 2026. Active buyers are flat at ~87M.

## 2. The off-Etsy channel (butterlu.com and other marketplaces)

What competitors look like (C). Comparable frames sell for $25–50. Nearly all are
engraved wood or glass with fixed verses; colour backgrounds with fully custom text are
rare off Etsy, and only a live preview sells that. GiftsForYouNow's preview, regenerate,
approve-the-proof flow is the bar. Peers promise "ships in 1–2 days". Off-Etsy product
pages carry 0–24 reviews, so the review gap is smaller than it looks.

Demand (estimates, C): "personalized picture frame" ~22k/month, flat. "Gift for
grandparent" 6.6k → 135k in December. "Baptism gift" peaks in April. "Godparent gift"
~6.6k flat.

Repeat purchase. Every order carries a date (due date, baptism, wedding), which makes
opt-in reminders natural: new baby, baptism, first Christmas, Grandparents Day. Only for
butterlu.com customers, never Etsy buyers. (C, E)

Sequence (C, adjusted for E and H):

| When | Channels |
|---|---|
| Launch | Google free listings via Merchant Center, Pinterest organic plus catalog, Microsoft Merchant Center, product structured data, email flows for site customers |
| Months 4–6 | Narrow Google Shopping and Search, TikTok organic, an Amazon Handmade test (one parent listing with variations; Amazon bans duplicate listings) |
| Month 6+ | Meta retargeting |
| Months 9–12 | TikTok Shop |

Holiday 2026 stays an Etsy season. Mother's Day 2027 (May 9) is the site's first real
test; Christmas 2027 its first full season.

AI agents (H), in order: (1) crawlable pages with Product, Offer, shipping and
MerchantReturnPolicy markup plus Google and Microsoft Merchant Center feeds, and
Cloudflare set to admit search and agent crawlers (2–3 days); (2) pre-filled editor links,
one per preset, buyable as designed, with custom wording optional (3–4 days); (3) discovery-only listings: Stripe's agentic catalog with
checkout off, and an application at chatgpt.com/merchants (1–2 days). Defer in-agent
checkout and a site MCP server until there are real orders. Google says it ignores
`llms.txt`.

## 3. The site as the marketplace hub

Feasible for orders and for a narrow set of listing fields; not as a source of truth that
overwrites Etsy listings (F). No off-the-shelf tool handles one product spread over
hundreds of Etsy listings or Etsy's new personalisation; the serious ones cost
$750–1,500/month. Build a thin hub.

Order of work:

1. Etsy OAuth and read-only order sync into one order table (scopes `listings_r/w
   shops_r/w transactions_r/w`; leave out `listings_d`).
2. Mark Etsy orders shipped from the site with `createReceiptShipment`, which lets Etsy
   notify the buyer (sending Etsy buyers your own shipping emails breaches the API Terms).
3. A read-only listing pull that maps the ~539 frame listings to the 94 G2 pages.
4. Manifest-driven edits to fields the hub owns, alt text first. Titles, tags and
   descriptions stay hands-off by default.
5. Amazon Handmade last. Amazon Custom has no API and is set up in Seller Central.

Tokens: fixed credentials in Worker secrets; rotating access and refresh tokens encrypted
in KV or D1. A one-shop personal app runs indefinitely if it makes a call at least every
6 months and refreshes its token within 90 days. Etsy buyer data must stay out of every
mailing list, review request and ad platform.

**`docs/06` is out of date.** Etsy rewrote its API Terms on 2026-08-18. Scraping moved to
§5 item 24, and new items forbid diverting members (item 2), connecting to third-party
marketing platforms (item 15) and sending Etsy members your own order or shipping
messages (item 16). F quotes the current text.

## 4. The Claude-run stack

From G. Already attached and enough for the butterlu.com funnel: Stripe, Cloudflare,
Resend, Gmail, GitHub, Infisical. Shopify stays read-only; Neon, Vercel and WorkOS aren't
needed. The Cloudflare bindings, builds and observability connectors need authorising in
claude.ai connector settings.

| Stage | System | Official API | Official MCP |
|---|---|---|---|
| Discovery | Pinterest | API v5 (catalogs, pins, ads, conversions) | none |
| Discovery | Google Merchant Center | Merchant API | yes (alpha) |
| Discovery | Google Ads | Google Ads API | yes (read-only) |
| Discovery | Meta | Marketing, Catalog, Conversions APIs | Meta Ads (open beta) |
| Discovery | TikTok | Marketing, Content Posting, Shop APIs | TikTok for Business (re-auth every 30 days) |
| SEO and analytics | Search Console, GA4, IndexNow | yes | GA4 experimental read-only; Search Console none |
| Marketplace | Etsy | Open API v3, 4 order webhooks | none |
| Marketplace | Amazon Handmade | SP-API | none |
| Checkout | Stripe | yes | attached |
| Fulfilment | Shippo | yes | `mcp.shippo.com` |
| Fulfilment | USPS, UPS | yes | none |
| Retention | Resend, Klaviyo | yes | Resend attached; Klaviyo exists |
| Finance | QuickBooks, Xero | yes | both, local |

No official API at all: Etsy Ads, Etsy messages, Etsy label purchase, Pirate Ship. Those
stay human or route around (labels via Shippo, tracking posted back to Etsy).

Approval hurdles: Pinterest API pins stay private until a video-reviewed Standard
upgrade; TikTok API posts stay private until an audit; Amazon Handmade needs jury
approval plus a Professional account.

Minimum stack: the attached core; Etsy Open API v3 through a Worker (`order.paid`
webhook, receipts, tracking); Shippo for labels; one static product feed URL read by
Pinterest, Google and Microsoft Merchant Center; Search Console plus IndexNow; Meta and
TikTok ads connectors when paid ads start; Klaviyo and QuickBooks or Xero later.

## 5. Deadlines

- **2026-10-31:** the Stripe MCP stops accepting full secret keys and restricted keys
  without the Agent tag. Move to OAuth or an Agent key. (G)
- **Early 2027:** Google's Content API for Shopping shuts down (sunset 2026-08-18, failing
  intermittently with HTTP 410 since 2026-09-01). Build feeds on the Merchant API only. (G)

## 6. Needed from the owner

- Production time and cost of goods per frame. Peers promise 1–2 day dispatch, and
  channel economics can't be worked out without COGS.
- Approval of a merge/retire list built from the 155 candidates (no listing is touched
  before a manifest is reviewed).
- Etsy Plus ($10/month) for Marketplace Insights, before G2.
- Whether the frames qualify as Amazon Handmade, before applying.
- Authorise the Cloudflare bindings, builds and observability connectors.

## 7. Unverified

- API support for Etsy's 2026 personalisation fields (F found the spec still says one
  text question).
- Whether ButterLu's Etsy listings already surface in ChatGPT, Gemini and Copilot. A
  manual check in each would settle it.
- The text of Etsy's Seller Policy effective 2026-07-09, the US processing rate from Etsy
  itself, and the Star Seller sales minimum.
- Pattern ($15/month) reportedly can display Etsy reviews (third-party report). Relevant
  to G5 if true.
- Keyword volumes for "grandparents to be" and "parents of the bride" (pull from Keyword
  Planner or Marketplace Insights).

Raw competitor listing data from track B was kept outside the repo and deleted after this
synthesis (Etsy API Terms limit caching other members' content). Rerun
`scripts/etsy-market-scan.mjs` to regenerate it.
