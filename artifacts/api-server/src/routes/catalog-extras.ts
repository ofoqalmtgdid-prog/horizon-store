import { Router, type IRouter } from "express";
import { db, deliveryRegionsTable, productColorsTable, productRatingsTable, aboutPageTable, productsTable } from "@workspace/db";
import { asc, eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { toDeliveryRegion, toProductColor } from "../lib/serializers";

const router: IRouter = Router();

// Public delivery regions
router.get("/delivery-regions", async (_req, res) => {
  const regions = await db.select().from(deliveryRegionsTable)
    .where(eq(deliveryRegionsTable.enabled, true))
    .orderBy(asc(deliveryRegionsTable.sortOrder), asc(deliveryRegionsTable.id));
  res.json(regions.map(toDeliveryRegion));
});

// Product colors (public - enabled only)
router.get("/products/:id/colors", async (req, res) => {
  const id = Number(req.params.id);
  const colors = await db.select().from(productColorsTable)
    .where(and(eq(productColorsTable.productId, id), eq(productColorsTable.enabled, true)))
    .orderBy(asc(productColorsTable.sortOrder));
  res.json(colors.map(toProductColor));
});

// Product ratings
router.get("/products/:id/ratings", async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.currentUser?.id ?? null;

  const [avg] = await db
    .select({ avg: sql<string>`coalesce(avg(stars), null)`, count: sql<number>`cast(count(*) as int)` })
    .from(productRatingsTable)
    .where(eq(productRatingsTable.productId, id));

  let userRating = null;
  if (userId) {
    userRating = await db.query.productRatingsTable.findFirst({
      where: and(eq(productRatingsTable.productId, id), eq(productRatingsTable.userId, userId)),
    });
  }

  res.json({
    averageRating: avg.avg ? Number(avg.avg) : null,
    ratingCount: Number(avg.count),
    userRating: userRating
      ? { id: userRating.id, productId: userRating.productId, userId: userRating.userId, stars: userRating.stars, label: userRating.label ?? null, createdAt: userRating.createdAt.toISOString() }
      : null,
  });
});

router.post("/products/:id/ratings", requireAuth(), async (req, res) => {
  const productId = Number(req.params.id);
  const userId = req.currentUser!.id;
  const { stars, label } = req.body as { stars: number; label?: string };

  if (!stars || stars < 1 || stars > 5) {
    res.status(400).json({ message: "stars must be 1-5" });
    return;
  }

  // upsert
  const existing = await db.query.productRatingsTable.findFirst({
    where: and(eq(productRatingsTable.productId, productId), eq(productRatingsTable.userId, userId)),
  });

  if (existing) {
    await db.update(productRatingsTable).set({ stars, label: label ?? null }).where(eq(productRatingsTable.id, existing.id));
  } else {
    await db.insert(productRatingsTable).values({ productId, userId, stars, label: label ?? null });
  }

  const [avg] = await db
    .select({ avg: sql<string>`coalesce(avg(stars), null)`, count: sql<number>`cast(count(*) as int)` })
    .from(productRatingsTable)
    .where(eq(productRatingsTable.productId, productId));

  const userRating = await db.query.productRatingsTable.findFirst({
    where: and(eq(productRatingsTable.productId, productId), eq(productRatingsTable.userId, userId)),
  });

  res.json({
    averageRating: avg.avg ? Number(avg.avg) : null,
    ratingCount: Number(avg.count),
    userRating: userRating
      ? { id: userRating.id, productId: userRating.productId, userId: userRating.userId, stars: userRating.stars, label: userRating.label ?? null, createdAt: userRating.createdAt.toISOString() }
      : null,
  });
});

// About page (public)
router.get("/about", async (_req, res) => {
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

export default router;
