# Search engines (SEO)

How alcomconsultants.co.ke is set up to appear in Google for property and real estate searches in Kenya.

## What the site gives search engines

| What | Where |
|---|---|
| `robots.txt` | Production allows everything except `/api/`, `/dashboard/` and `/account/`, and points to the sitemap. Any other `SITE_ENV` blocks everything. |
| `sitemap.xml` | Built on each request: main pages, services, location pages, listings, blog articles and open jobs. Demo data is left out. |
| Location landing pages | `/property-for-sale/<place>`, `/property-for-rent/<place>`, `/commercial-property-to-let/<place>` for every county and area with active listings, e.g. *Property for rent in Kilimani, Nairobi*. Each has its own title, description, listings, nearby areas and structured data. |
| Structured data (schema.org) | Home: `RealEstateAgent` (company, address, hours, services) and `WebSite` (site search box). Listings: `RealEstateListing`. Articles: `BlogPosting`. Jobs: `JobPosting`. FAQs: `FAQPage`. Breadcrumbs on every inner page. Location pages: `ItemList`. |
| Titles and descriptions | Unique per page. The home title leads with "Property for Sale & Rent in Kenya". |
| Canonical URLs | On every page, so filter and tracking variations don't compete with each other. |
| Share images | A default branded image (`/opengraph-image`). Listings and articles use their own photo. |
| Internal links | "Browse by location" on the home and search pages. Property breadcrumbs link to their location page. |

**Demo data** (`seed_demo_listings`) is marked `noindex` and kept out of the sitemap. A location page is only indexed once it has at least one real listing. Remove the demo data before the full launch (Phase 6 checklist).

## Going live (indexing on)

Indexing is controlled by the GitHub repository variable `SITE_ENV`, which is built into the frontend image:

```bash
gh variable set SITE_ENV --body production   # staging blocks all crawling
```

Then rebuild (any push to `main`, or re-run the latest CI run on `main`). Check that https://alcomconsultants.co.ke/robots.txt shows `Allow: /` and a `Sitemap:` line.

## Google Search Console (owner)

1. **Sitemaps** → add `sitemap.xml` → Submit.
2. **URL inspection** → paste `https://alcomconsultants.co.ke/` → *Request indexing*. Do the same for a few important pages: `/properties`, the service pages and the busiest location pages.
3. Over the following days, check **Pages** (indexed / not indexed and why) and **Enhancements** (breadcrumbs, FAQ, job postings).
4. Test any page's structured data at https://search.google.com/test/rich-results.

New sites usually appear within days to a few weeks. Ranking for competitive searches ("houses for sale in Nairobi") takes months and grows with the number of real listings and articles.

## What helps rankings over time

- **Real listings with good descriptions and photos.** Each listing is a page Google can rank, and each one strengthens its location page.
- **Regular articles** answering what buyers, landlords and investors search for (the blog is set up for this).
- **A Google Business Profile** for the Westlands office, with the same name, phone and address as the website. This matters most for map and "near me" searches.
- **Links from other sites:** directories, partners, the Institution of Surveyors of Kenya and the Estate Agents Registration Board listings, and press.
