import { Router, type IRouter } from "express";
import { db, categoriesTable, subcategoriesTable, productsTable, productColorsTable, productRatingsTable } from "@workspace/db";
import { eq, asc, desc, sql, ilike, or } from "drizzle-orm";
import { toCategory, toSubcategory, toProduct, type ProductWithJoin } from "../lib/serializers";

const router: IRouter = Router();

async function loadAllProductsWithJoin(): Promise<ProductWithJoin[]> {
  const rows = await db
    .select({
      product: productsTable,
      subcategory: subcategoriesTable,
      category: categoriesTable,
    })
    .from(productsTable)
    .innerJoin(subcategoriesTable, eq(subcategoriesTable.id, productsTable.subcategoryId))
    .innerJoin(categoriesTable, eq(categoriesTable.id, subcategoriesTable.categoryId));
  return rows.map((r) => ({
    ...r.product,
    subcategorySlug: r.subcategory.slug,
    subcategoryName: r.subcategory.name,
    categorySlug: r.category.slug,
    categoryName: r.category.name,
  }));
}

router.get("/categories", async (_req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));
  const subs = await db.select().from(subcategoriesTable).orderBy(asc(subcategoriesTable.sortOrder), asc(subcategoriesTable.id));
  const counts = await db
    .select({ subcategoryId: productsTable.subcategoryId, c: sql<number>`cast(count(*) as int)` })
    .from(productsTable)
    .groupBy(productsTable.subcategoryId);
  const countMap = new Map(counts.map((r) => [r.subcategoryId, Number(r.c)]));
  const result = cats.map((c) => ({
    ...toCategory(c),
    subcategories: subs
      .filter((s) => s.categoryId === c.id)
      .map((s) => ({ ...toSubcategory(s), productCount: countMap.get(s.id) ?? 0 })),
  }));
  res.json(result);
});

router.get("/categories/:slug", async (req, res) => {
  const cat = await db.query.categoriesTable.findFirst({ where: eq(categoriesTable.slug, req.params.slug) });
  if (!cat) {
    res.status(404).json({ message: "Category not found" });
    return;
  }
  const subs = await db
    .select()
    .from(subcategoriesTable)
    .where(eq(subcategoriesTable.categoryId, cat.id))
    .orderBy(asc(subcategoriesTable.sortOrder), asc(subcategoriesTable.id));
  const counts = await db
    .select({ subcategoryId: productsTable.subcategoryId, c: sql<number>`cast(count(*) as int)` })
    .from(productsTable)
    .groupBy(productsTable.subcategoryId);
  const countMap = new Map(counts.map((r) => [r.subcategoryId, Number(r.c)]));
  res.json({
    ...toCategory(cat),
    subcategories: subs.map((s) => ({ ...toSubcategory(s), productCount: countMap.get(s.id) ?? 0 })),
  });
});

router.get("/subcategories/:slug/products", async (req, res) => {
  const sub = await db.query.subcategoriesTable.findFirst({ where: eq(subcategoriesTable.slug, req.params.slug) });
  if (!sub) {
    res.status(404).json({ message: "Subcategory not found" });
    return;
  }
  const cat = await db.query.categoriesTable.findFirst({ where: eq(categoriesTable.id, sub.categoryId) });
  if (!cat) {
    res.status(404).json({ message: "Category not found" });
    return;
  }

  const sort = (req.query.sort as string) ?? "newest";
  const orderBy =
    sort === "price_asc"
      ? asc(productsTable.price)
      : sort === "price_desc"
        ? desc(productsTable.price)
        : desc(productsTable.createdAt);

  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.subcategoryId, sub.id))
    .orderBy(orderBy);

  res.json({
    subcategory: toSubcategory(sub),
    category: toCategory(cat),
    products: products.map((p) =>
      toProduct({
        ...p,
        subcategorySlug: sub.slug,
        subcategoryName: sub.name,
        categorySlug: cat.slug,
        categoryName: cat.name,
      }),
    ),
  });
});

router.get("/products/search", async (req, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  if (!q) {
    res.json([]);
    return;
  }
  const pattern = `%${q}%`;
  const rows = await db
    .select({ product: productsTable, subcategory: subcategoriesTable, category: categoriesTable })
    .from(productsTable)
    .innerJoin(subcategoriesTable, eq(subcategoriesTable.id, productsTable.subcategoryId))
    .innerJoin(categoriesTable, eq(categoriesTable.id, subcategoriesTable.categoryId))
    .where(or(ilike(productsTable.name, pattern), ilike(productsTable.description, pattern)))
    .orderBy(asc(productsTable.name))
    .limit(60);
  const products = rows.map((r) =>
    toProduct({
      ...r.product,
      subcategorySlug: r.subcategory.slug,
      subcategoryName: r.subcategory.name,
      categorySlug: r.category.slug,
      categoryName: r.category.name,
    }),
  );
  res.json(products);
});

router.get("/products/random-strip", async (_req, res) => {
  const all = await loadAllProductsWithJoin();
  const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 20);
  res.json(shuffled.map(toProduct));
});

router.get("/products/featured-by-category", async (_req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));
  const all = await loadAllProductsWithJoin();
  const result = cats.map((c) => {
    const inCat = all.filter((p) => p.categorySlug === c.slug);
    const shuffled = [...inCat].sort(() => Math.random() - 0.5).slice(0, 12);
    return {
      category: toCategory(c),
      products: shuffled.map(toProduct),
    };
  });
  res.json(result);
});

router.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ message: "Bad id" });
    return;
  }
  const rows = await db
    .select({ product: productsTable, subcategory: subcategoriesTable, category: categoriesTable })
    .from(productsTable)
    .innerJoin(subcategoriesTable, eq(subcategoriesTable.id, productsTable.subcategoryId))
    .innerJoin(categoriesTable, eq(categoriesTable.id, subcategoriesTable.categoryId))
    .where(eq(productsTable.id, id));
  const row = rows[0];
  if (!row) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  const colors = await db.select().from(productColorsTable)
    .where(eq(productColorsTable.productId, id))
    .orderBy(asc(productColorsTable.sortOrder));
  const [ratingRow] = await db
    .select({ avg: sql<string>`coalesce(avg(stars), null)`, count: sql<number>`cast(count(*) as int)` })
    .from(productRatingsTable)
    .where(eq(productRatingsTable.productId, id));
  res.json(
    toProduct({
      ...row.product,
      subcategorySlug: row.subcategory.slug,
      subcategoryName: row.subcategory.name,
      categorySlug: row.category.slug,
      categoryName: row.category.name,
      colors,
      averageRating: ratingRow.avg ? Number(ratingRow.avg) : null,
      ratingCount: Number(ratingRow.count),
    }),
  );
});

export default router;
