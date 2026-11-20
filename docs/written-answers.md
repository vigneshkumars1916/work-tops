# Written answers

**1. Metaobjects vs metafields vs tags in this store**
*Metaobjects* hold reusable, structured entities that many products point to: Colour (name, hex, swatch), Finish, Feature/USP, Testimonial. Edit once, update everywhere, and they power native filters with swatches. *Metafields* hold data that belongs to one product or collection: size limits, made-to-measure flag, specs, care text, badge, tagline, cross-sells, collection hero image and SEO rules. *Tags* are for lightweight grouping and automation: automated collection rules (`material:quartz`), merchandising flags (`bestseller`), admin search and Flow triggers. They are never the source of truth for customer-facing data.

**2. Migrating to a new theme safely**
Before: inventory every template, section, app block, metafield used by Liquid, and the JSON-LD/meta tags. Crawl the live site (Screaming Frog) to export URLs, titles, meta descriptions, canonicals, H1s and structured data. Build on an **unpublished theme** (staging) and connect it to a Git branch. Check the following on the preview: URL parity (Shopify URLs don't change with the theme, but custom page templates, `?view=` templates and anchor links can), 301 redirects in *Navigation → URL redirects* for any renamed pages or collections, metadata parity (titles, descriptions, canonicals, robots, hreflang), structured data in the Rich Results Test, analytics/pixels and consent, apps' theme extensions, checkout and cart behaviour, Lighthouse and Core Web Vitals. Publish in a low-traffic window, then re-crawl and compare the two crawls. Watch Search Console coverage and 404s. **Rollback:** the old theme stays in the library, so re-publishing it is one click and instant. Theme settings live in the theme, so nothing is lost. Keep the old theme untouched for a few weeks.

**3. "Checkout price differs from the product page"**
Reproduce with the exact product, variant, quantity, dimensions, country/market, currency and discount code. Then check, in order:
(a) The page showed a theme-calculated number (e.g. JS total, per-m² conversion, rounding: ceil to 0.01 m²) and the cart uses variant price × quantity. Compare `/cart.js` to the UI.
(b) Market or currency conversion and rounding rules, or tax-inclusive vs exclusive display.
(c) Automatic discounts or scripts/Functions, B2B price lists or catalogs.
(d) Shipping or duties being read as the "price".
(e) A stale cached page or variant (price changed after load), or the wrong variant ID from a broken variant picker.
(f) Line item properties not matching the quantity (our cart guard flags this).
Fix the root cause, then add a test for that case.

**4. Re-runnable bulk import of 200+ products**
Use a stable external key (SKU or handle) and an idempotent upsert: Admin GraphQL `productSet` (declarative options, variants and metafields) run through `bulkOperationRunMutation` with a JSONL file. Metaobject entries are upserted by handle (`metaobjectUpsert`). Images go through `stagedUploadsCreate`/`fileCreate` once, then products reference the file IDs, so re-runs don't duplicate media. Process in stages (metaobjects → files → products → collections/publishing) and log per-row results. Do a dry run on a dev store first. **What can go wrong:** handle collisions (a "-1" suffix creates duplicates), variant option mismatches wiping variants (productSet replaces the variant list), duplicate images on every run, metafield type or validation errors (e.g. a list with duplicate references), API rate limits/throttling, partial failures leaving half-updated products, products created but not published to the Online Store, inventory accidentally reset, and smart collections not updating until tags are right.
