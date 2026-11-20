# Work-Tops – Shopify theme

A Shopify Online Store 2.0 theme for **Work-Tops**, a store selling made-to-measure stone worktops (quartz, granite, marble, limestone, porcelain and onyx). It's built on Dawn 16.2.0. All project code sits in `wt-` prefixed files, so Dawn's own files stay close to upstream.

- **Store:** `work-tops-jtqucjxj.myshopify.com`
- **Live theme:** `Dawn` (ID `194838102380`)
- **Main pages:** home `/`, collection `/collections/quartz-worktops`, product `/products/calacatta-white-quartz`, about `/pages/about`
- **Supporting pages:** quote `/pages/request-a-quote`, FAQ `/pages/faq`
- **Preview:** https://work-tops-jtqucjxj.myshopify.com (development store, so it's password-protected; the storefront password is shared with the submission)

The reasoning behind the main technical choices is in [DECISIONS.md](DECISIONS.md). Short written answers to the assessment questions are in [docs/written-answers.md](docs/written-answers.md).

## Getting started

Requires the [Shopify CLI](https://shopify.dev/docs/api/shopify-cli).

```bash
git clone https://github.com/vigneshkumars1916/work-tops.git
cd work-tops

shopify theme dev  --store work-tops-jtqucjxj                         # local preview with hot reload
shopify theme push --store work-tops-jtqucjxj --theme 194838102380   # deploy to the store theme
shopify theme check                                                   # lint (config in .theme-check.yml)
```

`config/settings_data.json` and the JSON templates are also edited through the theme editor. Run `shopify theme pull` before committing so editor changes aren't overwritten.

### One-off store setup

These live in the Shopify admin, not in the theme:

| Where | What |
| --- | --- |
| Settings → General → Store defaults | Store currency INR, currency formatting `₹{{amount}}` |
| Settings → General → Store address | Country set to India so the India market is the primary market |
| Search & Discovery → Filters | Add **Colour** (product metafield `custom.colour`), **Finish** (product metafield `custom.finish`) and **Thickness** (variant option). Keep Price and Availability. |
| Content → Metaobjects | `colour`, `finish`, `feature`, `testimonial` entries (already created) |
| Products | Shopify's sample products (snowboards, ski wax, gift card) are set to Draft so they don't show on the storefront |

## Project structure

```
assets/
  wt-base.css          design tokens, typography, buttons, header, footer, cards, forms
  wt-hero.css          homepage / about hero
  wt-home.css          homepage sections
  wt-collection.css/js collection page and filtering
  wt-product.css/js    product page, calculator, gallery, tabs, quote dialog
  wt-header.js         mega menu, mobile drawer, search dialog, wishlist
  wt-carousel.css/js   scroll-snap carousel used by the product, review and blog carousels
sections/
  wt-announcement      trust bar
  wt-header, wt-footer
  wt-hero, wt-materials, wt-custom-size, wt-collection-promo,
  wt-usp-bar, wt-product-carousel, wt-testimonial-stats,
  wt-blog-grid                                             (homepage)
  wt-collection-hero, wt-main-collection, wt-cta-split     (collection)
  wt-main-product, wt-complete-project                     (product)
  wt-image-text, wt-stats, wt-values, wt-cta-banner,
  wt-faq, wt-quote-section                                 (content pages)
snippets/
  wt-icon, wt-image, wt-price, wt-product-card, wt-section-head,
  wt-breadcrumbs, wt-seo, wt-meta, wt-product-jsonld, wt-quote-form,
  wt-review, wt-line-check, wt-line-mtm, wt-cart-guard
templates/
  index.json, collection.json, product.worktop.json, product.json,
  page.about.json, page.quote.json, page.faq.json
```

Dawn files changed by the project:

| File | Change |
| --- | --- |
| `layout/theme.liquid` | Loads `wt-base.css`, extra font weights, `wt-seo` (canonical/robots) and `wt-meta` (title/description). Removes `details-disclosure.js` / `details-modal.js` and loads `search-form.js` only on the search template. |
| `sections/cart-icon-bubble.liquid` | Markup matches the new header so the cart drawer can refresh the count |
| `snippets/cart-drawer.liquid`, `sections/main-cart-items.liquid`, `sections/main-cart-footer.liquid` | Made-to-measure line details and the checkout guard |
| `sections/main-list-collections.liquid` | Skips empty collections |
| `sections/header-group.json`, `sections/footer-group.json`, `config/settings_data.json` | Theme configuration |

## Content model

| Type | Fields | Used by |
| --- | --- | --- |
| Metaobject `colour` | name, hex, swatch image | product `custom.colour` (filter), `custom.colour_family` (card dots), filter swatches |
| Metaobject `finish` | name, description | product `custom.finish` (filter) |
| Metaobject `feature` | title, text, icon | feature bars, product property icons, About values, collection hero |
| Metaobject `testimonial` | quote, author, rating | homepage reviews slider (45 entries, labelled as sample reviews) |
| Product metafields `custom.*` | `made_to_measure`, `min/max_length_mm`, `min/max_width_mm`, `badge`, `tagline`, `price_suffix`, `key_features`, `properties`, `specifications`, `care`, `complementary`, `sample_product` | calculator, cards, tabs, cross-sells |
| Collection metafields `custom.*` | `hero_image`, `hero_features`, `seo_indexable_filters` | collection hero, SEO rules |
| Tags | `worktop`, `material:*`, `colour:*`, `finish:*`, `bestseller`, `accessory` | automated collection conditions |

Collections are automated. For example, *Quartz Worktops* includes products tagged `material:quartz`, and *Accessories* includes products tagged `accessory` with product type `Accessory`.

## Features

**Made-to-measure ordering** (`product.worktop.json`)
- Thickness × edge profile variants, plus length and width inputs. Limits come from product metafields, with section settings as the fallback.
- Live area, price per m² and total. Variant prices are per 0.01 m², and the cart quantity is the number of billable units, so Shopify works out the line price itself.
- Dimensions are saved as line item properties and show in the cart, at checkout and on the order.
- The cart re-checks every made-to-measure line in Liquid and disables checkout if the quantity doesn't match the dimensions. See [DECISIONS.md](DECISIONS.md#2-pricing-and-cart-integrity).
- A "Request a free quote" dialog, prefilled with the product, variant and size.

**Collection filtering**
- Native storefront filters, loaded through the Section Rendering API without a page reload.
- URL state, back/forward support, swatch filters, a dual-handle price slider, grid/list view and pagination.
- Canonical and `noindex` rules for filtered URLs (`snippets/wt-seo.liquid`).

**Content pages**
- About page sections are reusable on other pages.
- The FAQ accordion follows the WAI-ARIA accordion pattern and outputs `FAQPage` JSON-LD.

**Homepage**
- Hero carousel, material grid, custom-size promo, collection promo, USP bar.
- Product carousel ("Popular Worktops"), a reviews slider with 45 testimonial entries, and a blog carousel. All three use one small scroll-snap component (`wt-carousel`), with no carousel library.

**SEO**
- `wt-seo`: canonical and `robots` rules (see DECISIONS.md).
- `wt-meta`: the admin SEO title/description always win. Otherwise products get "<name> Worktops | Made to Measure" and a description built from the tagline and thickness options; an indexable single-filter collection URL gets its own title ("White Quartz Worktops") and description. Page numbers and tags are appended so titles stay unique.
- JSON-LD: `Product` (price per m², currency, availability, brand, images) and `BreadcrumbList` on products, `BreadcrumbList` on collections, `FAQPage` on the FAQ page. No `aggregateRating`.

**Header**
- Accessible mega menu (click, keyboard and hover), mobile drawer with focus trap, and search dialog.

## Price tampering: how it could be attempted and how it's limited

A customer could try to get a lower price by editing the page in the browser:

1. **Change the displayed price or total.** The page never sends a price. The cart line is `variant × quantity`, and Shopify reads the variant price from the catalogue.
2. **Lower the quantity** (for example with `/cart/change.js`) so fewer billable 0.01 m² units are charged for the same size. The cart re-calculates `ceil(L × W / 10,000)` in Liquid; the quantity no longer matches, the line is flagged and both checkout buttons (cart page and drawer) are disabled.
3. **Edit the length/width properties** to a larger size than paid for, or to sizes outside the slab limits. Same check: out-of-range, non-integer or mismatched sizes block checkout.
4. **Switch to a cheaper variant ID** (e.g. 20 mm instead of 30 mm). Thickness and edge are real variants, so the order records the variant the customer paid for. Nothing is hidden in a property.
5. **Post straight to `/checkout`**, skipping the theme. This is the gap a theme can't close. The fix is a Cart and Checkout Validation Function running the same rule on Shopify's servers (listed under "What I'd do next"). Until then, staff can spot it because every order shows the dimensions and quantity side by side.

## Front-end fixes (Task 4)

These components were written with the fixes built in, rather than committing a broken version first. The middle column describes the usual cause of each problem, which the new code avoids.

| Problem | Usual cause | Fix |
| --- | --- | --- |
| Mega menu overlaps content on mid-size screens and breaks on mobile | Hover-only `:hover` panels, absolutely positioned under a nav that wraps at mid widths; no touch or keyboard support | Top-level items with children are `<button aria-expanded aria-controls>`. Click/tap toggles, hover only on `(hover: hover) and (pointer: fine)`. Arrow keys, Escape (returns focus) and focus-out close. Below 1080 px the menu moves into a drawer with a focus trap, so it never overlaps the logo or icons. (`sections/wt-header.liquid`, `assets/wt-header.js`) |
| FAQ accordion with no keyboard support or ARIA | `div` click handlers with no roles, focus or state | Real `<button>` inside each heading, `aria-expanded`/`aria-controls`, panels with `role="region"` + `aria-labelledby` and the `hidden` attribute, Up/Down/Home/End between questions. Also outputs `FAQPage` JSON-LD. (`sections/wt-faq.liquid`) |
| Images cause layout shift and aren't responsive | `<img>` without dimensions, a single large source, lazy-loading on the LCP image | Every image goes through `snippets/wt-image.liquid`: `srcset` + realistic `sizes`, explicit `width`/`height` and an `aspect-ratio` box, `loading="lazy"` + `decoding="async"` below the fold, and `fetchpriority="high"` on the hero/first product image. |

## Performance (Task 3)

Changes made for Lighthouse:

1. Responsive images with `srcset`/`sizes` and fixed aspect ratios (`wt-image`).
2. Lazy-loading below the fold, eager + `fetchpriority="high"` for the LCP image.
3. Section-scoped CSS and deferred JS: collection, product and carousel assets only load where their sections are used.
4. Removed Dawn scripts the custom header doesn't use (`details-disclosure.js`, `details-modal.js`, `search-form.js` outside search) and turned off predictive search.
5. Only the font weights in use are loaded, with `font-display: swap`.
6. Carousels use CSS scroll-snap with a 1.8 KB custom element instead of a slider library.
7. One `<h1>` per template (hero, collection title, product title, page heading) with `h2` section headings and `h3` cards.

Lighthouse reports (mobile) for the homepage and the Quartz collection go in `docs/lighthouse/`. Because development stores are always password-protected, PageSpeed Insights can't reach the storefront. Run Lighthouse from Chrome DevTools after entering the storefront password, with **"Clear storage" unticked** so the password cookie is kept.

## Images

Product, collection, section and article images are Unsplash photos used under the [Unsplash License](https://unsplash.com/license). They're stored in Shopify Files and referenced from section settings (`shopify://shop_images/…`), product media, collection images and article images, so they can be swapped without code changes.

## Testing checklist

- Calculator: valid size, below minimum, above maximum, decimals, empty fields, variant switching.
- Cart: a valid line checks out; edit the quantity or properties via `/cart/change.js` and the line is flagged and checkout disabled.
- Filters: combine filters, sort, paginate, use back/forward, reload a filtered URL, check `<link rel="canonical">` and `robots`.
- Keyboard only: mega menu, drawer, filters, tabs, FAQ, quote dialog.
- Lighthouse (mobile) on `/` and `/collections/quartz-worktops`.
- JSON-LD: paste the page source into Google's Rich Results Test (code mode), since the password page blocks URL mode.

## Trade-offs and what I'd do with more time

The main trade-offs (per-0.01 m² variant pricing, Liquid-only cart validation, metaobjects over tags) are explained in [DECISIONS.md](DECISIONS.md). With more time I'd add a Checkout Validation Function, Playwright tests for the calculator, cart guard and filter URL state, Lighthouse CI with a budget, and real reviews before any `aggregateRating`.
