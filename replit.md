# متجر الأفق المتجدد (Horizon Store)

A modern Arabic/RTL Libyan electronics e-commerce storefront built on the Replit pnpm monorepo.

## Artifacts
- `artifacts/api-server` — Express + Drizzle backend mounted at `/api`.
- `artifacts/horizon-store` — React + Vite RTL storefront mounted at `/`.
- `artifacts/mockup-sandbox` — design preview server (default).

## Domain
Sells: laptops (used / new / desktop / AIO / gaming / POS), surveillance (DAHUA, IMOU), networking (TP-LINK, CUDY), printers (HP/EPSON/CANON), TVs / inverters / batteries (LIGHTWAVE), accessories.
Theme: soft sunset orange (`--primary`) + white + black, Cairo font, RTL layout.

## Auth
- Phone + password registration with: full name, phone, region, age, gender.
- Session token returned at `/auth/login` and `/auth/register`, stored in `localStorage["horizonStoreToken"]` and sent as `Authorization: Bearer …` (also accepted via `x-session-token`).
- Roles: `customer` and `admin`.
- Seeded admin: phone `0911234567`, password `admin1234`.

## Backend
- `lib/db` — Drizzle schemas: users (+ avatarUrl, walletBalance), sessions, categories, subcategories, products (+ image2, image3, colorsEnabled), productColorsTable, cart_items, favorites, orders (+ deliveryFee), order_items (+ selectedColor), deliveryRegionsTable, productRatingsTable, aboutPageTable.
- `lib/api-spec` — OpenAPI spec; `pnpm --filter @workspace/api-spec run codegen` regenerates clients.
- `lib/api-client-react` — Orval React Query hooks (mutator at `lib/api-client-react/src/custom-fetch.ts` injects Bearer token).
- `lib/api-zod` — Zod schemas; backend validates inputs/outputs against them.
- Routes in `artifacts/api-server/src/routes/`: `auth`, `catalog`, `catalog-extras`, `cart`, `favorites`, `orders`, `admin`, `storage`.
- Order status flow: `pending → preparing → prepared → delivered_to_courier → payment_received`.
  - `payment_received` triggers wallet credit to customer (`walletBalance += order.total + deliveryFee`).
  - Customer sees "تم التسليم" for `payment_received` status.

## Frontend (React + Vite + wouter v3 + shadcn-ui)
- Pages: Home, Category, Subcategory, Product, Cart, Checkout, Orders, Order detail, Favorites, Profile, Login, Register, Admin, About.
- Mobile-first with bottom tab bar (Home, Orders, Cart, About, Profile); sticky header on desktop.
- Header: category dropdown with sub-nav, search button.
- Footer: About link + social media (Facebook/Instagram/TikTok) with hover expand labels.
- Product cards: smaller, heart button below image (not overlapping), star rating display.
- Product page: 3-image gallery with thumbnail row, color picker (if colorsEnabled), 5-star rating widget.
- Checkout: dynamic delivery fee by city from admin-configured delivery regions.
- Profile: editable name, region, password; wallet balance display.
- About page: shows admin-configured content (JSON: description, managerName, branches, foundedYear).
- Admin:
  - Orders tab: status dropdown (including payment_received), print button per order.
  - Products tab: CRUD with 3-image upload, colors toggle + color management.
  - Delivery tab: manage city delivery prices.
  - About tab: edit the "من نحن" page via JSON editor.

## Timers & UX
- Home featured product rotator: cycles every 10s (was 5s).
- No marquee strip.

## Seed
`scripts/src/seed.ts` (run with `cd scripts && npx tsx src/seed.ts`) wipes the catalog and reseeds all categories, subcategories, and 4–6 products per subcategory. It also creates the admin user if missing.

Delivery regions are seeded with 13 Libyan cities via direct SQL (see session setup).

## Dev tips
- Always run `pnpm run typecheck:libs` after editing lib code to refresh build artifacts that downstream packages rely on.
- The shared proxy lives at `localhost:80` — use `/api/...` paths.
- Restart workflows via the workflow tools rather than running `pnpm dev` at the root.
- In wouter v3, use `<Link href="..." className="...">text</Link>` — never wrap `<a>` inside `<Link>`.
