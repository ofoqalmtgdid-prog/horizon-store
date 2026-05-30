import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, cartItemsTable, productsTable, usersTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { PlaceOrderBody, ResolveStockoutBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { toOrder } from "../lib/serializers";
import { buildCart } from "./cart";

const router: IRouter = Router();

async function loadOrder(orderId: number) {
  const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
  if (!order) return null;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  const owner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, order.userId) });
  return toOrder(order, items, owner?.fullName);
}

router.get("/orders", requireAuth(), async (req, res) => {
  const userId = req.currentUser!.id;
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.createdAt));
  const result = await Promise.all(
    orders.map(async (o) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
      return toOrder(o, items, req.currentUser!.fullName);
    }),
  );
  res.json(result);
});

router.post("/orders", requireAuth(), async (req, res) => {
  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const userId = req.currentUser!.id;
  const cart = await buildCart(userId);
  if (cart.items.length === 0) {
    res.status(400).json({ message: "السلة فارغة" });
    return;
  }

  const deliveryFee = Number(parsed.data.deliveryFee ?? 0);
  const grandTotal = cart.total + deliveryFee;

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId,
      status: "pending",
      total: grandTotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      region: parsed.data.region,
      address: parsed.data.address,
      phone: parsed.data.phone,
      backupPhone: parsed.data.backupPhone,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  for (const it of cart.items) {
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      productId: it.product.id,
      productName: it.product.name,
      productImage: it.product.imageUrl,
      price: it.product.price.toFixed(2),
      quantity: it.quantity,
      outOfStock: false,
      selectedColor: it.selectedColor ?? null,
    });
    // decrement stock
    const newStock = Math.max(0, it.product.stock - it.quantity);
    await db.update(productsTable).set({ stock: newStock }).where(eq(productsTable.id, it.product.id));
  }

  // clear cart
  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));

  const result = await loadOrder(order.id);
  res.json(result);
});

router.get("/orders/:id", requireAuth(), async (req, res) => {
  const id = Number(req.params.id);
  const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, id) });
  if (!order || order.userId !== req.currentUser!.id) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  const result = await loadOrder(id);
  res.json(result);
});

router.post("/orders/:id/cancel", requireAuth(), async (req, res) => {
  const id = Number(req.params.id);
  const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, id) });
  if (!order || order.userId !== req.currentUser!.id) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  if (order.status !== "pending" && order.status !== "stockout") {
    res.status(400).json({ message: "لا يمكن إلغاء الطلب في حالته الحالية" });
    return;
  }
  // Restore stock for each item
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  for (const item of items) {
    if (item.productId) {
      await db
        .update(productsTable)
        .set({ stock: sql<number>`stock + ${item.quantity}` })
        .where(eq(productsTable.id, item.productId));
    }
  }
  await db.update(ordersTable).set({ status: "cancelled" }).where(eq(ordersTable.id, id));
  const result = await loadOrder(id);
  res.json(result);
});

router.post("/orders/:id/resolve-stockout", requireAuth(), async (req, res) => {
  const parsed = ResolveStockoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const id = Number(req.params.id);
  const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, id) });
  if (!order || order.userId !== req.currentUser!.id) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  if (order.status !== "stockout") {
    res.status(400).json({ message: "الطلب ليس في حالة نفاد مخزون" });
    return;
  }

  if (parsed.data.action === "cancel") {
    // Restore stock for all items
    const allItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    for (const item of allItems) {
      if (item.productId) {
        await db
          .update(productsTable)
          .set({ stock: sql<number>`stock + ${item.quantity}` })
          .where(eq(productsTable.id, item.productId));
      }
    }
    await db.update(ordersTable).set({ status: "cancelled" }).where(eq(ordersTable.id, id));
  } else {
    // remove out-of-stock items, recompute total, set back to preparing
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    const remaining = items.filter((i) => !i.outOfStock);
    if (remaining.length === 0) {
      await db.update(ordersTable).set({ status: "cancelled" }).where(eq(ordersTable.id, id));
    } else {
      await db
        .delete(orderItemsTable)
        .where(and(eq(orderItemsTable.orderId, id), eq(orderItemsTable.outOfStock, true)));
      const newTotal = remaining.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
      await db
        .update(ordersTable)
        .set({ status: "preparing", total: newTotal.toFixed(2) })
        .where(eq(ordersTable.id, id));
    }
  }

  const result = await loadOrder(id);
  res.json(result);
});

export { loadOrder };
export default router;
