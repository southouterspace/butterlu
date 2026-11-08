# Rank tracking

How agents measure where butterlu.com stands on Google and iterate on it. The plan this
serves is `docs/12-serp-leadership.md`; the technical shape is `docs/09-seo-shape.md`.

| File | What |
| --- | --- |
| `queries.json` | The tracked searches: query, cluster, the page meant to rank, priority 1 to 3. |
| `snapshots/YYYY-MM-DD.json` | One snapshot: the top 10 for every tracked search on that day. |
| `../../scripts/serp-report.mjs` | Compares the latest snapshot with the one before it. |

## The loop

1. **Snapshot** (an agent, weekly, and the day after any page or copy change ships to
   production). For every row in `queries.json`, run a Firecrawl search with location
   "United States" and limit 10, and write `snapshots/<today>.json` in the shape below.
   Never open or scrape etsy.com pages; classify Etsy results from the search result alone.
   Normal proxy only: a blocked page stays blocked, never retried with stealth or enhanced proxies.
2. **Report**: `node scripts/serp-report.mjs` (add `--json` for agents). It prints
   butterlu.com's position per search, the priority-weighted share of searches where it
   is top 3 and top 10, the leaders, and domains new to the top 3.
3. **Act**: pick the lowest-ranked priority 1 searches whose page exists, change one
   thing per page (title, intro copy, FAQ, internal links, reviews shown) and push it to
   `main` (stage). Google only sees it once the owner publishes a Release; snapshot the
   day after that and log the change and release date in `docs/12-serp-leadership.md` §7.
4. **Confirm with real data** once Search Console is set up: its impressions, average
   position and clicks per query are the ground truth. A crawler's results are a
   proxy; trust the page-type mix more than exact positions.

## Snapshot shape

```json
{
  "fetchedAt": "2026-11-08T15:00:00Z",
  "source": "firecrawl_search, location United States",
  "rows": [
    {
      "query": "grandma picture frame",
      "cluster": "grandma",
      "target": "/collections/grandparent-frames",
      "priority": 1,
      "results": [
        {
          "pos": 1,
          "url": "https://…",
          "domain": "example.com",
          "title": "…",
          "snippet": "…",
          "pageType": "marketplace-category | marketplace-listing | brand-category | brand-product | dtc-category | dtc-product | editorial-listicle | blog-article | social | other",
          "ownerType": "marketplace | national-brand | dtc-small | media | social | other",
          "signals": { "price": null, "rating": null, "reviewCount": null, "shipping": null },
          "isButterlu": false
        }
      ],
      "butterluPositions": [],
      "verdict": { "leaders": "…", "beatability": 3, "why": "…", "intent": "…" }
    }
  ]
}
```

`isButterlu` is true for butterlu.com, for etsy.com/shop/ButterLu, and for an Etsy listing
whose id is in `plans/etsy-listings.json`.
