import { Router, type IRouter } from "express";
import {
  db,
  ordersTable,
  orderItemsTable,
  usersTable,
  productsTable,
  subcategoriesTable,
  categoriesTable,
  productColorsTable,
  deliveryRegionsTable,
  aboutPageTable,
} from "@workspace/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  AdminUpdateOrderStatusBody,
  AdminFlagStockoutBody,
  AdminUpdateUserRoleBody,
  AdminCreateProductBody,
  AdminUpdateProductBody,
} from "@workspace/api-zod";
import { requireAdmin, publicUser } from "../lib/auth";
import { toOrder, toProduct, toProductColor, toDeliveryRegion } from "../lib/serializers";
import { loadOrder } from "./orders";

const router: IRouter = Router();

router.get("/admin/summary", requireAdmin(), async (_req, res) => {
  const [totalOrders] = await db.select({ c: sql<number>`cast(count(*) as int)` }).from(ordersTable);
  const [pendingOrders] = await db
    .select({ c: sql<number>`cast(count(*) as int)` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));
  const [preparingOrders] = await db
    .select({ c: sql<number>`cast(count(*) as int)` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "preparing"));
  const [revenue] = await db
    .select({ s: sql<string>`coalesce(sum(total), 0)` })
    .from(ordersTable)
    .where(sql`status NOT IN ('cancelled', 'rejected')`);
  const [totalUsers] = await db.select({ c: sql<number>`cast(count(*) as int)` }).from(usersTable);
  const [totalProducts] = await db.select({ c: sql<number>`cast(count(*) as int)` }).from(productsTable);
  const [lowStockProducts] = await db
    .select({ c: sql<number>`cast(count(*) as int)` })
    .from(productsTable)
    .where(sql`${productsTable.stock} <= 3`);

  const recent = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(8);
  const recentOrders = await Promise.all(
    recent.map(async (o) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
      const owner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, o.userId) });
      return toOrder(o, items, owner?.fullName);
    }),
  );

  res.json({
    totalOrders: Number(totalOrders.c),
    pendingOrders: Number(pendingOrders.c),
    preparingOrders: Number(preparingOrders.c),
    totalRevenue: Number(revenue.s),
    totalUsers: Number(totalUsers.c),
    totalProducts: Number(totalProducts.c),
    lowStockProducts: Number(lowStockProducts.c),
    recentOrders,
  });
});

router.get("/admin/orders", requireAdmin(), async (req, res) => {
  const status = (req.query.status as string | undefined) ?? null;
  const orders = status
    ? await db.select().from(ordersTable).where(eq(ordersTable.status, status)).orderBy(desc(ordersTable.createdAt))
    : await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  const result = await Promise.all(
    orders.map(async (o) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
      const owner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, o.userId) });
      return toOrder(o, items, owner?.fullName);
    }),
  );
  res.json(result);
});

router.patch("/admin/orders/:id/status", requireAdmin(), async (req, res) => {
  const parsed = AdminUpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const id = Number(req.params.id);
  const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, id) });

  await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, id));

  // Restore stock when admin cancels an order
  if (parsed.data.status === "cancelled" && order && order.status !== "cancelled") {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    for (const item of items) {
      if (item.productId) {
        await db
          .update(productsTable)
          .set({ stock: sql`stock + ${item.quantity}` })
          .where(eq(productsTable.id, item.productId));
      }
    }
  }

  // When admin marks "payment_received", credit the order total to user's wallet
  if (parsed.data.status === "payment_received" && order) {
    await db
      .update(usersTable)
      .set({ walletBalance: sql`wallet_balance + ${order.total}` })
      .where(eq(usersTable.id, order.userId));
  }

  res.json(await loadOrder(id));
});

router.post("/admin/orders/:id/stockout", requireAdmin(), async (req, res) => {
  const parsed = AdminFlagStockoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const id = Number(req.params.id);
  await db
    .update(orderItemsTable)
    .set({ outOfStock: true })
    .where(and(eq(orderItemsTable.orderId, id), eq(orderItemsTable.id, parsed.data.orderItemId)));
  await db.update(ordersTable).set({ status: "stockout" }).where(eq(ordersTable.id, id));
  res.json(await loadOrder(id));
});

router.get("/admin/users", requireAdmin(), async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(publicUser));
});

router.patch("/admin/users/:id/role", requireAdmin(), async (req, res) => {
  const parsed = AdminUpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const id = Number(req.params.id);
  const [updated] = await db
    .update(usersTable)
    .set({ role: parsed.data.role })
    .where(eq(usersTable.id, id))
    .returning();
  res.json(publicUser(updated));
});

async function loadProduct(id: number) {
  const rows = await db
    .select({ product: productsTable, subcategory: subcategoriesTable, category: categoriesTable })
    .from(productsTable)
    .innerJoin(subcategoriesTable, eq(subcategoriesTable.id, productsTable.subcategoryId))
    .innerJoin(categoriesTable, eq(categoriesTable.id, subcategoriesTable.categoryId))
    .where(eq(productsTable.id, id));
  const r = rows[0];
  if (!r) return null;
  const colors = await db.select().from(productColorsTable).where(eq(productColorsTable.productId, id)).orderBy(asc(productColorsTable.sortOrder));
  return toProduct({
    ...r.product,
    subcategorySlug: r.subcategory.slug,
    subcategoryName: r.subcategory.name,
    categorySlug: r.category.slug,
    categoryName: r.category.name,
    colors,
  });
}

router.get("/admin/products", requireAdmin(), async (_req, res) => {
  const rows = await db
    .select({ product: productsTable, subcategory: subcategoriesTable, category: categoriesTable })
    .from(productsTable)
    .innerJoin(subcategoriesTable, eq(subcategoriesTable.id, productsTable.subcategoryId))
    .innerJoin(categoriesTable, eq(categoriesTable.id, subcategoriesTable.categoryId))
    .orderBy(desc(productsTable.createdAt));
  const result = await Promise.all(
    rows.map(async (r) => {
      const colors = await db.select().from(productColorsTable).where(eq(productColorsTable.productId, r.product.id)).orderBy(asc(productColorsTable.sortOrder));
      return toProduct({
        ...r.product,
        subcategorySlug: r.subcategory.slug,
        subcategoryName: r.subcategory.name,
        categorySlug: r.category.slug,
        categoryName: r.category.name,
        colors,
      });
    }),
  );
  res.json(result);
});

router.post("/admin/products", requireAdmin(), async (req, res) => {
  const parsed = AdminCreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const [p] = await db
    .insert(productsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price.toFixed(2),
      imageUrl: parsed.data.imageUrl,
      image2: parsed.data.image2 ?? null,
      image3: parsed.data.image3 ?? null,
      stock: parsed.data.stock,
      subcategoryId: parsed.data.subcategoryId,
      colorsEnabled: parsed.data.colorsEnabled ?? false,
    })
    .returning();
  res.json(await loadProduct(p.id));
});

router.patch("/admin/products/:id", requireAdmin(), async (req, res) => {
  const parsed = AdminUpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.price !== undefined) updates.price = parsed.data.price.toFixed(2);
  if (parsed.data.imageUrl !== undefined) updates.imageUrl = parsed.data.imageUrl;
  if (parsed.data.image2 !== undefined) updates.image2 = parsed.data.image2;
  if (parsed.data.image3 !== undefined) updates.image3 = parsed.data.image3;
  if (parsed.data.stock !== undefined) updates.stock = parsed.data.stock;
  if (parsed.data.subcategoryId !== undefined) updates.subcategoryId = parsed.data.subcategoryId;
  if (parsed.data.colorsEnabled !== undefined) updates.colorsEnabled = parsed.data.colorsEnabled;

  if (Object.keys(updates).length > 0) {
    await db.update(productsTable).set(updates).where(eq(productsTable.id, id));
  }
  res.json(await loadProduct(id));
});

router.delete("/admin/products/:id", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ ok: true });
});

// Product Colors
router.get("/admin/products/:productId/colors", requireAdmin(), async (req, res) => {
  const productId = Number(req.params.productId);
  const colors = await db.select().from(productColorsTable).where(eq(productColorsTable.productId, productId)).orderBy(asc(productColorsTable.sortOrder));
  res.json(colors.map(toProductColor));
});

router.post("/admin/products/:productId/colors", requireAdmin(), async (req, res) => {
  const productId = Number(req.params.productId);
  const { colors } = req.body as { colors?: { name: string; hexCode: string; stock: number; enabled?: boolean; sortOrder?: number }[] };

  if (Array.isArray(colors)) {
    await db.delete(productColorsTable).where(eq(productColorsTable.productId, productId));
    if (colors.length > 0) {
      const rows = colors.map((c, i) => ({
        productId,
        name: c.name,
        hexCode: c.hexCode,
        stock: Number(c.stock ?? 0),
        enabled: c.enabled ?? true,
        sortOrder: c.sortOrder ?? i,
      }));
      const inserted = await db.insert(productColorsTable).values(rows).returning();
      res.json(inserted.map(toProductColor));
    } else {
      res.json([]);
    }
    return;
  }

  const { name, hexCode, stock, enabled = true, sortOrder = 0 } = req.body as {
    name: string; hexCode: string; stock: number; enabled?: boolean; sortOrder?: number;
  };
  const [c] = await db.insert(productColorsTable).values({ productId, name, hexCode, stock, enabled, sortOrder }).returning();
  res.json(toProductColor(c));
});

router.patch("/admin/product-colors/:colorId", requireAdmin(), async (req, res) => {
  const colorId = Number(req.params.colorId);
  const updates: Record<string, unknown> = {};
  const body = req.body as Record<string, unknown>;
  if (body.name !== undefined) updates.name = body.name;
  if (body.hexCode !== undefined) updates.hexCode = body.hexCode;
  if (body.stock !== undefined) updates.stock = body.stock;
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  const [c] = await db.update(productColorsTable).set(updates).where(eq(productColorsTable.id, colorId)).returning();
  res.json(toProductColor(c));
});

router.delete("/admin/product-colors/:colorId", requireAdmin(), async (req, res) => {
  const colorId = Number(req.params.colorId);
  await db.delete(productColorsTable).where(eq(productColorsTable.id, colorId));
  res.json({ ok: true });
});

// Delivery Regions
router.get("/admin/delivery-regions", requireAdmin(), async (_req, res) => {
  const regions = await db.select().from(deliveryRegionsTable).orderBy(asc(deliveryRegionsTable.sortOrder), asc(deliveryRegionsTable.id));
  res.json(regions.map(toDeliveryRegion));
});

router.post("/admin/delivery-regions", requireAdmin(), async (req, res) => {
  const { name, price, enabled = true, sortOrder = 0 } = req.body as {
    name: string; price: number; enabled?: boolean; sortOrder?: number;
  };
  const [r] = await db.insert(deliveryRegionsTable).values({ name, price: price.toFixed(2), enabled, sortOrder }).returning();
  res.json(toDeliveryRegion(r));
});

router.patch("/admin/delivery-regions/:id", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = {};
  const body = req.body as Record<string, unknown>;
  if (body.name !== undefined) updates.name = body.name;
  if (body.price !== undefined) updates.price = Number(body.price).toFixed(2);
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  const [r] = await db.update(deliveryRegionsTable).set(updates).where(eq(deliveryRegionsTable.id, id)).returning();
  res.json(toDeliveryRegion(r));
});

router.delete("/admin/delivery-regions/:id", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(deliveryRegionsTable).where(eq(deliveryRegionsTable.id, id));
  res.json({ ok: true });
});

// Categories CRUD
router.get("/admin/categories", requireAdmin(), async (_req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));
  res.json(cats.map(toCategory));
});

router.post("/admin/categories", requireAdmin(), async (req, res) => {
  const { name, slug, nameEn, icon, imageUrl, sortOrder = 0 } = req.body as {
    name: string; slug: string; nameEn?: string; icon?: string; imageUrl?: string; sortOrder?: number;
  };
  const [cat] = await db.insert(categoriesTable).values({ name, slug, nameEn, icon, imageUrl, sortOrder }).returning();
  res.json(toCategory(cat));
});

router.put("/admin/categories/:id", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = {};
  const body = req.body as Record<string, unknown>;
  if (body.name !== undefined) updates.name = body.name;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.nameEn !== undefined) updates.nameEn = body.nameEn;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  const [cat] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ message: "Not found" }); return; }
  res.json(toCategory(cat));
});

router.delete("/admin/categories/:id", requireAdmin(), async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.json({ ok: true });
});

// About Page
router.get("/admin/about", requireAdmin(), async (_req, res) => {
  let row = await db.query.aboutPageTable.findFirst();
  if (!row) {
    const [created] = await db.insert(aboutPageTable).values({ content: "{}" }).returning();
    row = created;
  }
  try {
    res.json(JSON.parse(row.content));
  } catch {
    res.json({});
  }
});

router.put("/admin/about", requireAdmin(), async (req, res) => {
  const content = JSON.stringify(req.body);
  let row = await db.query.aboutPageTable.findFirst();
  if (!row) {
    const [created] = await db.insert(aboutPageTable).values({ content }).returning();
    row = created;
  } else {
    const [updated] = await db.update(aboutPageTable).set({ content }).where(eq(aboutPageTable.id, row.id)).returning();
    row = updated;
  }
  try {
    res.json(JSON.parse(row.content));
  } catch {
    res.json({});
  }
});

export default router;
