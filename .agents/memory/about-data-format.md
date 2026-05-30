---
name: About page data format and store settings
description: How aboutPageTable stores and merges data; where store settings live; helpers to use
---

## Rule
Always use `loadAboutData()` and `saveAboutMerge(patch, headers)` when reading or writing to `/api/about` / `/api/admin/about`.

**Why:** The server route does `const content = JSON.stringify(req.body)` which wraps the entire body. Old data was double-encoded (`{ content: '{"description":"..."}' }`). New saves are flat objects. `loadAboutData()` handles both formats transparently; `saveAboutMerge()` reads current data, merges the patch, and saves the flat merged object — so each tab (AboutTab, StoreSettingsTab) preserves the other tab's fields.

**How to apply:**
- Any new admin tab that touches aboutPageTable must call `saveAboutMerge(myFields, headers)` instead of posting directly.
- `loadAboutData()` returns a plain `Record<string,unknown>` — cast fields with `as string`.
- Both helpers are defined in `artifacts/horizon-store/src/pages/admin.tsx` and should be extracted to a shared util if they're needed elsewhere.

## Store settings fields (all in aboutPageTable JSON)
- `storeName` — displayed in hero banner
- `storeSubtitle` — tagline under store name  
- `heroImageUrl` — background of hero section on home page
- `primaryColor` — hex color, applied to `--primary` and `--ring` CSS variables at app boot (App.tsx StoreThemeProvider) and on admin save
- `logoUrl` — shown in hero if set, otherwise badge label shown
- `faviconUrl` — applied to `<link rel="icon">` at app boot
- `whatsapp1`, `whatsapp2` — WhatsApp numbers

## Category images
- `categoriesTable` has `imageUrl` column (added via migration)
- If category has `imageUrl`, home page shows magazine-style image card with overlay text
- If no imageUrl, shows emoji/icon gradient card
- Admin CRUD via generated hooks: `useAdminListCategories`, `useAdminCreateCategory`, `useAdminUpdateCategory`, `useAdminDeleteCategory`, `getAdminListCategoriesQueryKey`
