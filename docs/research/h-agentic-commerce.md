# H. Agentic commerce: what butterlu.com needs so AI agents can find and sell the frame

Research date: 2026-10-12. Scope: ecommerce only. Merchant: ButterLu, US personalised picture
frames where custom text is required and a 4x6 photo is part of the product; 13.7k-review Etsy
shop; new site on Astro + Cloudflare Worker + Stripe Checkout (docs/07).

How to read this. Each claim carries a date and a URL. "Verified" means I read it on the vendor's
own page or spec on 2026-10-12. "Secondary" means trade press or vendor blogs, not confirmed
against a primary source. "Inference" is my reasoning, not a fact anyone published. Several
primary pages (openai.com, help.openai.com, cnbc.com) sat behind a bot wall from this session.
Claims from those pages come through quoting coverage and are marked secondary.

---

## 1. The finding that drives everything

**No agent checkout today carries custom text and a photo from the shopper to the merchant.**
Each path either excludes personalised goods outright, or has no field for the input.

- **Google (UCP checkout in AI Mode and Gemini) excludes personalised goods by policy.**
  Verified on Google's Merchant Center guide for UCP (last updated 2026-10-02). It says: "The
  following categories of products are ineligible for checkout ... Personalized goods: items
  requiring custom design decisions (e.g., engravings, monograms)". "Gifting: transactions
  requiring split-invoice logistics or hidden pricing for recipients" is on the same list.
  https://developers.google.com/merchant/ucp/guides/merchant-center
- **ACP (OpenAI/Stripe) has no request field for it.** Verified in the spec repo, stable version
  2026-04-17 and `unreleased/`. The `Item` an agent sends to create a checkout allows only `id`,
  `name` and `unit_amount`, plus `suggested_price` and `url` in unreleased. It sets
  `additionalProperties: false`. A `custom_attributes` array (example: `Engraving: Happy
  Birthday!`) exists only on the `LineItem` the merchant returns, so the merchant can display it
  but the agent cannot send it.
  https://github.com/agentic-commerce-protocol/agentic-commerce-protocol (spec/2026-04-17/openapi/openapi.agentic_checkout.yaml)
- **UCP line items have no such field either.** Verified in the UCP repo (main branch,
  2026-10-12). `line_item.json` has `id`, `item`, `quantity`, `totals` and `parent_id`.
  https://github.com/Universal-Commerce-Protocol/ucp
- **Stripe's Agentic Commerce Suite feed has no personalisation field.** It has up to three
  `custom_variant_option_*` pairs, meaning fixed variants such as shape or background, and
  `inventory_not_tracked` for made-to-order goods. There is nothing for free text or files.
  Verified: https://docs.stripe.com/agentic-commerce/concepts/catalog-feed
- **OpenAI's product feed spec has no such field.** Verified:
  https://developers.openai.com/commerce/specs/file-upload/products
- **Etsy's own ChatGPT Instant Checkout fell back to email.** Secondary, quoting OpenAI's help
  page: for personalised listings, "the seller will email you (to the address used at checkout)
  to request your customization details."
  https://help.openai.com/en/articles/12440090-instant-checkout (via search summary; page
  blocked from this session)

Both protocols do have a handoff state. ACP and UCP checkout sessions can return
`requires_escalation` with a `continue_url`. UCP defines it as "Checkout session requires
information that cannot be provided via API, or buyer input is required ... hand off to buyer via
`continue_url`" (verified, UCP `docs/specification/shopping/checkout`). Stripe's feed has
`disable_checkout=true`: "agents direct users to the product's `link` URL to complete the
purchase" (verified, catalog-feed page above). That handoff is the right shape for ButterLu.
The agent finds the frame, recommends it, and sends the buyer to butterlu.com, where the editor
takes the text and photo and Stripe Checkout takes the money.

Inference: for this product, "agentic commerce" means **being found and recommended, then a
clean handoff to a pre-filled editor**. In-chat checkout is not the goal. Work on in-agent
checkout would build toward a path Google forbids for this category and that OpenAI has
stepped back from.

---

## 2. Protocols and programs, one by one

### 2.1 OpenAI: ACP, Instant Checkout, product feeds, apps

**Status of Instant Checkout: scaled back.**
- 2025-09-29: launched with US Etsy sellers, with Shopify merchants to follow; ACP open-sourced
  with Stripe. Verified: https://stripe.com/newsroom/news/stripe-openai-instant-checkout
- March 2026: OpenAI's post "Powering Product Discovery in ChatGPT" said the first version "did
  not offer the level of flexibility that we aspire to provide." It moved to "allowing merchants
  to use their own checkout experiences" while it focuses on discovery. Secondary (Exploding
  Topics, Retail Dive 2026-05-14, CNBC 2026-03-24).
  https://openai.com/index/powering-product-discovery-in-chatgpt/ ·
  https://explodingtopics.com/blog/agentic-commerce-protocol ·
  https://www.retaildive.com/news/etsy-debuts-chatgpt-app-ai-conversational-search/820083/
- CNBC (2026-03-20, secondary) reported Walmart saw conversion three times lower for products
  sold inside ChatGPT than for click-outs to its site.
  https://www.cnbc.com/2026/03/20/open-ai-agentic-shopping-etsy-shopify-walmart-amazon.html
- Coverage dated up to 2026-10-09 (Lengow, secondary) still describes native checkout as wound
  down, with purchase moving to merchant apps.
  https://blog.lengow.com/chatgpt-wanted-to-become-the-worlds-biggest-shop
- One blog claimed a June 2026 relaunch for Shopify merchants. I found no primary source.
  **Treat it as unconfirmed.**

**ACP the protocol: alive, in beta.** Verified on the repo (2026-10-12). It is "currently in
`beta`", maintained by OpenAI and Stripe, latest stable spec 2026-04-17 (cart, feed, orders,
authentication, MCP). An unreleased changelog entry adds Meta to the Technical Steering
Committee.

**Product feeds: the live part, gated.** Verified on
https://developers.openai.com/commerce/guides/get-started: "Onboarding product feeds in ChatGPT
is currently available to approved partners," applied for at https://chatgpt.com/merchants. The
spec takes CSV or JSON, or a Google-compatible TSV/CSV once OpenAI confirms it for your feed. It
has `review_count`/`star_rating` and store-level rating fields. `is_eligible_checkout` needs "a
separately enabled integration". No fee is published.

**Apps in ChatGPT.** Secondary: the app directory opened about 2025-12-18, and apps are MCP
servers reviewed by OpenAI. Etsy launched an Etsy app in ChatGPT in beta on 2026-05-05 for
search and compare, with click-through to Etsy (Retail Dive, above).

- Small non-Shopify merchant: eligible to apply for the feed. Approval is not guaranteed.
- Cost: none published.
- Build: a feed file. Checkout is not available to ButterLu in practice.
- Personalisation: none (section 1).

### 2.2 Stripe: Agentic Commerce Suite (ACS) and Shared Payment Tokens (SPT)

Verified on https://docs.stripe.com/agentic-commerce/sellers/use-cases/retail (2026-10-12):

- ACS is "available in the US, Canada, and select European countries." The legal terms are
  titled "Stripe Agentic Commerce Seller Services (Preview)", last modified 2026-09-28.
  https://stripe.com/legal/ssa-services-terms
- Onboarding: Dashboard → Agentic commerce → "Agentic commerce for retail". Add a Stripe profile
  with terms of service, privacy and return policy. Configure tax codes. Upload a CSV catalog
  through the Product Catalog Import API (`Stripe-Version: 2026-09-30.preview`) or the
  Dashboard. Then "Request connection" per agent, which the agent must accept.
- Orders arrive as ordinary `checkout.session.completed` webhooks, tagged with the agent in the
  Dashboard. That is the same event docs/07's webhook already handles.
- Optional hooks have a 4-second budget: price/availability, order approval (a timeout declines
  the order), and a custom-processor path with checkout create/update/confirm hooks.
- Feed cadence guidance: product data daily, inventory and pricing every 15 minutes. That is
  irrelevant for made-to-order goods with `inventory_not_tracked=true`.
- `disable_checkout=true` gives discovery-only listings that link to your site.
- Pricing: stripe.com/pricing lists "Shared Payment Tokens ... $0.15 per SPT issued" (verified
  2026-10-12, https://stripe.com/pricing). The page does not say whether the agent or the seller
  pays. ACS has no other published fee; normal card fees apply.
- Which agents are connectable: not listed in the public docs. ACS launched 2025-12-11 with Etsy,
  Wix, Squarespace, WooCommerce, BigCommerce and others as users (verified,
  https://stripe.com/newsroom/news/agentic-commerce-suite). Microsoft names Stripe ACS as an
  onboarding path for Copilot Checkout (2.5). Stripe joined UCP's governing council on
  2026-04-28 (verified, UCP announcements). Stripe's docs list both UCP and ACP as supported
  protocols.

- Small merchant: **yes, this is the most accessible programmatic path for a Stripe merchant not
  on Shopify.** It is preview, and each agent must approve the connection.
- Personalisation: none in the feed. Use `disable_checkout=true`.

### 2.3 Google: UCP, AP2, Merchant Center, AI Mode / Gemini

- **UCP** was announced 2026-01-11. It is open source (Apache 2.0) and co-developed by Google
  and Shopify with Walmart, Target, Etsy and others. Releases: v2026-01-11, v2026-01-23,
  v2026-04-08 and v2026-08-25. Businesses publish a profile at `/.well-known/ucp`.
  Capabilities: catalog, cart, checkout, identity linking (OAuth 2.0) and order. Transports are
  REST and JSON-RPC, with MCP, A2A and AP2 bindings. Verified: https://ucp.dev/ and repo
  `docs/documentation/announcements.md`.
- **Google's merchant integration**, verified (guides last updated 2026-10-05). Merchants choose a
  "checkout path (to support purchases directly on Google)" or a "cart path (to receive shopping
  carts and hand off to your website)". The steps are to "join the waitlist", and "Your
  integration must be approved by Google before you can go live". Checkout needs the Google Pay
  handler and order lifecycle updates. The feed needs
  `native_commerce(checkout_eligibility)=TRUE`, which defaults to FALSE. Ineligible categories
  include personalised goods and gifting (section 1).
  https://developers.google.com/merchant/ucp/guides
- **AP2** (Agent Payments Protocol, announced September 2025) is now positioned as a payments
  extension under UCP (ucp.dev "UCP and AP2"). Secondary sources only on its adoption. Nothing
  for ButterLu to build.
- **Discovery in AI Mode / AI Overviews.** Verified on Google's AI optimization guide (last
  updated 2026-07-10): "Using products like Merchant Center (such as Merchant Center feeds) and
  Google Business Profiles can help your products and services to be visible in both AI
  responses". "You don't need to create new machine readable files, AI text files, markup, or
  Markdown ... as Google Search itself doesn't use them". "Structured data isn't required for
  generative AI search ... However, it's a good idea to continue using it". It also points to an
  "agent-friendly website best practices" guide for browser agents.
  https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- The merchant-listing structured data guide (verified) requires Product `name`, `image` and
  `offers` (an Offer, not an AggregateOffer) with price and currency. It recommends
  `shippingDetails` and `hasMerchantReturnPolicy`, the latter ideally at Organization level, plus
  `aggregateRating` and `review`.
  https://developers.google.com/search/docs/appearance/structured-data/merchant-listing

- Small merchant: Merchant Center free listings are open to anyone and cost nothing. UCP checkout
  is waitlisted, needs approval, and **excludes this product category**. The UCP cart path is
  technically allowed but still waitlisted.
- Personalisation: excluded from checkout by policy.

### 2.4 Shopify: Catalog, Agentic Storefronts, Agentic plan

- 2026-01-11 (verified, https://www.shopify.com/news/ai-commerce-at-scale): Shopify Catalog "is
  now open to every brand" through the **Agentic plan**, aimed at brands not on Shopify. It
  syndicates to ChatGPT, Microsoft Copilot, Google AI Mode and Gemini, and the Shop app. Agentic
  Storefronts is the admin control panel. Shopify's blog says the Agentic plan has no monthly
  fee. Secondary sources disagree on whether it is GA or waitlisted.
- Shopify merchants are auto-enrolled in Copilot Checkout and Agentic Storefronts (Microsoft
  page, 2.5).
- Personalisation: not addressed anywhere I could find. A Shopify dev-forum thread shows Copilot
  rejecting bundle products, which hints that non-standard products get dropped. **Unverified.**
- Relevance: the owner decided to leave Shopify on 2026-10-12. The Agentic plan would put
  catalog data back into Shopify's system, with Shopify Checkout taking orders, and personalised
  input still has nowhere to go. Inference: not worth it now. Revisit only if Stripe ACS
  connections to the major agents stall.

### 2.5 Microsoft Copilot: Copilot Checkout and Merchant Center

Verified on https://about.ads.microsoft.com/en/solutions/technology/agentic-commerce
(2026-10-12):
- Copilot Checkout is live on Copilot.com and the Copilot mobile app.
- "Only English-language merchants who sell to US buyers are eligible at this time (supporting
  USD)." The merchant stays merchant of record.
- Onboarding paths: Microsoft Merchant Center with "a UCP-compliant feed", PayPal Store Sync,
  Stripe Agentic Commerce Suite, or Shopify (auto-enrolled). "Stripe and PayPal customers are
  not automatically enrolled and must opt in."
- One PSP per domain. Store settings are "Pilot only to select customers".
- "Microsoft does not currently charge a commission or affiliate fee on Copilot Checkout
  transactions."
- Launched around 2026-01-08 with PayPal, Stripe, Shopify and Etsy as partners (secondary,
  GeekWire). https://www.geekwire.com/2026/microsoft-launches-copilot-checkout-joining-the-ai-shopping-race-against-amazon-google-and-openai/
- Personalisation: not mentioned. The required feed attribute (native checkout eligibility)
  mirrors Google's, so per-product opt-out is possible.
- Small merchant: eligible. A Microsoft Merchant Center feed for organic Copilot discovery is
  free and can be the same file as the Google feed (inference: MMC imports Google Merchant
  Center feeds; not re-verified today).

### 2.6 Perplexity: Merchant Program and Instant Buy

- Instant Buy runs on PayPal and went free to all US users on 2025-11-25 with about 5,000 PayPal
  merchants. The merchant stays merchant of record. Secondary (PYMNTS):
  https://www.pymnts.com/news/artificial-intelligence/2025/paypal-and-perplexity-debut-instant-buy-ahead-of-black-friday-shopping/
- Perplexity's own help page names merchants on BigCommerce, Shopware and Wix (verified,
  https://www.perplexity.ai/help-center/en/articles/12932923-instant-buy-buy-with-paypal; promo
  page with no date).
- The Merchant Program (2024) is a free form-based program for sharing product data, aimed at
  larger retailers. Secondary only:
  https://www.websitebuilderexpert.com/news/perplexity-merchant-program/
- Personalisation: nothing published. Instant Buy depends on PayPal, and ButterLu's stack is
  Stripe-only. Inference: rely on organic discovery (crawlable pages plus structured data) and
  possibly Stripe ACS if Perplexity is a connectable agent there. Stripe named Perplexity as a
  Sessions 2026 partner (secondary).

### 2.7 PayPal: agentic commerce services

- Announced 2025-10-28: "agent ready" (accept payments on AI surfaces) and "store sync" (catalog
  to AI channels, orders into existing systems). Verified:
  https://newsroom.paypal-corp.com/2025-10-28-PayPal-Launches-Agentic-Commerce-Services-to-Power-AI-Driven-Shopping
- Secondary: PayPal acquired Cymbio in January 2026 for catalog orchestration. PayPal has also
  joined ACP as a payment provider.
- Relevance: a second PSP path to Copilot and Perplexity, at the cost of a PayPal integration
  ButterLu does not have. Microsoft allows one PSP per domain. Defer.

### 2.8 Visa Intelligent Commerce / Trusted Agent Protocol, Mastercard Agent Pay

- 2025-10-14 (verified, Cloudflare press release): Visa's Trusted Agent Protocol and Mastercard
  Agent Pay both build on Cloudflare's Web Bot Auth so merchants can recognise signed shopping
  agents. American Express said it would too. No merchant GA date was given.
  https://www.cloudflare.com/press/press-releases/2025/cloudflare-collaborates-with-leading-payments-companies-to-secure-and-enable-agentic-commerce/
- Visa's developer page (verified 2026-10-12) says TAP is "in the process of development and
  deployment." It gives no requirements for merchants.
  https://developer.visa.com/capabilities/trusted-agent-protocol
- Inference: for a Stripe merchant these arrive through Stripe (network tokens, SPTs) and
  through Cloudflare's bot classification. ButterLu builds nothing. It should only avoid
  blocking signed agents.

### 2.9 Amazon: Rufus, Shop Direct, Buy for Me

- Secondary (CNBC 2026-01-06, GeekWire): Buy for Me lists products scraped from brands' public
  sites and has Amazon's agent buy on the brand's site. Brands complained about unrequested
  orders, including for discontinued items. Amazon says brands can opt out by emailing
  branddirect@amazon.com.
  https://www.cnbc.com/2026/01/06/amazons-ai-shopping-tool-sparks-backlash-from-some-online-retailers.html
- There is no merchant program to join and nothing to build. Personalisation: an agent filling
  a checkout form on ButterLu's site would not have the shopper's text or photo unless the form
  demands them. Inference: the editor must make the text and photo **required before
  add-to-cart**, so no agent can place a blank order. ButterLu should watch for and refund any
  Amazon-placed orders it cannot fulfil, or opt out.

### 2.10 Cloudflare features that matter

All verified on developers.cloudflare.com, 2026-10-12.
- **AI bot policies.** Settings are Search / Agent / Training, each Allow, Block, or "Block on
  pages with ads". "On September 15, 2026, Cloudflare will set updated defaults for new domains:
  bots classified as Training or as Agent will be blocked on pages that display ads, and Search
  will remain allowed." The legacy "Block AI bots" toggle is deprecated.
  https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/
  Inference: butterlu.com shows no ads, so the default should not block agents. Still, set
  Search=Allow and Agent=Allow explicitly when the zone moves, and never turn on a blanket AI
  block. Training is a separate choice.
- **Web Bot Auth / signed agents.** From 2026-07-01, signed agents are classified as Verified
  bots ("Intermediary"). The `cf.bot_management.signed_agent` rule field requires Enterprise Bot
  Management, so nothing to build on a small plan.
  https://developers.cloudflare.com/bots/concepts/bot/verified-bots/
- **Pay per crawl.** "Currently in closed beta." It charges AI crawlers per request. Wrong
  direction for a store that wants to be crawled; skip.
  https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/what-is-pay-per-crawl/
- **Markdown for Agents** (2026-02-12). The edge converts HTML to Markdown for
  `Accept: text/markdown` requests. "Available to Pro, Business and Enterprise plans ... at no
  cost." Nice-to-have only. Astro can emit `.md` twins at build time on any plan.
  https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
- **Managed robots.txt and Content Signals** (`search`, `ai-input`, `ai-train`). Available on all
  plans. https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/
- **NLWeb on AI Search.** "Public preview ideal for experimentation". It deploys a Worker with
  `/ask` and `/mcp` over your crawled site.
  https://developers.cloudflare.com/ai-search/how-to/nlweb/ An MCP server is also possible as an
  ordinary Worker (Agents SDK `McpAgent`). No major shopping agent is documented as calling
  arbitrary merchant MCP servers for discovery, so treat it as speculative.

### 2.11 llms.txt and schema.org as agent signals

- Google: llms.txt is ignored by Google Search and its AI features (verified, AI optimization
  guide above). The guide adds: "It's completely fine if you decide to create and maintain
  LLMS.txt files ... for other services".
- schema.org Product / Offer / AggregateRating / MerchantReturnPolicy / OfferShippingDetails:
  required for Google merchant listings and rich results, but "not required for generative AI
  search" (verified). Inference: agents that browse (ChatGPT agent, Gemini in Chrome, Claude in
  Chrome, Amazon's buyer) read rendered pages and benefit from accurate price, shipping and
  return data in the HTML and JSON-LD. The value comes from correctness and consistency with the
  feed, not from any special markup.
- **Reviews constraint.** Every feed has review fields (OpenAI `review_count`/`star_rating` and
  store-level variants; Stripe `product_review_count`/`product_review_rating`/`product_reviews`).
  Filling them, or `aggregateRating`, with Etsy's 13,687 reviews is exactly what CLAUDE.md §3.4–5
  and G5 block. Leave them empty or use native butterlu.com reviews only.

---

## 3. Etsy in agentic commerce, and what it means for ButterLu's Etsy listings

Verified: Etsy's Q4 2025 results (8-K exhibit, 2026-02-19) say: "In addition to our previously
announced integration with OpenAI's ChatGPT Instant Checkout, in January of 2026, we announced
agentic shopping partnerships with Google and Microsoft", letting "signed-in U.S. users ...
purchase select Etsy items directly within AI-powered experiences like AI Mode in Google Search,
the Gemini app, and Copilot Checkout". Also: "an agentic payments partnership with Stripe ...
to accept agentic payments from multiple platforms via a single integration."
https://www.sec.gov/Archives/edgar/data/1370637/000137063726000017/exhibit99112312025.htm

Etsy was a launch user of Stripe ACS (2025-12-11, verified above) and is a UCP co-developer.
Retail Dive (2026-05-14, secondary) reports Etsy's ChatGPT app launched in beta on 2026-05-05 for
search and compare inside ChatGPT, with click-through to Etsy, after OpenAI pulled back on
Instant Checkout.

What this means for ButterLu (inference unless stated):
- **ButterLu's Etsy listings are almost certainly already discoverable** in ChatGPT (Etsy app,
  Etsy's feed), Google AI Mode/Gemini (Merchant Center and the Etsy partnership) and Copilot.
  Etsy decides this, not the seller. Secondary guides say ChatGPT Instant Checkout eligibility
  was tied to Etsy Offsite Ads membership. Unverified.
- **They are probably not buyable in-chat**, at least not with personalisation. Google's UCP
  rules exclude personalised goods. ChatGPT's Instant Checkout, while it ran, collected
  personalisation by seller email afterwards. ButterLu's frames require text, so the likely
  outcome is a click-through to the Etsy listing. Etsy has published no per-listing eligibility
  rules that I could find.
- **The Etsy shop is ButterLu's strongest agent-facing asset right now.** It has 13.7k reviews
  and an established Etsy brand that agents already see. butterlu.com has zero reviews and
  almost no authority. Agents will recommend the Etsy listing over the .com for some time.
  That is consistent with docs/07's "the brand already ranks as etsy.com".
- Two actions follow. First, make sure the Etsy listings carry personalisation instructions in
  the listing text, because agents read and summarise listing text. Second, **do not** run
  promotions in agent feeds that undercut Etsy prices (price parity, docs/07; Etsy's
  off-platform rules).
- To verify, ask in an incognito ChatGPT, Gemini and Copilot session for "personalized aunt
  picture frame" and record what is shown and where the buy button goes. This costs nothing and
  is the only way to see the real state. Do not scrape Etsy.

---

## 4. Recommendation for butterlu.com: four things, in order

These assume docs/07's storefront exists: static Astro pages, the React editor island, a Worker
`/api/checkout` that creates a Stripe Checkout Session with a `designId`, a
`checkout.session.completed` webhook, and prerendered feeds. Effort is in agent-session days on
top of that build, and is a guess.

### 1. Be crawlable, correct and in the free merchant feeds (2–3 days)
- Every search-intent page (G2 presets) is static HTML. It has one Product JSON-LD block with an
  `Offer` (price at Etsy parity, USD, `availability: InStock` or `MadeToOrder`, `url`),
  `shippingDetails` with handling and transit days (made-to-order lead time matters to agents),
  and Organization-level `MerchantReturnPolicy`. Personalised items usually allow no returns;
  state the actual policy. Leave `aggregateRating` out until native reviews exist (G5). Add
  these checks to `site/scripts/lint-dist.mjs`.
- State "required: name/text up to N characters; 4x6 photo upload" in visible text on each page,
  so any agent summarising the page tells the shopper what they will need.
- Feeds: a prerendered Google Merchant Center feed (free listings → AI Mode/Gemini discovery),
  the same feed into Microsoft Merchant Center (Copilot discovery), and Pinterest. Set
  `native_commerce` absent or FALSE. One TS module produces all of them from the catalog
  collection.
- Cloudflare zone: AI bot policies Search=Allow, Agent=Allow. Choose Training deliberately.
  Sitemap in robots.txt. Never a blanket AI block.
- Stack mapping: Astro static endpoints (`/feeds/google.tsv`), content collections, the lint
  over `dist/`, and Cloudflare zone settings. No Worker code.

### 2. Make the handoff an agent can complete: deep-linkable presets and a design-draft link (3–4 days)
- Every preset gets a stable URL. The editor accepts prefill parameters such as
  `?shape=scalloped&bg=sage-floral&line1=Aunt%20Jo&line2=...`, validated against
  `product-options.json`. An agent, or a human pasting from a chat, lands on a pre-filled frame.
  The only steps left are uploading the photo and paying.
- Inference: this is the substitute for the missing protocol field. Every agent can emit a URL.
  None can send ButterLu a photo.
- Make the editor operable by browser agents, per Google's agent-friendly guidance: real
  `<label>`ed text inputs, a native `<input type="file">` for the photo, no canvas-only
  controls, visible character limits, and errors as text.
- Make text and photo **required before add-to-cart** so no agent (Amazon Buy for Me included)
  can create an un-personalised order. Optionally offer a "photo by email after order" mode,
  which is the Etsy fallback. That would make a later agent-checkout path feasible, but it is an
  owner decision on fulfilment workflow.
- Publish a short `/how-to-order` page, an `llms.txt` pointing to it, and the prefill URL format.
  This costs nothing. It does nothing for Google and might help other agents (verified Google
  stance; others unknown).
- Stack mapping: React island reads `URLSearchParams` into the nanostore. A zod schema shared
  with `/api/design` validates the params. Playwright tests a prefilled URL through to a Stripe
  test Checkout.

### 3. Syndicate to agents in discovery-only mode: Stripe ACS plus the ChatGPT merchant application (1–2 days build, plus approval waits)
- Generate Stripe's catalog CSV from the same module as step 1. Use `inventory_not_tracked=true`,
  `disable_checkout=true`, `link` set to the preset URL, `custom_variant_option_1/2` for shape
  and background where useful, `shipping` with lead-time ranges, `product_highlight`,
  `question_and_answer` (put "what do I need to provide?" here), and no review fields. Upload
  with a small script through the Import API, upsert mode, run on deploy. Listen for the
  `v2.commerce.product_catalog.imports.*` webhook in the Worker, or poll.
- In the Dashboard, request connections to whichever agents are offered (ChatGPT, Copilot and
  Perplexity are plausible; the list is not public).
- Separately apply at chatgpt.com/merchants for OpenAI's feed program. The OpenAI feed can be a
  Google-compatible file once OpenAI confirms it.
- Stack mapping: a Node script in `scripts/` (manifest-driven per CLAUDE.md §6), the Stripe
  `2026-09-30.preview` API version pinned beside the stable one, and one more webhook event type
  in the existing route. Orders still arrive via the site's own Checkout, because discovery-only
  links go to butterlu.com.
- Status caveat: ACS is preview and each agent must approve the connection. Count it as an
  experiment, not a channel.

### 4. Defer: in-agent checkout with escalation, and an MCP endpoint (1–2 weeks; only after the site has real orders)
- If and when an agent accepts made-to-order personalised goods, implement ACS checkout hooks or
  a UCP cart path that returns `requires_escalation` with `continue_url` = the design-draft link
  from step 2. Google's cart path ("receive shopping carts and hand off to your website") is the
  closest fit, but it is waitlisted and approval-gated.
- An MCP server on Workers (Agents SDK `McpAgent`, or Cloudflare's NLWeb template) could expose
  `search_presets` and `create_design_draft(text, shape, background) → URL`. It is cheap to
  build, but no major shopping agent is documented as using merchant MCP servers for
  discovery. Build it only if one starts to.
- Skip for now: pay per crawl, Visa/Mastercard integrations (they come through Stripe and
  Cloudflare), PayPal Store Sync (second PSP), and the Shopify Agentic plan (re-imports Shopify;
  owner decision 2026-10-12).

### Why this order
Step 1 is the only one with verified reach: Google says Merchant Center feeds feed AI responses,
Microsoft says MMC feeds feed Copilot, and both are free. Step 2 turns any recommendation from
any agent into an order without waiting for protocols. Step 3 is cheap once the feed module
exists, but its reach is unproven. Step 4 builds toward checkout surfaces that today either
exclude this product (Google) or have been pulled back (OpenAI).

---

## 5. Announced but not shipped, or not confirmable

- A June 2026 relaunch of ChatGPT in-chat buying: one blog only, no primary source.
- Visa TAP and Mastercard Agent Pay merchant GA: "in development and deployment" (Visa, verified).
- Cloudflare pay per crawl: closed beta. NLWeb on AI Search: public preview.
- Stripe ACS: preview terms. The connectable agent list is not public.
- Google UCP checkout: waitlist and per-merchant approval. Secondary claims that UCP checkout is
  on regular Search listings since May 2026 are unverified.
- Shopify Agentic plan: Shopify says it is open. Secondary sources say waitlist.
- Microsoft MMC store settings for Copilot Checkout: "Pilot only to select customers".
- Perplexity Merchant Program for small merchants, and "Instant Buy" requirements: no current
  primary page found.
- Whether ButterLu's own Etsy listings currently show a Buy button in any agent: unknown. Check
  manually (section 3).
