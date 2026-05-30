import { Router, type IRouter } from "express";
import { db, favoritesTable, productsTable, subcategoriesTable, categoriesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { toProduct } from "../lib/serializers";

const router: IRouter = Router();

router.get("/favorites", requireAuth(), async (req, res) => {
  const userId = req.currentUser!.id;
  const rows = await db
    .select({ product: productsTable, subcategory: subcategoriesTable, category: categoriesTable })
    .from(favoritesTable)
    .innerJoin(productsTable, eq(productsTable.id, favoritesTable.productId))
    .innerJoin(subcategoriesTable, eq(subcategoriesTable.id, productsTable.subcategoryId))
    .innerJoin(categoriesTable, eq(categoriesTable.id, subcategoriesTable.categoryId))
    .where(eq(favoritesTable.userId, userId));
  res.json(
    rows.map((r) =>
      toProduct({
        ...r.product,
        subcategorySlug: r.subcategory.slug,
        subcategoryName: r.subcategory.name,
        categorySlug: r.category.slug,
        categoryName: r.category.name,
      }),
    ),
  );
});

router.post("/favorites/:productId", requireAuth(), async (req, res) => {
  const userId = req.currentUser!.id;
  const productId = Number(req.params.productId);
  const existing = await db.query.favoritesTable.findFirst({
    where: and(eq(favoritesTable.userId, userId), eq(favoritesTable.productId, productId)),
  });
  if (!existing) {
    await db.insert(favoritesTable).values({ userId, productId });
  }
  res.json({ ok: true });
});

router.delete("/favorites/:productId", requireAuth(), async (req, res) => {
  const userId = req.currentUser!.id;
  const productId = Number(req.params.productId);
  await db
    .delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.productId, productId)));
  res.json({ ok: true });
});

export default router;
