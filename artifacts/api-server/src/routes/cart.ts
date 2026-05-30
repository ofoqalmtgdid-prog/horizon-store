import { Router, type IRouter } from "express";
import { db, cartItemsTable, productsTable, subcategoriesTable, categoriesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { AddCartItemBody, UpdateCartItemBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { toProduct } from "../lib/serializers";

const router: IRouter = Router();

async function buildCart(userId: number) {
  const rows = await db
    .select({
      qty: cartItemsTable.quantity,
      selectedColor: cartItemsTable.selectedColor,
      product: productsTable,
      subcategory: subcategoriesTable,
      category: categoriesTable,
    })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(productsTable.id, cartItemsTable.productId))
    .innerJoin(subcategoriesTable, eq(subcategoriesTable.id, productsTable.subcategoryId))
    .innerJoin(categoriesTable, eq(categoriesTable.id, subcategoriesTable.categoryId))
    .where(eq(cartItemsTable.userId, userId));

  const items = rows.map((r) => ({
    productId: r.product.id,
    quantity: r.qty,
    selectedColor: r.selectedColor ?? null,
    product: toProduct({
      ...r.product,
      subcategorySlug: r.subcategory.slug,
      subcategoryName: r.subcategory.name,
      categorySlug: r.category.slug,
      categoryName: r.category.name,
    }),
  }));

  const total = items.reduce((s, it) => s + it.product.price * it.quantity, 0);
  const count = items.reduce((s, it) => s + it.quantity, 0);
  return { items, total, count };
}

router.get("/cart", requireAuth(), async (req, res) => {
  res.json(await buildCart(req.currentUser!.id));
});

router.post("/cart/items", requireAuth(), async (req, res) => {
  const parsed = AddCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const userId = req.currentUser!.id;
  const { productId, quantity, selectedColor } = parsed.data;

  const existing = await db.query.cartItemsTable.findFirst({
    where: and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.productId, productId)),
  });
  if (existing) {
    await db
      .update(cartItemsTable)
      .set({ quantity: existing.quantity + quantity, ...(selectedColor !== undefined ? { selectedColor } : {}) })
      .where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.productId, productId)));
  } else {
    await db.insert(cartItemsTable).values({ userId, productId, quantity, selectedColor: selectedColor ?? null });
  }
  res.json(await buildCart(userId));
});

router.patch("/cart/items/:productId", requireAuth(), async (req, res) => {
  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const userId = req.currentUser!.id;
  const productId = Number(req.params.productId);
  await db
    .update(cartItemsTable)
    .set({ quantity: parsed.data.quantity })
    .where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.productId, productId)));
  res.json(await buildCart(userId));
});

router.delete("/cart/items/:productId", requireAuth(), async (req, res) => {
  const userId = req.currentUser!.id;
  const productId = Number(req.params.productId);
  await db
    .delete(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.productId, productId)));
  res.json(await buildCart(userId));
});

export { buildCart };
export default router;
