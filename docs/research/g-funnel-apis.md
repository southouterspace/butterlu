# G — Official APIs and MCP connectors for ButterLu's sales funnel

Researched 2026-10-12. Scope: every official API and vendor-published MCP server that would let
Claude run ButterLu's ecommerce funnel, from discovery to repeat purchase, using official
interfaces only. Nothing was connected, authorised or written. No etsy.com marketplace pages were
fetched. The Etsy OpenAPI spec file (a developer artifact, not a marketplace page) was downloaded
once to check which endpoints exist.

Method note. The connector-registry tools named in the brief (SearchMcpRegistry, ListConnectors,
SuggestConnectors) are not available in this session: ToolSearch returned "No matching deferred
tools found". MCP availability below therefore comes from each vendor's own documentation. Where
only third-party sources describe a vendor MCP, the entry says so.

"Official MCP" here means published and hosted (or published as source) by the vendor itself.
Community wrappers are excluded under the "no unofficial wrappers" rule, even when good.

---

## 0. Connectors already attached to this session, and which matter

| Connector | Matters? | Why |
|---|---|---|
| Stripe | **Core** | Own-site checkout, refunds, tax, reporting. The official server at `mcp.stripe.com` ([docs.stripe.com/mcp](https://docs.stripe.com/mcp)). |
| Cloudflare (API, docs, bindings, builds, observability) | **Core** | Hosts butterlu.com (Workers, D1, R2), redirects, Web Analytics. Cloudflare says its API server "is the only MCP server you need" ([developers.cloudflare.com](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/)). The plugin's bindings, builds and observability servers need OAuth in this session before they work. |
| Resend | **Core** | Transactional email (order confirmations, review requests) and broadcasts. Official remote MCP at `mcp.resend.com/mcp` ([resend.com/docs/mcp-server](https://resend.com/docs/mcp-server)). |
| Gmail | **Core for support** | Owner inbox. Etsy buyer messages arrive here only as notifications, since Etsy has no messages API (§3). Google's official endpoint is `gmailmcp.googleapis.com` ([developers.google.com](https://developers.google.com/workspace/gmail/api/reference/mcp?authuser=0)). |
| GitHub | **Core** | The catalog and reviews live in git, and every change ships as a pull request (`docs/07`). |
| e2e | Core (dev) | Drives preview builds of the site. |
| Infisical | Useful | Secrets store for the many API keys below (CLAUDE.md §3.6). |
| Shopify | **Read-only legacy** | Kept only as the list of URLs to 301 (CLAUDE.md §1). Never write to it. |
| Firecrawl | Research only | Must never point at Etsy (Etsy API Terms §9, `docs/06`). |
| Figma | Minor | Creative work for pins and ads. |
| Neon, Vercel, WorkOS | Not needed | The stack is Cloudflare D1 and Workers (`docs/07`). |
| Claude Docs | Minor | Write-ups. |

None of the attached connectors covers discovery and ads, marketplaces, fulfilment, or accounting.
Those are the gaps the rest of this document fills.

---

## 1. Discovery and ads

### Pinterest API v5
- **What an agent can do:** create pins and boards; manage catalogs and feeds (`POST /catalogs/feeds`, product groups); run ads; read analytics ([developers.pinterest.com/docs/shopping](https://developers.pinterest.com/docs/shopping)). Feeds use the `catalogs:read` and `catalogs:write` scopes. Pinterest ingests a feed every 24 to 48 hours, and a merchant can have up to 50 feeds ([catalog docs](https://developers.pinterest.com/docs/shopping/catalog/)).
- **Conversions API:** sends server-side events. It authenticates with a conversion token generated in Ads Manager, and that token works only against the Conversions endpoint ([conversions docs](https://developers.pinterest.com/docs/conversions/event/)).
- **Auth and hurdle:** OAuth app. New apps start in **Trial**, where pins and boards are "visible only to creator". **Standard** access requires a recorded video demo of the OAuth flow, even for an app with a single user ([access tiers](https://dev.pinterest.com/docs/key-concepts/access-tiers/)).
- **Rate limits:** Trial allows 1,000 requests per day. Standard allows 100 per second per user per app, with category caps such as `catalogs_write` at 100 per minute ([rate limits](https://developers.pinterest.com/docs/reference/rate-limits/)).
- **Cost:** no published API fee (third-party: [blotato](https://www.blotato.com/blog/pinterest-api-pricing)).
- **MCP:** **none official.** Pinterest's MCP work is internal ([Pinterest Engineering](https://medium.com/pinterest-engineering/building-an-mcp-ecosystem-at-pinterest-d881eb4c16f1)), and the public servers are community projects.
- **No-API alternative:** `docs/07` already plans a static product-feed endpoint. A catalog fed by URL needs no API approval.

### Meta (Facebook and Instagram)
- **Marketing API and Catalog:** **official Meta Ads MCP** at `https://mcp.facebook.com/ads`. It covers reporting, creating and editing campaigns, ad sets and ads, catalog creation and management, signal and dataset quality, and A/B tests ([Meta Ads MCP overview](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview)). It authenticates through Facebook Login for Business, and no developer app is required ([search summary of Meta docs](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-get-started)). Third-party coverage says it launched in open beta on 2026-04-29, is free during the beta, and has 29 tools ([pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/1707/official-meta-ads-mcp-claude-29-tools-2026)). Meta's own MCP page warns that an agent can call anything the granted scopes allow, including in response to prompt injection ([developers.facebook.com/documentation/mcp](https://developers.facebook.com/documentation/mcp)).
- **Conversions API:** an access token generated in Events Manager. Basic use needs `ads_read` plus `ads_management` or `business_management`. App review applies only to advanced permissions, meaning many datasets or higher rate limits ([Dataset Quality API](https://developers.facebook.com/documentation/ads-commerce/conversions-api/dataset-quality-api)).
- **Instagram Graph content publishing:** requires a professional account. The limit is 50 API-published posts per rolling 24 hours ([content_publishing_limit](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit)). Organic Instagram posting needs a Meta app, and the Ads MCP does not cover it.
- **Hurdle:** low for ads (log in and grant scopes). Organic Instagram posting needs a developer app with Instagram permissions.

### TikTok
- **Marketing API:** **official TikTok for Business MCP Server.** It wraps about 400 API for Business endpoints: campaigns, reporting, audiences, catalogs, creatives. Two URLs exist: `business-api.tiktok.com/open_mcp/tt-ads-mcp-flat` (all tools, which TikTok recommends for Claude) and `.../tt-ads-mcp-layer` (about 40 core tools, the rest found on demand). It needs no developer app. Authorisation lasts 30 days and then must be renewed ([TikTok docs](https://business-api.tiktok.com/portal/docs/tiktok-ads-mcp-server/v1.3); [connection guide](https://business-api.tiktok.com/portal/docs/how-to-connect-to-tiktok-for-business-mcp-server/v1.3); [help centre](https://ads.tiktok.com/resources/help/article/about-tiktok-for-business-mcp-server?lang=en)).
- **Content Posting API:** "All content posted by unaudited clients will be restricted to private viewing mode." Lifting that requires an audit ([Direct Post reference](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)). Third parties put the audit at 2 to 6 weeks ([bundle.social](https://bundle.social/blog/tiktok-api-approval)). This is a real hurdle for a single-brand app.
- **TikTok Shop Partner API:** requires an approved TikTok Shop seller account, then a Partner Center developer account (US: `partner.us.tiktokshop.com`). A custom app for one's own shop skips the App Store listing review (third-party: [keyapi.ai](https://www.keyapi.ai/blog/tiktok-shop-api-integration-guide-sellers)). Whether made-to-order personalised goods suit TikTok Shop was not established. **No official MCP** for Shop was found.

### Google
- **Merchant API** (replaces the Content API for Shopping): manages product inputs and data sources for Shopping ads and free listings ([products overview](https://developers.google.com/merchant/api/guides/products/overview?hl=en)). **Content API for Shopping sunset: 2026-08-18.** Requests without an extension began failing intermittently with HTTP 410 on 2026-09-01. Full shutdown is set for early 2027 ([Google sunset page](https://developers.google.com/shopping-content/guides/sunset)). Any new build must use the Merchant API.
  - **MCP: official, alpha.** The Merchant API MCP Access Service at `https://merchantapi.googleapis.com/mcp` reads products, issues and reports. Its writes are limited to "low-risk actions" such as creating data sources. Google calls it "an experimental alpha version subject to change" ([Google docs](https://developers.google.com/merchant/api/guides/agentic-tools/merchant-data-mcp)). Auth is OAuth 2.0 or a service account. Cost: free.
  - **No-API alternative:** a scheduled fetch of a feed URL keeps working without the API ([productsup](https://www.productsup.com/blog/google-merchant-api-migration-what-changes-before-the-august-2026-deadline-and-how-to-prepare/)).
- **Google Ads API:** **official MCP `googleads/google-ads-mcp`, read-only** ("strictly read-only… cannot change bids, pause campaigns, or create assets"). It runs locally in Python, with OAuth or a service account. Google's page also says developer tokens "were sunset on September 9, 2026" ([Google Ads MCP docs](https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server)). Writes still go through the API directly.
- **YouTube Data API v3:** uploads from projects that have not passed YouTube's audit are forced to private (third-party: [ayrshare](https://www.ayrshare.com/solutions/google-api-error-403-unverified-app-how-to-fix-the-audit-pipeline/)). The default quota is 10,000 units per day, and sources disagree on what an upload costs, so check the Cloud Console ([rapidevelopers](https://www.rapidevelopers.com/md/api-automations/how-to-automate-youtube-video-uploads-using-the-api)). No official MCP was found. Low priority for this business.

### Microsoft Advertising
- **API:** the Bing Ads API needs a developer token plus user credentials. A Super Admin requests the token ([Microsoft Learn get-started](https://learn.microsoft.com/en-us/advertising/guides/get-started)). A third-party guide says the SOAP feature freeze is 2026-10-01, with shutdown on 2027-01-31; that is unverified ([unified.to](https://unified.to/blog/how_to_get_your_microsoft_advertising_api_key)).
- **MCP:** **none official** found. Search results were all community projects ([glama listing](https://glama.ai/mcp/servers/ri5m791pb5)). Low priority, since Bing traffic is small.

### Etsy Ads — GAP
- **No API.** The Etsy Open API v3 spec has 76 paths and 105 operations, and none of them concern ads, campaigns or stats. The only tags are listings, shop, shipping profiles, receipts, payments and ledger, reviews, taxonomy and users (spec read from the [Etsy Open API reference](https://developer.etsy.com/documentation/reference)). A third party confirms "advertising campaigns" are unsupported ([jentic](https://www.jentic.com/apis/etsy)). Budgets are managed only in Shop Manager ([Etsy Help](https://help.etsy.com/hc/articles/360033701174)).
- **What it means:** Claude cannot read Etsy Ads spend or ROAS, or change budgets. Ad cost shows up only as entries in the payment-account ledger (`getShopPaymentAccountLedgerEntries`, in the spec). The owner keeps Etsy Ads as a manual weekly task. Claude can draft recommendations from ledger and sales data.

---

## 2. SEO and analytics

- **Google Search Console API:** search analytics, sitemaps and URL inspection. URL inspection is limited to 2,000 queries per day and 600 per minute per site ([usage limits](https://developers.google.com/webmaster-tools/limits)). OAuth or a service account added to the property; free. The **Indexing API does not apply**: it "can only be used to crawl pages with either JobPosting or BroadcastEvent" ([Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart)). **MCP: none official.** A vendor blog states that Google ships no Search Console MCP as of October 2026 ([enrichlabs](https://www.enrichlabs.ai/blog/google-search-console-mcp-2026)). This gap matters, because GSC is the main SEO feedback loop.
- **GA4 Data and Admin APIs:** a standard property gets 200,000 core tokens per day and 40,000 per hour ([GA4 quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas?authuser=9)). **MCP: `googleanalytics/google-analytics-mcp`**, published under the googleanalytics GitHub organisation but labelled "Experimental". It has 7 read tools (run_report, run_funnel_report, realtime, and others), requires the `analytics.readonly` scope, and authenticates with Application Default Credentials ([GitHub](https://github.com/googleanalytics/google-analytics-mcp)). `docs/07` runs no GA4 today; Cloudflare Web Analytics may be enough.
- **Bing Webmaster API and IndexNow:** Bing's URL Submission API accepts up to 10,000 URLs per day ([Bing](https://www.bing.com/webmasters/url-submission-api)). IndexNow takes up to 10,000 URLs per POST, verified by a key file at the site root, and submissions are shared with all participating engines ([indexnow.org](https://www.indexnow.org/documentation)). No auth beyond the key file, and free. A post-deploy hook in the Worker CI can call IndexNow. No official MCP is needed.
- **Cloudflare Web Analytics and Crawler Hints:** Crawler Hints can send IndexNow pings automatically ([Cloudflare docs](https://developers.cloudflare.com/cache/about/crawler-hints)). Web Analytics data can be queried through the GraphQL Analytics API (`rumPageloadEventsAdaptiveGroups`, [Cloudflare datasets](https://developers.cloudflare.com/data-localization/metadata-boundary/graphql-datasets/)). It is reachable through the attached Cloudflare API MCP.

---

## 3. Marketplaces

### Etsy Open API v3 (the business's core channel)
- **Read and write scopes:** `listings_r/w/d`, `shops_r/w`, `transactions_r/w`, `address_r/w`, `profile_r/w`, `email_r`. Authorisation uses OAuth 2.0 with mandatory PKCE. Access tokens last 1 hour; refresh tokens last 90 days ([authentication](https://developer.etsy.com/documentation/essentials/authentication)).
- **What an agent can do (from the spec):** create and edit listings, inventory, images and video; set **listing personalisation** (`updateListingPersonalization`); manage shipping and processing profiles; read receipts; add tracking (`createReceiptShipment`, which notifies the buyer); read payments and the payment ledger; read reviews ([reference](https://developer.etsy.com/documentation/reference); [fulfilment tutorial](https://developer.etsy.com/documentation/tutorials/fulfillment/)).
- **Webhooks:** `order.paid`, `order.canceled`, `order.shipped`, `order.delivered`. They are "available for both commercial and personal applications" and HMAC-SHA256 signed. Retries run with backoff out to about 10 hours. The payload carries only `resource_url`, so the receiver must fetch the receipt ([webhooks](https://developer.etsy.com/documentation/essentials/webhooks)). A Cloudflare Worker can receive them.
- **Access tiers:** Seller Apps are "scoped only to your registered shop". Personal Apps are reviewed. Commercial Access is reviewed manually ([developer.etsy.com](https://developer.etsy.com/documentation/)). ButterLu needs only its own shop, so commercial access is unnecessary. G3 (credentials obtained) is done per CLAUDE.md.
- **Rate limits:** set per API key, as QPS and QPD, viewable in the portal ([rate limits](https://developer.etsy.com/documentation/essentials/rate-limits)). CLAUDE.md records 150 QPS and 100,000 QPD. Free.
- **Gaps:** (a) **no messages or conversations endpoint**. The spec has none, and a public feature request filed 2026-03-06 is open ([rapidevelopers analysis](https://www.rapidevelopers.com/api-automations/how-to-automate-etsy-customer-messages-using-the-api)). (b) **No shipping-label purchase**: "Open API v3 does not include an endpoint to order shipping" ([fulfilment tutorial](https://developer.etsy.com/documentation/tutorials/fulfillment/)). (c) No ads or stats (§1). (d) Reviews are read-only, and republishing them is restricted (`docs/06`, gate G5).
- **What the gaps mean:** buyer messages, which carry personalisation questions and proofs, stay human-handled in the Etsy app. Claude can triage Etsy's notification emails in Gmail but cannot reply through an official channel. Labels must be bought outside Etsy (Shippo or EasyPost, §5) and the tracking number posted back through `createReceiptShipment`. That gives up Etsy's discounted label prices.
- **MCP:** **none official.**
- **Terms:** the API Terms prohibit screen-scraping and using the API "primarily to drive traffic to other non-Etsy websites" ([Etsy API Terms](https://www.etsy.com/legal/api); `docs/06`).

### Amazon Handmade (SP-API)
- **Seller side:** Handmade charges a 15% referral fee and waives the Professional plan fee after approval ([sell.amazon.com/programs/handmade](https://sell.amazon.com/programs/handmade)). Personalised text uses **Amazon Custom**. Custom orders must be fulfilled by the seller, not FBA ([Amazon Custom](https://sell.amazon.com/programs/custom)).
- **API:** a **private seller app** is self-authorised and needs a **Professional** account ("Individual accounts are not eligible"). Registration requires a developer profile and answers to security-control questions, with no stated review time ([SP-API registration](https://developer-docs.amazon/sp-api/docs/sp-api-registration-overview)). Buyer customisation data is in `BuyerCustomizedInfo` on order items. Buyer PII has historically needed restricted roles, while the Orders API v2026-01-01 needs no Restricted Data Token ([getOrderItemsBuyerInfo](https://developer-docs.amazon.com/sp-api/reference/getorderitemsbuyerinfo); [get order information](https://developer-docs.amazon/sp-api/docs/get-order-information)).
- **Cost:** sellers using SP-API for their own business were exempt from the proposed developer fees, and those fees were reported cancelled in May 2026 ([Amazon announcement](https://developer.amazonservices.com/spp-announcement); [novadata](https://novadata.io/resources/news/amazon-cancels-sp-api-fees-may-2026)).
- **Hurdles:** the Handmade jury application, then SP-API developer registration.
- **MCP:** **none official**. All are community projects ([glama](https://glama.ai/mcp/servers/mattcoatsworth/AmazonSeller-mcp-server)).

### Walmart Marketplace (brief)
- Requires a US-registered entity with an EIN. Approval is selective (vendor blogs report 2 to 4 weeks), and integration is by API, bulk upload or a solution provider ([threecolts](https://www.threecolts.com/blog/how-to-sell-on-walmart/); [ecomcircles](https://ecomcircles.com/walmart-seller-account-requirements)). **No official MCP** was found. Not recommended now, because Walmart has no personalisation culture comparable to Etsy's.

### eBay (brief)
- The Sell APIs (Inventory, Fulfillment) use OAuth scopes such as `sell.fulfillment` ([Nexla summary](https://docs.nexla.com/user-guides/connectors/ebay_fulfillment_api)). **No official MCP.** The largest one says it is "unofficial… not affiliated with eBay" ([GitHub](https://github.com/YosefHayim/ebay-api-mcp-server)). Not recommended.

---

## 4. Own-site checkout and payments

- **Stripe (Checkout, Tax, Radar, webhooks):** standard pricing is 2.9% + 30¢. Checkout is "Included at no additional charge". Stripe Tax Basic costs 0.5% per transaction with the no-code integration or $0.50 per transaction through the API, charged only where the business is registered. Radar starts at $0.05 per screened transaction ([stripe.com/pricing](https://stripe.com/pricing)).
  - **MCP: official, attached.** `mcp.stripe.com` offers `stripe_api_read` and `stripe_api_write` over most of the API (Checkout Sessions, refunds, disputes, products and prices, tax registrations and calculations, webhooks, balance transactions, payouts) plus `stripe_analytics`. Refunds and outbound payments require human confirmation through an approval link. **From 2026-10-31, Stripe MCP stops accepting full secret keys and untagged restricted keys; use OAuth or an Agent key** ([docs.stripe.com/mcp](https://docs.stripe.com/mcp)). Any automation that uses a key needs an Agent key before that date.
  - **Agentic channels:** the Agentic Commerce Suite exposes the catalog to AI agents over a hosted ACP endpoint ([Stripe blog](https://stripe.com/blog/agentic-commerce-suite)). It is US-only ([Stripe](https://stripe.com/ae/use-cases/agentic-commerce)).
- **Cloudflare:** the Workers, D1, R2 and redirects that run butterlu.com, all reachable through the attached API MCP ([Cloudflare MCP list](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/)).

---

## 5. Fulfilment

ButterLu makes its own frames, so fulfilment means buying labels and posting tracking, not
outsourcing production.

- **USPS APIs (v3 platform):** Web Tools was retired on 2026-01-25. The REST APIs at `apis.usps.com` use OAuth 2.0 ([USPS](https://qusps.usps.com/business/web-tools-apis/)). Buying labels directly requires a USPS business account with a CRID, MID and Enterprise Payment Account, and a label provider must be authorised in the Customer Onboarding Portal ([PostalPro](https://postalpro.usps.com/merchant-onboarding-guide)). A third party reports a default of 60 calls per hour per API ([packagist](https://packagist.org/packages/justinholtweb/craft-carrier-usps)). Workable, but more setup than an aggregator. **No MCP.**
- **UPS:** REST APIs with OAuth client credentials and a free shipper account (third-party: [atoship](https://atoship.com/blog/ups-shipping-api-integration-developer-guide)). **No MCP** found.
- **Shippo:** **official MCP.** The hosted server at `https://mcp.shippo.com` uses OAuth; there is also a local `@shippo/shippo-mcp`. It covers address validation, rates, label purchase, tracking, customs, batches and pickups. Test tokens (`shippo_test_`) create nothing real ([Shippo MCP docs](https://docs.goshippo.com/docs/guides_general/mcpserver)). Pricing: the Starter plan is free for up to 30 labels a month; Pro is $17 a month ([goshippo.com/pricing](https://goshippo.com/pricing)). **Best fit.**
- **EasyPost:** the API costs $0.08 per label after 36,000 free labels a year, with at most 3,000 free per month ([EasyPost API addendum](https://easypost.com/legal/api-addendum)). **No official MCP** found.
- **ShipStation:** API access is limited to the Gold plan in the US (third-party: [1teamsoftware](https://1teamsoftware.com/?p=32079)). No official MCP found.
- **Pirate Ship: GAP.** No public developer API was found ([search result context](https://theretailexec.com/es/tools/resena-pirate-ship/)). `docs/07` assumed it for hand-bought labels. It cannot be automated.
- **Print and production partners:** Gelato sells framed posters and has an API ([gelato.com](https://www.gelato.com/custom-posters)). Printful has an order API ([printful.com/api](https://printful.com/api)). Neither makes ButterLu's two frame shapes with 44 backgrounds, so neither is relevant unless the product changes.

---

## 6. Email, SMS and retention

- **Resend:** **official MCP, attached** (`mcp.resend.com/mcp`, OAuth or API key). It covers send and receive, templates, contacts, broadcasts, automations, segments and webhooks ([resend.com/docs/mcp-server](https://resend.com/docs/mcp-server)). It covers transactional email and simple retention.
- **Klaviyo:** **official remote MCP** at `https://mcp.klaviyo.com/mcp`, using OAuth with dynamic client registration and limited to Owner, Admin or Manager roles. A `read-only=true` mode is available ([Klaviyo MCP](https://developers.klaviyo.com/en/docs/klaviyo_mcp_server)). The free tier is capped at 250 profiles and 500 emails a month ([Klaviyo](https://developers.klaviyo.com/en/docs/klaviyo_stripe_projects_context)). Rate limits are per account, tiered from XS to XL ([rate limits](https://developers.klaviyo.com/en/v2026-04-15/docs/rate-limits-and-error-handling)). Worth adopting once the own-site list grows past what Resend handles comfortably.
- **Mailchimp:** the only first-party MCP covers Mandrill (transactional), at `mandrillapp.com/mcp`. No official server exists for the Marketing API ([mcpservers summary](https://mcpservers.org/remote-mcp-servers/mailchimp); [growthmethod](https://growthmethod.com/mailchimp-mcp-server/)). Skip.
- **Postscript:** Shopify-focused, with only an SDK for headless shops ([Postscript help](https://help.postscript.io/hc/en-us/articles/4407642816795); [TechCrunch](https://techcrunch.com/?p=2120446)). A poor fit after leaving Shopify.
- **Attentive:** has a Custom Events API, but its help centre says that API is only for vendors of publicly distributed marketplace apps; pricing is quote-based ([Attentive's APIs](https://help.attentive.com/hc/en-us/articles/360062103592-Attentive-s-APIs)). Skip at ButterLu's size.

---

## 7. Reviews and support

- **Etsy reviews:** `getReviewsByShop` and `getReviewsByListing` need only an `x-api-key`, and are read-only. Republishing them is blocked pending G5 (`docs/06`; CLAUDE.md §2).
- **Judge.me:** **now Shopify-only.** Support for non-Shopify platforms ended, with the final dates in January 2026 ([Judge.me help](https://judge.me/help/en/articles/11868548-judge-me-sunsetting-on-woocommerce-square-squarespace-bigcommerce-duda-and-prestashop)). Not usable on the new site.
- **Okendo:** publishes headless install docs and a Storefront REST API ([docs.okendo.io](https://docs.okendo.io/on-site/advanced-widget-installs/installing-widget-plus-on-headless-instances)), but it centres on Shopify. No MCP.
- **Trustpilot:** API access requires the paid API module add-on (tiers of 200,000 calls, 1,000,000 calls, or unlimited) or the Enterprise plan. Invitations count against a separate monthly allowance ([Trustpilot API module](https://developers.trustpilot.com/api-module-overview/)). No MCP found.
- **Native reviews** (`docs/04`, `docs/07`) need no vendor: a signed link in the Resend email, a Worker writes the review to D1, and a pull request publishes it. This is the recommended path.
- **Gmail:** official Google MCP endpoint ([Google](https://developers.google.com/workspace/gmail/api/reference/mcp?authuser=0)), already attached.
- **Gorgias:** a third party reports an official MCP at `mcp.gorgias.com/mcp`, in open beta since May 2026 and included in Helpdesk plans ([ringly](https://www.ringly.io/blog/gorgias-mcp)). Unverified against Gorgias's own docs.
- **Zendesk:** a general ticket MCP was announced on 2026-05-19 but, per a third party, has not shipped ([tldv](https://tldv.io/blog/zendesk-mcp/)). A help desk is overkill at about 200 real site sessions a year. Gmail is enough.

---

## 8. Finance and operations

- **Stripe reporting:** balance transactions, payouts and `stripe_analytics` through the attached MCP ([docs.stripe.com/mcp](https://docs.stripe.com/mcp)).
- **Etsy finance:** payments and payment-ledger endpoints with `transactions_r` (spec, [reference](https://developer.etsy.com/documentation/reference)).
- **QuickBooks Online:** Intuit publishes an open-source local MCP, `intuit/quickbooks-online-mcp-server`, with CRUD on 29 entities and 11 reports. It needs an Intuit Developer app (OAuth client plus refresh token). An earlier Intuit preview ran only in the sandbox ([codewords summary](https://www.codewords.ai/blog/quickbooks-mcp); [Intuit blog](https://blogs.intuit.com/?p=35282)). Confirm production support in the repo.
- **Xero:** official `XeroAPI/xero-mcp-server` (npm `@xeroapi/xero-mcp-server`), local, OAuth2 ([mcpservers](https://mcpservers.org/servers/XeroAPI/xero-mcp-server)).
- Pick whichever ledger the owner's accountant uses.

---

## 9. Summary table

| Stage | System | Official API | Official MCP connector | Hurdle for ButterLu |
|---|---|---|---|---|
| Discovery | Pinterest | API v5 (pins, catalogs, ads, CAPI) | None | Trial pins are private; Standard needs a video demo |
| Discovery/ads | Meta | Marketing, Catalog, CAPI, IG Graph | **Meta Ads MCP** (`mcp.facebook.com/ads`) | Low for ads; IG posting needs an app |
| Discovery/ads | TikTok | API for Business, Content Posting, Shop Partner | **TikTok for Business MCP** (ads only) | Re-authorise every 30 days; posting needs an audit |
| Discovery | Google Merchant | Merchant API (Content API sunset 2026-08-18) | **Merchant API MCP** (alpha, limited writes) | Low |
| Ads | Google Ads | Google Ads API | **google-ads-mcp** (read-only) | Writes need the API directly |
| Ads | Microsoft Ads | Bing Ads API | None | Developer token |
| Ads | Etsy Ads | **None (gap)** | None | Manual in Shop Manager |
| SEO | Search Console | GSC API (Indexing API n/a) | **None (gap)** | OAuth; service account on the property |
| Analytics | GA4 | Data/Admin API | **google-analytics-mcp** (experimental, read) | Low |
| SEO | Bing / IndexNow | URL Submission, IndexNow | None needed | Key file only |
| Analytics | Cloudflare | GraphQL Analytics | **Cloudflare API MCP** (attached) | Plugin servers need OAuth |
| Marketplace | Etsy | Open API v3 + webhooks | None | Done (G3); no messages, labels, ads or stats |
| Marketplace | Amazon Handmade | SP-API (private app) | None | Handmade jury plus Professional account |
| Marketplace | Walmart / eBay | Marketplace API / Sell APIs | None | EIN and selective approval / low fit |
| Checkout | Stripe | Checkout, Tax, Radar, webhooks | **Stripe MCP** (attached) | Agent key or OAuth by 2026-10-31 |
| Hosting | Cloudflare | Workers/D1/R2 API | **Cloudflare API MCP** (attached) | None |
| Fulfilment | Shippo | Shippo API | **Shippo MCP** (`mcp.shippo.com`) | Low; free up to 30 labels a month |
| Fulfilment | USPS / UPS / EasyPost | REST APIs | None | USPS: CRID, MID, EPA setup |
| Fulfilment | Pirate Ship | **None (gap)** | None | Manual only |
| Email | Resend | Resend API | **Resend MCP** (attached) | None |
| Email | Klaviyo | Klaviyo API | **Klaviyo MCP** (`mcp.klaviyo.com`) | Paid beyond 250 profiles |
| SMS | Postscript / Attentive | Shopify-bound / partner-only | None | Poor fit |
| Reviews | Etsy reviews | Read-only endpoint | None | G5 blocks republishing |
| Reviews | Judge.me / Okendo / Trustpilot | Shopify-only / headless / paid add-on | None | Build native instead |
| Support | Gmail | Gmail API | **Gmail MCP** (attached) | None |
| Support | Etsy messages | **None (gap)** | None | Human in the Etsy app |
| Finance | QuickBooks / Xero | QBO / Xero APIs | **Intuit QBO MCP** (local) / **Xero MCP** (local) | Developer app and OAuth |

---

## 10. Recommended minimum stack

1. **Keep what's attached:** Stripe, Cloudflare, Resend, Gmail, GitHub, Infisical. Together they
   run butterlu.com end to end: catalog, checkout, tax, order email, native reviews and support.
   Move Stripe authentication to OAuth or an Agent key before 2026-10-31.
2. **Etsy Open API v3 through a Worker, not an MCP:** an `order.paid` webhook triggers a receipt
   fetch; once a label is bought, `createReceiptShipment` posts tracking; listing edits ship as
   reviewed manifests. The credentials are already obtained (G3).
3. **Add Shippo MCP:** labels for Etsy and site orders from one place, with tracking written back
   to Etsy and the D1 order table. Start with `shippo_test_` tokens.
4. **Discovery, ranked by return on effort:** a feed URL from `docs/07` for both Pinterest and
   Google Merchant (no API approval needed); **Meta Ads MCP** and **TikTok for Business MCP**
   when paid ads start; the Merchant API MCP for diagnosing feed problems.
5. **SEO loop:** the GSC API through a small read-only script with a service account (no
   official MCP); IndexNow from CI; Cloudflare Web Analytics through the API MCP.
6. **Later:** Klaviyo MCP once the site list passes a few hundred buyers; Intuit QBO or Xero MCP
   for bookkeeping; Amazon Handmade after the site works.

**Stays manual (no official interface):** Etsy buyer messages, Etsy Ads budgets, Etsy label
purchase at Etsy's own rates, Pinterest organic posting until Standard access is approved, TikTok
organic posting until audited, and Pirate Ship.
