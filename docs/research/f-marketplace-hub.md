# F. Can butterlu.com be the hub for Etsy and Amazon Handmade?

Researched 2026-10-12. No write calls were made to any API. Every factual claim carries a URL. "Verified" means read on an official page or in the live Etsy OpenAPI spec that day. "Inference" means my reasoning from those facts. Etsy marketplace pages were not fetched. Etsy's legal pages and help centre returned 403 to WebFetch, except the API Terms, which were read in full through Firecrawl.

The Etsy spec was downloaded from https://www.etsy.com/openapi/generated/oas/3.0.0.json (version 3.0.0, 106 operations). Spec-derived claims below cite that URL.

## The short answer

Yes for orders, and partly for listings. Nothing on Etsy's side forbids a seller's own app from managing the seller's own shop. The Etsy API covers almost the whole listing lifecycle, including the new multi-question personalization, and it covers order reads plus marking orders shipped. Amazon's SP-API covers listings and orders for a private seller app, but Amazon Custom (the personalization template) has no API that I could find. It is configured in Seller Central.

"The site's catalog is the source of truth and everything syncs out" is the wrong shape for Etsy, though. The site will hold one configurable frame and about 94 presets. Etsy holds 539 frame listings, each tuned for a search, and those listings carry 76k sales and 13.7k reviews. The hub should own the shared facts: price, backgrounds and shapes, images, processing time, shipping and personalization questions. Each Etsy listing should keep its own title, tags and description, owned per channel record and never overwritten from the site by default. Build order ingest first, listing edits second, and Amazon third, if at all.

---

## 1. Etsy Open API v3: writes

### Verified

**OAuth and scopes.** Etsy requires PKCE with `code_challenge_method=S256` on every authorization request. Access tokens last 3600 seconds and refresh tokens have a "functional lifetime (90 days)". Changing scopes requires the user to re-authorize. The scope list is `address_r/w`, `email_r`, `listings_d`, `listings_r`, `listings_w`, `profile_r/w`, `shops_r`, `shops_w`, `transactions_r` and `transactions_w`. https://developers.etsy.com/documentation/essentials/authentication

The scopes per operation, read from the spec (https://www.etsy.com/openapi/generated/oas/3.0.0.json):
- `listings_w`: createDraftListing, updateListing, uploadListingImage, deleteListingImage, uploadListingVideo, updateListingInventory, updateListingPersonalization, updateVariationImages, updateListingProperty, and listing translations.
- `listings_d`: deleteListing.
- `listings_r`: getListingsByShop (draft, inactive and expired listings), getListingInventory.
- `shops_w`: shop sections, return policies, shipping profiles with destinations and upgrades, processing profiles ("readiness state definitions"), holiday preferences, and updateShop.
- `shops_r`: getShopProductionPartners, getShopShippingProfiles.
- `transactions_r`: getShopReceipts, transactions, payments and ledger.
- `transactions_w`: createReceiptShipment, updateShopReceipt.

The hub's minimum set is `listings_r listings_w shops_r shops_w transactions_r transactions_w`. Leave out `listings_d`, so a bug cannot delete a listing. Leave out `address_r` and `email_r` unless they are needed. The terms forbid requesting "more than the minimum amount of data needed" (§5 item 17, https://www.etsy.com/legal/api).

**Access tiers.** Etsy's docs name three tiers. A Seller App is "limited to your own shop". A Personal App can "build with Etsy's API beyond your own shop" at limited scale. Commercial Access covers sellers who grant OAuth consent. https://developers.etsy.com/documentation/ The API Terms §2 define personal use as "building tools for your own Etsy shop or for testing" and commercial use as "Applications for use by multiple Etsy shops" (https://www.etsy.com/legal/api). Search results quoting Etsy's help centre say commercial access is needed to share an app with "more than four other shops" (https://help.etsy.com/hc/en-in/articles/360025870013-What-is-Etsy-s-API, quoted through search because the page returned 403).

**Rate limits.** Limits are set per API key, QPS first and then QPD over a rolling 24 hours. A 429 comes with `retry-after`. Etsy publishes no fixed numbers by tier. Your actual limits are in the Developer Portal, and higher limits are requested by email. The example headers show 150 QPS and 100,000 QPD. https://developers.etsy.com/documentation/essentials/rate-limits The terms let Etsy "set, grant, enforce, modify or restrict" limits and forbid extra keys used to get around them (§2, https://www.etsy.com/legal/api). Etsy's docs do not say whether personal and commercial apps get different limits. CLAUDE.md records 150 QPS and 100k QPD as verified for this app.

**Listing lifecycle.**
- `createDraftListing` creates a physical draft. Required fields are quantity, title, description, price, `who_made` (`i_did | someone_else | collective`), `when_made` (enum including `made_to_order`) and taxonomy_id. Optional fields include `shipping_profile_id`, `return_policy_id`, `shop_section_id`, `readiness_state_id`, `production_partner_ids`, tags, materials, styles, dimensions, `should_auto_renew` and `is_customizable`. (spec)
- The listings tutorial says physical listings need a shipping profile and a processing profile (`readiness_state_id`), and that `processing_min/max` are "in deprecation phase and will be removed by Q1 2026". https://developers.etsy.com/documentation/tutorials/listings
- `updateListing` is a PATCH. `state` accepts `active | inactive`. "Setting a `draft` listing to `active` will also publish the listing on etsy.com and requires that the listing have an image set. Setting a `sold_out` listing to active will update the quantity to 1 and renew the listing." Activating or manually renewing checks that the shipping profile is complete. (spec)
- Images: `uploadListingImage` takes multipart upload, `rank`, `overwrite` and `alt_text` (500 characters max). A listing can hold up to 20 images. (spec)
- Video: `uploadListingVideo`. Setting `is_multi_video` allows two videos per listing. A third returns 409. (spec; https://developers.etsy.com/documentation/tutorials/listings)
- Inventory: `updateListingInventory` replaces the whole products array ("the entire set of products ... must be in the products array"). Variations cannot be added at creation, only afterwards. The limits are 70 products for one variation, 4,900 for two, 2,500 for three, and 400 when the `*_on_property` fields vary by every property. A third variation needs `max_variations_supported=3`, and missing variations are deleted. https://developers.etsy.com/documentation/tutorials/listings, https://developers.etsy.com/documentation/tutorials/third-variation
- Deletion: `deleteListing` needs `listings_d`. (spec; tutorial)

**Personalization.** The old `personalization_*` listing fields are gone. Requests that include them now return errors. The new endpoints are `get`, `update` and `deleteListingPersonalization`. A listing takes up to 5 questions of the types `text_input`, `dropdown`, `unlabeled_upload` and `labeled_upload`, with at most one upload question. Question text is 1–45 characters, instructions up to 120, dropdowns 1–30 options of up to 20 characters each, and text answers 1–1024 characters. The POST "fully replaces the existing personalization data". Without `?supports_multiple_personalization_questions=true`, an overwrite of existing questions returns 409. Etsy warns that "Adding the param without updating your application can lead to deleting data provided by the seller". https://developers.etsy.com/documentation/tutorials/personalization-migration, https://developers.etsy.com/documentation/tutorials/personalization/examples

Optional text questions can carry an add-on price of $0.20–$500 through the same endpoint. After a 30-day migration window, an update that omits `add_on_price` on a priced question is a validation error. https://developers.etsy.com/documentation/tutorials/personalization-addon-pricing

The spec's own field description still says "Currently, only a single question with type 'text_input' is supported", which contradicts the tutorials (spec). Search results quote an Etsy help article for beta participants saying personalization "can only be managed on Etsy.com" and that third-party tools (it names Shopify Marketplace Connect, ShipStation, Printify and Gelato) are blocked during the beta. https://help.etsy.com/hc/en-us/articles/33478801738519-How-to-Offer-Personalized-Listings-as-a-Beta-Participant (403 to WebFetch; quoted through search, not read directly)

**Shop configuration.**
- Shop sections: create, update and delete. (spec)
- Return policies: create, update, delete and consolidate. `return_policy_id` is required for active physical listings outside the EU. (spec)
- Shipping profiles: full CRUD including destinations and upgrades. (spec)
- Processing profiles: CRUD. (spec)
- Production partners: read only (`getShopProductionPartners`). A listing can reference partner IDs, but no endpoint creates a partner. (spec)

**Fees on publish and renew.** Etsy charges $0.20 per listing published, and the same on every renewal, manual or automatic, with listings lasting four months (https://www.etsy.com/legal/fees/ via search; https://help.etsy.com/hc/en-us/articles/360000344368-How-to-Renew-or-Hide-Your-Listings via search). A sale on a multi-quantity listing triggers another $0.20 auto-renew fee (https://help.etsy.com/hc/en-us/articles/360000344908-Fees-and-Listing-Multiple-Quantities via search). A renewed listing "will still keep its original view count, number of favorites, and web address" (renew article above, via search). In API terms, activating a draft publishes it, and activating a sold-out listing renews it (spec), so both cost $0.20.

**Orders and shipping.** `getShopReceipts` and the transaction endpoints need `transactions_r`. Personalization answers appear on transactions as `property_id: 54` entries, possibly several of them, and upload answers come back as URLs. https://developers.etsy.com/documentation/tutorials/personalization-migration

`createReceiptShipment` takes `tracking_code`, `carrier_name` (or `other`), `send_bcc`, `note_to_buyer`, `ship_date` and package fields. Etsy emails the buyer each time. Tracking is required for US orders over $10. Where Etsy's Preferred Partner Program is enforced, the endpoint is open only to approved fulfillment partners, but "a personal-use application owned by the authenticated seller" is authorized. Access to receipt address fields "is contingent in some regions to a preferred partnership status". (spec)

**Webhooks.** There are four events: `order.paid`, `order.canceled`, `order.shipped` and `order.delivered`. Requests are signed with HMAC-SHA256 over `id.timestamp.body` using the `webhook-id`, `webhook-timestamp` and `webhook-signature` headers, with a suggested 300-second replay window. Retries run immediately, then at 5 s, 5 min, 30 min, 2 h, 5 h and twice at 10 h. The payload holds only `event_type`, `resource_url` and `shop_id`. Etsy says webhooks work for commercial and personal apps, but its registration steps say to open "your commercial app". There is no listing or review event. https://developers.etsy.com/documentation/essentials/webhooks

**What the API cannot do that the web UI can.** The spec's 106 operations contain no endpoint for any of these (https://www.etsy.com/openapi/generated/oas/3.0.0.json):
- Sales, discounts or coupon codes
- Etsy Ads or Offsite Ads settings
- Buyer messages
- Refunds or cancellations
- Buying Etsy shipping labels
- Shop stats beyond the per-listing `views` field
- Creating production partners
- Copying a listing
- Replying to reviews

Variations cannot be set at creation (https://developers.etsy.com/documentation/tutorials/listings). New personalization features may be UI-only during a beta (help article above, unconfirmed).

**API Terms (current version "Last updated on Aug 18, 2026", https://www.etsy.com/legal/api).**
- §5 Prohibited Behavior, items 1 and 2: you will not "circumvent the Etsy checkout process", or "Divert sales or migrate Etsy Members from Etsy, or drive traffic to external websites or services unrelated to the Etsy platform".
- Item 15: no spam, and no connecting to "any third-party advertising or marketing platform".
- Item 16: no "sending to Etsy Members order, shipping and tracking information, whether via email, text or otherwise, unless expressly authorized in writing by Etsy".
- Item 24: no scraping or automated access "unless expressly authorized in writing by Etsy".
- Display of Data: listing content you display may be at most 6 hours staler than Etsy's, and other content at most 24 hours. Do not cache "longer than is reasonably necessary".
- Required notice, word for word: "The term 'Etsy' is a trademark of Etsy, Inc. This Application uses Etsy's API, but is not endorsed or certified by Etsy." It must be prominently displayed within the Application.
- §3: the Application Purpose and "any updates to the Application" need Etsy's prior approval. An application with no successful call for six consecutive months may be suspended.
- §4: Etsy Member personal data may be processed only to provide the service.

### Inference

- **A personal app for one shop can run indefinitely.** Nothing in the terms limits how long a single-shop personal-use app may run. In practice it needs a successful call at least every 6 months (dormancy) and a token refresh at least every 90 days, or the owner must re-authorize. A daily order poll covers both.
- **The traffic clause.** An app that pushes the owner's own listings and prices into Etsy, and marks Etsy orders shipped, sells on Etsy. It does not divert from Etsy. The risk sits elsewhere. The same Worker also runs a competing storefront. Using Etsy buyer data (names, emails, addresses from receipts) to market butterlu.com would breach items 2, 13 and 15. Sending Etsy buyers your own shipping emails would breach item 16; let `createReceiptShipment` notify them instead. Order ingest must keep Etsy buyers out of any mailing list and out of the site's review-request emails.
- **Approval of the app's purpose.** docs/06 says the registered Seller App describes "listing and inventory writes for the seller's own shop". That fits the hub. A material change, such as a webhook endpoint or a new scope, is an "update" to submit under §3.
- **The notice.** Put it in the admin UI, the part of the "Application" that calls the API. The public storefront displays no Etsy-sourced content, so the 6- and 24-hour rules should not apply to it, provided the site's catalog is owner-authored content that is pushed to Etsy rather than pulled from it.
- **docs/06 is out of date.** It quotes an older version of the terms ("Section 9" for scraping, a slightly different notice). The Aug 2026 text moves scraping to §5 item 24 and adds items 2, 16 and 25. docs/06 should be refreshed (not done here; repo untouched).

---

## 2. Amazon Handmade through SP-API

### Verified

**Access.**
- Register as a private developer: Seller Central (or the Solution Provider Portal) → Apps and Services → Develop Apps. Choose the private-developer data-access option, pick roles, describe use cases and security controls, and agree to the Acceptable Use and Data Protection policies. Amazon opens a case, and you must answer within five days. https://developer-docs.amazon/sp-api/docs/register-as-a-private-developer
- A private app can be self-authorized while still in draft ("there is no reason to publish a private application"). You must be the account's Primary User. Refresh tokens are "long-lived" and access tokens last about 3600 s. https://developer-docs.amazon/sp-api/docs/self-authorization
- Restricted roles (PII) go through a heavier review. Non-restricted roles typically take one to two weeks (search summary of https://developer-docs.amazon.com/sp-api/docs/register-as-a-private-developer).

**Roles.** https://developer-docs.amazon/sp-api/docs/roles-in-the-selling-partner-api
- Product Listing: listings.
- Inventory and Order Tracking: required for `confirmShipment` (https://developer-docs.amazon/sp-api/docs/confirm-the-shipment-status).
- Direct-to-Consumer Shipping (restricted): order retrieval for shipping with PII.

**Fees for API use.** Amazon's planned $1,400 annual developer fee was cancelled on 2026-05-12. Sellers using SP-API "only for their business" were never in scope. These are secondary sources; I found no Amazon page confirming the cancellation. https://ppc.land/amazon-drops-sp-api-fees-after-developer-pushback, https://novadata.io/resources/news/amazon-cancels-sp-api-fees-may-2026

**Listings.**
- The Listings Items API (`putListingsItem` and `patchListingsItem`) defaults to 5 requests per second per seller, with lower caps for product-data and relationship updates. https://developer-docs.amazon/sp-api/docs/listings-items-api-rate-limits
- Images are submitted as URLs, including "Images hosted on third-party servers that are publicly available to Amazon", and must meet Amazon's image requirements. https://developer-docs.amazon/sp-api/docs/submit-media
- Main-image rules quoted from an Amazon staff forum post: RGB 255,255,255 background, product filling at least 85% of the frame, no text or watermark, and at least 1000 px on the longest side for zoom. https://sellercentral.amazon.com/seller-forums/discussions/t/13af96ea-6b07-4bf9-8dbe-a13292c2e3b1
- Product types not yet launched in the Listings Items API and Product Type Definitions API cannot be created with product facts. https://developer-docs.amazon.com/sp-api/docs/manage-product-listings-guide
- Handmade is moving listings from GUILD product types to standard ones (Amazon's example is GUILD_HOME → LAMP). Approved sellers add a "Handmade Classification" attribute (forum announcements via search: https://sellercentral.amazon.com/seller-forums/discussions/t/bb9c5c7f-6fae-41ae-aa42-b2eecbe5a02f). I could not confirm whether a picture frame lists as PICTURE_FRAME or as a GUILD type without an authenticated `getDefinitionsProductType` call.

**Amazon Custom.** The SP-API docs index (https://developer-docs.amazon/sp-api/llms.txt) has no operation for creating or editing customization templates. Two related operations exist:
- `confirmCustomizationDetails`, a buyer message asking the buyer to verify personalization (1 rps). https://developer-docs.amazon/sp-api/reference/confirmcustomizationdetails
- Order-side `BuyerCustomizedInfo.CustomizedURL`, "The location of a ZIP file containing Amazon Custom data". https://developer-docs.amazon/sp-api/reference/getorderitems

Templates are built in Seller Central, and an Excel bulk tool applies them across ASINs (forum posts: https://sellercentral.amazon.com/seller-forums/discussions/t/9995c0100b477446c929fd5091dec19d). Custom products must be seller-fulfilled, not FBA. https://sell.amazon.com/programs/handmade

**Orders.** Orders API v2026-01-01 replaces v0. `searchOrders` and `getOrder` take `includedData` (BUYER, RECIPIENT, FULFILLMENT and others), PII access is role-based with no Restricted Data Token, and customization moves to `orderItems[].product.customization.customizedUrl`. https://developer-docs.amazon/sp-api/docs/orders-api-migration-guide

`confirmShipment` (Orders v0) runs at 2 rps with a burst of 10. It supports several tracking IDs through `packageReferenceId`, and is unnecessary if the label is bought through Amazon. https://developer-docs.amazon/sp-api/docs/confirm-the-shipment-status, https://developer-docs.amazon/sp-api/reference/confirmshipment

**Handmade itself.** A Professional plan is required ($39.99 a month, "waived for approved Handmade sellers after the first month"). The referral fee is 15% or $0.30, whichever is greater. You submit an application about yourself, your products and your process. Products must be hand-altered, hand-designed, handcrafted, repurposed or upcycled. Each country needs its own account and maker profile. https://sell.amazon.com/programs/handmade

**Mentioning your own site.** "Any attempt to circumvent established Amazon sales processes or transfer Amazon users to another website or sales process is prohibited". That includes URLs in product description fields and in seller emails. Sellers also "may not create another listing for the exact same product", and may not manipulate search. https://globalselling.amazon.com/policy/prohibited-actions (the 2017 translation; the regional Seller Central text governs)

### Inference

- **No Etsy-style listing farm on Amazon.** The no-duplicates rule rules out copying Etsy's 539-listing pattern. Amazon gets one parent ASIN, varying by shape and background, with Amazon Custom collecting the text and the photo. That is in fact the site's own model.
- **Amazon Custom is one manual step.** It happens once per parent, so it costs little.
- **Image hosting.** R2 images behind a public custom domain should satisfy "publicly available" hosting.
- **Roles are the real gate.** Shipping your own orders needs the address, which needs a restricted role and its review. Weeks, not days.
- **Whether the frames qualify as Handmade is untested.** The Etsy `who_made` and production-partner answers on the live listings should be checked first. If a print partner makes part of the frame, Handmade approval is at risk.

---

## 3. Build or buy

### Verified (vendor pages where available, otherwise secondary)

- **Sellbrite.** The pricing page shows "Free to start" and a 14-day trial but no prices. Etsy and Amazon are listed integrations, and personalization is not mentioned. https://www.sellbrite.com/pricing/ Aggregators list Free (about 30 orders), $29, $79 and $179 a month by order volume. https://www.capterra.com/p/149384/Sellbrite/pricing/
- **Vela.** Etsy-first: Lite $19.95 and Plus $29.95 a month. It works with Etsy, eBay and Faire, and Amazon is not listed. https://apps.shopify.com/vela Reviewers report personalization price edits that do not sync. https://pt.trustpilot.com/review/app.getvela.com
- **Shopify Marketplace Connect.** The first 50 orders a month are free, then 1% capped at $99. The App Store lists Amazon, Walmart, eBay and Target Plus, and it requires a Shopify store. https://apps.shopify.com/marketplace-connect
- **Linnworks.** Quote only. Estimates run from about $200 to $449+ a month. https://erpresearch.com/erp-add-ons/marketplace/linnworks/pricing, https://www.getonecart.com/linnworks-alternatives/
- **Listing Mirror.** From $69–99 a month, centred on Amazon, Walmart and eBay. https://apps.shopify.com/listing-mirror, https://www.capterra.com/p/174621/Listing-Mirror/
- **Zentail.** From $750 a month single-channel and $1,000 multichannel. https://zentail.com/pricing
- **Rithum (ChannelAdvisor).** No public price. A competitor reports about $1,500 a month plus setup fees and a 12-month-or-longer contract. https://www.listingmirror.com/?p=6864
- **CedCommerce Etsy Integration.** From $9 a month, but only as a Shopify app. https://apps.shopify.com/etsy-marketplace-integration

### Inference and recommendation

- **These tools are the wrong fit.** Every one models SKU-to-listing as one-to-one, or one-to-few. None that I found documents mapping one configurable product to hundreds of differently titled Etsy listings, or writing Etsy's multi-question personalization. Etsy's beta note names Marketplace Connect among the blocked tools. Several of the cheap options need a Shopify store, and the owner has just decided to leave Shopify.
- **At this volume, buying solves the wrong problem.** Order volume is high on Etsy, low on the site and zero on Amazon. The tools sell inventory sync, which a made-to-order frame barely needs.
- **Recommendation: build a thin hub, scoped narrowly.** The Etsy API is small and well documented, the repo already has the manifest-loop machinery, and the work splits into small read-only and then write steps. If Amazon Handmade is approved and the owner wants it without engineering time, Sellbrite's free or $29 tier is the cheapest test of whether Amazon sells at all. It would hold one parent listing and nothing more. Revisit buying only if orders across channels outgrow one person shipping by hand.

---

## 4. How the hub would fit this repo

### Data model (inference)

```
Product          (git, site/src/content)  one configurable frame: shapes[], backgrounds[], personalisation Field[], base price, images
Preset           (git)  = a G2 search-intent page (clusters.json pageKey): shape, background, starter text, hero images
ChannelListing   (git, plans/channel-listings.json, or D1 if it must change at runtime)
  channel        etsy | amazon
  remoteId       etsy listing_id | amazon SKU/ASIN
  presetKey      many listings -> one preset (Etsy: ~539 -> 94)
  owns           which fields the hub may write, e.g. ["price","images","personalization","processing"]; NEVER title/tags/description by default
  channelCopy    title, tags, description as they stand on the channel (snapshot, for diff and backup)
  syncState      lastPulledAt, lastPushedAt, remoteHash, desiredHash, applied, error
Order            (D1)  one table; source = stripe | etsy | amazon; externalId unique; items[] with designId (site) or personalization answers (marketplaces); status
OrderEvent       (D1)  append-only: paid, shipped (tracking), delivered, canceled
```

The key rule is the `owns` list. A hub that only pushes fields it explicitly owns cannot overwrite the search-tuned copy on a 13.7k-review listing by accident.

### Loops (following CLAUDE.md §6)

- **E0, pull:** read every Etsy listing, its inventory and its personalization into `channelCopy`. This step is already half-built in `scripts/etsy-export-listings.mjs`, which needs OAuth for `listings_r` and inventory.
- **E1, plan:** diff the desired state (Product and Preset × `owns`) against `channelCopy`, and write a manifest of rows (`listingId`, field, before, after). A human reads it.
- **E2, apply:** one call per row, then read the listing back, then mark `applied: true`, append to `run-log.jsonl`, and halt at a 10% error rate. "Before" is already in the manifest, so it doubles as the backup and the undo.

Inventory and personalization writes replace the whole object on Etsy. The manifest must carry the full prior object, not a field diff. Every new write type starts with a dry run against one listing, preferably an inactive one.

### Tokens and secrets (inference, grounded in the docs)

Etsy refresh tokens expire in 90 days (https://developers.etsy.com/documentation/essentials/authentication). Worker secrets are set only through Wrangler or the dashboard and read from `env` (https://developers.cloudflare.com/workers/configuration/secrets/), so a rotating token cannot live there. The split:
- Static credentials go in Worker secrets: the Etsy keystring and shared secret, the webhook signing secret, the SP-API client ID and secret, and an encryption key.
- The current access and refresh tokens go in KV or D1, encrypted with that key.
- A Cron Trigger refreshes daily, which also keeps the app out of Etsy's 6-month dormancy.
- None of this goes in the repo, matching `.env.example`.
- The one-time OAuth consent runs through an `/admin/oauth/etsy` route behind Cloudflare Access.

### Order ingest (inference)

- **Etsy:** an `order.paid` webhook goes to `POST /api/webhooks/etsy`. Verify the signature, fetch `resource_url`, and upsert into `Order`, idempotent on receipt_id. A daily cron re-polls `getShopReceipts` to catch missed webhooks.
- **Stripe:** already writes `Order`.
- **Amazon:** a poll of `searchOrders` with `includedData`, a download of the customization ZIP, and an upsert.
- **Shipping:** one admin action per order calls `createReceiptShipment` or `confirmShipment`.
- **Etsy buyer data stays out of marketing.** No Resend or review-request email goes to Etsy buyers.

### Order of work (recommendation)

1. **Etsy OAuth plus read-only order sync** into the shared order queue: `transactions_r`, with webhook and poll. Lowest risk and most value, since all the sales are on Etsy. It also gives real per-listing sales for G2 (CLAUDE.md §7).
2. **Mark Etsy orders shipped from the hub** (`transactions_w`). It is a single call per order and reversible in effect.
3. **Read-only listing pull (E0)** plus the `ChannelListing` map tying 539 listings to 94 presets.
4. **Listing edits, owned fields only:** alt text first (84% of images have none, docs/08), then images, processing profiles and price parity, and personalization last. Never delete or recreate a listing.
5. **New Etsy listings from presets,** only when a preset has no listing. Each costs $0.20 to activate.
6. **Amazon:** a decision for the owner first (Handmade application and eligibility), then one parent listing. Set up Amazon Custom by hand, and ingest orders.

### Risks

- **Editing a reviewed listing.** Reviews are keyed to `listing_id` (`getReviewsByListing`, spec). An edit keeps the ID, and renewal keeps views, favourites and URL (renew article above). So edits should not lose reviews (inference). Delete-and-recreate would lose the listing's reviews, sales history and URL. That is why `listings_d` stays unrequested.
- **Ranking after edits.** Etsy search reads title, tags, attributes, description, first photo and reviews. Etsy advises giving changes time, downloading a CSV before bulk edits, and reverting if needed. https://www.etsy.com/seller-handbook/article/1399426136697 Whether an edit resets ranking is not documented. Treat any title, tag or first-photo change on a top listing as an experiment on one listing first.
- **Duplicate listings on Etsy.** The Seller Policy bans "duplicate shops" and actions "for the purpose of shilling, manipulating search or circumventing Etsy's policies". I found no official ban on near-duplicate listings within one shop, only forum opinion (https://www.etsy.com/legal/sellers via search; https://community.etsy.com/t5/Managing-Your-Shop/Are-you-allowed-to-have-duplicate-listing-but-slightly-different/td-p/138288148). The current 539-listing pattern predates the hub, but bulk-generating many more listings from presets could read as search manipulation (inference). On Amazon, duplicates are prohibited outright (above).
- **Fees on bulk relists.** $0.20 each, so relisting all 619 costs about $124 per cycle. The fee is cheap; the history lost by a recreate is not. Auto-renew of multi-quantity listings also charges per sale (above).
- **Rate limits.** About 600 listings at a few calls each is roughly 3,000 calls, trivial against a 100k QPD budget. The real throttles are Amazon's 5 rps listing writes and 2 rps `confirmShipment`.
- **Replace semantics.** A partial `updateListingInventory` deletes the variations it omits, and the personalization POST replaces every question (above). These are the "no undo" writes CLAUDE.md §3 warns about.
- **Changing terms.** Etsy changed its API Terms in Aug 2026 and may change the API "with or without notice" (§5, https://www.etsy.com/legal/api). The personalization beta may block third-party writes for a time (unconfirmed).
- **Combined surface.** Etsy can suspend the developer account "including related accounts" (§1, §6). Keep the hub's Etsy code path minimal and keep it out of any marketing flow. A suspension would cost the order sync, not the shop, but the shop is where the money is.
- **G5 is untouched.** Nothing here imports reviews.
