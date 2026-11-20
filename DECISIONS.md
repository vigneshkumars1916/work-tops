# Technical decisions

These notes record the main choices made while building the Work-Tops theme, why I made them, and what I'd change with more time.

## 1. Base theme and code organisation

**Dawn 16.2.0 rather than Horizon or a theme from scratch.** Dawn already provides a solid cart drawer, cart page, search, customer templates and accessibility baseline. The project needed custom sections more than a new architecture, and Dawn's section/block model is all those sections required.

**Everything custom is prefixed `wt-`.** New sections, snippets and assets never collide with Dawn files. Changes to Dawn's own files are kept to a short, documented list (see the README), so a future Dawn upgrade is a manageable merge.

**Merchant-editable by default.** Copy, images, links, product/collection pickers and spacing are section or block settings. Repeated content (features, testimonials) uses metaobject pickers so it's edited once.

**CSS and JS per area.** `wt-base.css` holds the design tokens and shared components. Each page area loads only its own stylesheet and deferred script (`wt-collection.js` only on collections, `wt-product.js` only on products).

## 2. Pricing and cart integrity

The core requirement was a price based on a customer-entered size, without trusting anything the browser sends.

**Decision: price per billable unit, with quantity as the unit count.**

- Each variant (thickness × edge) is priced per **0.01 m²**. ₹369.00 per unit = ₹36,900 per m².
- `units = ceil(length_mm × width_mm / 10,000)`. 2400 × 600 mm → 144 units → 1.44 m².
- The line is added with `quantity = units`, so Shopify computes `price × quantity` from its own catalogue. No price value is ever sent from the page.
- Thickness and edge are variant options, not properties, so the variant (and its price) is the source of truth.

**Cart guard (`wt-line-check`).** In Liquid, for every made-to-measure line:

1. Length and width properties exist and are whole millimetres.
2. They're within the product's min/max (metafields, fallback 300–3200 × 300–1600 mm).
3. The quantity is a whole multiple of `ceil(L × W / 10,000)` (multiples allow identical pieces to merge into one line).

If any line fails, it shows an error, and the checkout button and dynamic checkout buttons are disabled in both the cart page and the drawer.

| Tampering attempt | Outcome |
| --- | --- |
| Edit a displayed price or total | No effect, prices aren't submitted |
| Lower the quantity | Doesn't match the dimensions, so checkout is blocked |
| Inflate length/width but keep the quantity | Doesn't match, so checkout is blocked |
| Out-of-range or decimal sizes | Blocked with a specific message |

**Known limitation.** The theme can only block the theme's checkout buttons. A request made directly to `/checkout` bypasses Liquid. The proper fix is a **Cart and Checkout Validation Function** running the same rule on Shopify's servers. A Flow rule that tags mismatched orders for review would be a cheap safety net.

**Trade-off.** Variant prices look unusual in the admin (₹369.00). A Cart Transform or Function-based price would allow a true per-m² price, at the cost of an app.

**Considered and rejected:**
- **Size-band variants** (e.g. 1.0–1.5 m²): simpler, but customers pay for area they don't get, and Shopify's 2048-variant cap makes fine bands impractical.
- **A price in a line item property:** trivially editable.

## 3. Colour and finish: metaobjects over tags

Colour and finish are **metaobject references** (`custom.colour`, `custom.finish`).

- They're validated: a product can only reference an existing entry, so typos don't create new filter values.
- They carry display data: the hex code (and an optional swatch image) drives the filter swatches and the card dots.
- They're renamed once and every product follows. They're also translatable.
- Shopify's native filters group by the referenced entry.

Tags remain where they're strongest: automated collection conditions (`material:quartz`) and merchandising flags (`bestseller`).

## 4. Collection filtering

- **Native Storefront filtering** (`collection.filters`) rather than looping over tags in Liquid, so filtering stays fast with large catalogues and counts are accurate.
- **Section Rendering API:** the filter form serialises to URL parameters and fetches `?section_id=…`. Only the facets and results are swapped. Responses are cached per URL, stale requests are aborted, the URL is updated with `pushState`, and `popstate` re-renders, so back/forward and shared links work.
- **Price slider per m².** A "display multiplier" section setting (100) converts the stored per-unit prices to per-m² values in the UI and back when building the filter parameters.
- **Progressive enhancement:** without JavaScript the form still submits as a normal GET request.

**SEO for filtered URLs (`snippets/wt-seo.liquid`):**

| URL | Robots | Canonical |
| --- | --- | --- |
| Collection, no filters | index | self (`?page=n` kept for page 2+) |
| Exactly one value of an allowed filter (collection metafield `seo_indexable_filters`), page 1, default sort | index | self, e.g. "white quartz worktops" |
| Two or more filters, price/availability, non-default sort, tag URLs | noindex, follow | clean collection URL |
| Search, cart | noindex, follow | — |

This lets a few high-intent landing pages rank without letting thousands of filter combinations dilute the collection.

## 5. Performance

- Every image goes through `wt-image`: `srcset` + realistic `sizes`, explicit `width/height` and `aspect-ratio` boxes (no layout shift).
- The LCP image (hero or first product image) is `loading=eager fetchpriority=high`. Everything else is lazy-loaded with `decoding=async`.
- Section-scoped CSS and deferred JS, and no third-party libraries.
- Dawn scripts the new header doesn't need are no longer loaded on every page. Predictive search is off.
- Fonts use `font-display: swap`. Only the weights in use are loaded (Playfair Display 400/500, DM Sans 400/500/600/700).

## 6. Accessibility

- **Mega menu:** top-level items with children are `<button aria-expanded aria-controls>`. Click and tap toggle; hover only opens on `(hover: hover) and (pointer: fine)`. ArrowDown moves into the panel, Left/Right move between items, Escape closes and returns focus, and focus leaving an item closes it. Below 1080 px the menu becomes a drawer with a focus trap, so it never overlaps the logo or icons at mid widths.
- **FAQ accordion:** buttons inside headings, `aria-expanded`/`aria-controls`, panels with `role=region` + `aria-labelledby`, Up/Down/Home/End navigation, and panels hidden with the `hidden` attribute.
- **Product tabs:** WAI-ARIA tabs pattern with roving `tabindex` and arrow-key navigation.
- **Forms:** visible labels, `aria-describedby` hints and errors, `aria-invalid`, and live regions for the price summary and filter result count.

## 7. Structured data

- `Product` with images, brand, SKU, and one `Offer` per variant (price, currency, availability). For made-to-measure products each offer includes a `UnitPriceSpecification` per m².
- `BreadcrumbList` on product and collection pages, `FAQPage` on the FAQ page.
- No `aggregateRating` is output. Ratings will only be added once real review data is available (there's an `include_rating` switch in `wt-product-jsonld`).

## 8. Quote form

One snippet (`wt-quote-form`) is used both in the product dialog and on the quote page. It posts to Shopify's contact form, so requests arrive in the store's inbox with the product, variant and dimensions included. Spam protection is a hidden honeypot field plus a minimum fill time on the client, and Shopify's own hCaptcha on the server.

## 9. Content and images

Product, collection, section and article images are Unsplash photos (Unsplash License: free commercial use, no attribution required). They're imported into Shopify Files, so they're served from Shopify's CDN in modern formats and referenced through theme settings rather than hard-coded URLs.

Shopify's sample products were set to Draft so only Work-Tops products appear on the storefront.

## 10. What I'd do next

1. A Checkout Validation Function for made-to-measure lines.
2. Playwright tests for the calculator, cart guard and filter URL state.
3. Lighthouse CI with a performance budget on the homepage and collection page.
4. Wishlist synced to a customer metafield (currently per browser in `localStorage`).
5. Real reviews, then `aggregateRating` in JSON-LD.
