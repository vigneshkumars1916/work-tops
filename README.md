# Work-Tops – Shopify theme

A Shopify Online Store 2.0 theme for **Work-Tops**, a store selling made-to-measure stone worktops (quartz, granite, marble, limestone, porcelain and onyx). It's built on Dawn 16.2.0. All project code sits in `wt-` prefixed files, so Dawn's own files stay close to upstream.

- **Store:** `work-tops-jtqucjxj.myshopify.com`
- **Live theme:** `Dawn` (ID `194838102380`)
- **Main pages:** home `/`, collection `/collections/quartz-worktops`, product `/products/calacatta-white-quartz`, about `/pages/about`
- **Supporting pages:** quote `/pages/request-a-quote`, FAQ `/pages/faq`

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
| Settings → General → Store defaults | Store currency (INR) |
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
sections/
  wt-announcement      trust bar
  wt-header, wt-footer
  wt-hero, wt-materials, wt-custom-size, wt-collection-promo,
  wt-usp-bar, wt-testimonial-stats, wt-blog-grid          (homepage)
  wt-collection-hero, wt-main-collection, wt-cta-split     (collection)
  wt-main-product, wt-complete-project                     (product)
  wt-image-text, wt-stats, wt-values, wt-cta-banner,
  wt-faq, wt-quote-section                                 (content pages)
snippets/
  wt-icon, wt-image, wt-price, wt-product-card, wt-section-head,
  wt-breadcrumbs, wt-seo, wt-product-jsonld, wt-quote-form,
  wt-line-check, wt-line-mtm, wt-cart-guard
templates/
  index.json, collection.json, product.worktop.json, product.json,
  page.about.json, page.quote.json, page.faq.json
```

Dawn files changed by the project:

| File | Change |
| --- | --- |
| `layout/theme.liquid` | Loads `wt-base.css`, extra font weights and `wt-seo`. Removes `details-disclosure.js` / `details-modal.js` and loads `search-form.js` only on the search template. |
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
| Metaobject `testimonial` | quote, author, rating | homepage testimonial |
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

**Header**
- Accessible mega menu (click, keyboard and hover), mobile drawer with focus trap, and search dialog.

## Images

Product, collection, section and article images are Unsplash photos used under the [Unsplash License](https://unsplash.com/license). They're stored in Shopify Files and referenced from section settings (`shopify://shop_images/…`), product media, collection images and article images, so they can be swapped without code changes.

## Testing checklist

- Calculator: valid size, below minimum, above maximum, decimals, empty fields, variant switching.
- Cart: a valid line checks out; edit the quantity or properties via `/cart/change.js` and the line is flagged and checkout disabled.
- Filters: combine filters, sort, paginate, use back/forward, reload a filtered URL, check `<link rel="canonical">` and `robots`.
- Keyboard only: mega menu, drawer, filters, tabs, FAQ, quote dialog.
- Lighthouse (mobile) on `/` and `/collections/quartz-worktops`.
