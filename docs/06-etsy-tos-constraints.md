# 06 — Etsy API Terms: what is and is not permitted

**Read this before writing any code that touches Etsy data.** The review migration
designed in `04` is blocked on an open question with Etsy (gate G5). This document records
why, so nobody re-opens it from scratch or quietly works around it.

Source: Etsy API Terms of Use, read in full 2026-08.

## Clauses that bear on the review plan

> **You shall not:** Cache or store any Content or Etsy Member Content other than for
> reasonable periods in order to provide the service to Etsy Members.

> **You shall not:** Display item Content or product information and/or images which is
> more than six (6) hours older than such information is on the Website, and other Etsy
> Content cannot be more than twenty-four (24) hours older than such Content on the Website.

Permanently storing reviews in Shopify metaobjects and displaying them indefinitely runs
against both. **Reviews are Member Content** — written by buyers, owned by them, not by
the seller. Etsy's own introduction is explicit that member-generated content belongs to
members.

> **Prohibited unreasonable commercial use:** Using the API primarily to drive traffic to
> other non-Etsy websites or services.

Arguably a description of the plan's purpose.

> **You shall not:** Upload, post, collect, store, share, transfer, or process personal
> information or data about Etsy Members unless specifically authorized by such member.

Bears on reviewer names and identifiers.

> **You shall:** Link directly back to the product information and/or image Content on
> Etsy, where the Application utilizes product information and/or images.

Pulls in the opposite direction from finding 03 (removing Etsy links from the storefront).
Note these are different things — removing Etsy links from your *own* Shopify product
descriptions is unrelated to the attribution duty an *Application using Etsy content* owes.

There is also a mandatory notice for any application using the API:

> "The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is
> not endorsed or certified by Etsy, Inc."

## Scraping is prohibited by name

> **Section 9.** 'Screen scrape' pages on the Etsy Website, **even if such data is not
> available in the Etsy API.**

That final clause is written for exactly our situation: the API withholds reviewer display
names, and scraping the public shop page for them anyway is explicitly forbidden.

**Option C in `04` is off the table.** Not "risky" — prohibited. Ship option A.

## Volume is not the mitigation

A recurring temptation is to keep request volume low "so it does not count as a violation."
Volume determines how likely anyone is to notice and how much harm results; it does not
determine whether an act breaches the terms. Ten pages and ten thousand are the same
category of act.

What actually lowers risk is the **shape** of the design: the API is the system of record,
the out-of-API surface is one optional field, and the pipeline is built so that field can
be switched off without breaking anything.

## Registration

Etsy requires truthfulness at registration:

> **You shall:** Be truthful and honest about the Application to Etsy and Your users.

Approval is permission to **use the API** — not permission for any particular downstream
use of the data. An app approved under a vague description that then caches Member Content
indefinitely is in breach exactly as much as one that said so upfront, and revocation
after you have built on it is the bad outcome.

The registered Seller App describes the clearly-permitted scope: reading own orders,
listings and reviews for internal monitoring, plus listing and inventory writes for the
seller's own shop. **Calling `getReviewsByShop` is fine** — reading your own reviews to
monitor product feedback is squarely a Seller App use. It is the *permanent republishing
on butterlu.com* that is contested.

## The open question (G5)

The Terms name the route twice: contact `developer@etsy.com`. **This email has been drafted but NOT confirmed sent** — verify before assuming an answer is pending. Draft:

> I'm the owner of the ButterLu shop. I'd like to display my own shop's reviews on my
> separate Shopify storefront, sourced via `getReviewsByShop`. I understand section 1
> limits caching of Member Content and section 4 addresses driving traffic off-platform.
> Is this a permitted use, and if so under what conditions on attribution, refresh
> frequency and reviewer data?

**Until Etsy answers, do not build Waves 2 or 3.**

Worth knowing: Judge.me and Loox both ship Etsy review importers. Either Etsy permits this
under conditions, or those apps route around the API entirely (seller-supplied CSV). Etsy's
answer tells you which.

## What is unaffected

- **Everything in Waves 0 and 1.** The entire store-findings track touches no Etsy data.
- **The Seller App itself** — order, listing and inventory management for the shop.
- **Native Shopify reviews.** Collecting fresh reviews post-checkout is yours outright,
  carries genuine verified-purchase status, and was always the durable half of the design.
  The Etsy import was an opening balance; this may simply mean the balance starts at zero.

## Not legal advice

This is a careful reading of a public document by a non-lawyer. Terms containing
"reasonable periods" and "the spirit of Etsy" are subjective by construction, and Etsy is
the sole arbiter. If the review migration is commercially important, get Etsy's answer in
writing before building.
