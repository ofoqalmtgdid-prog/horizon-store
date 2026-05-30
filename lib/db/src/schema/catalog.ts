import { pgTable, serial, text, integer, timestamp, numeric, varchar, boolean } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  icon: text("icon"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const subcategoriesTable = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  subcategoryId: integer("subcategory_id").notNull().references(() => subcategoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  imageUrl: text("image_url").notNull().default(""),
  image2: text("image_2"),
  image3: text("image_3"),
  stock: integer("stock").notNull().default(0),
  colorsEnabled: boolean("colors_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productColorsTable = pgTable("product_colors", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hexCode: varchar("hex_code", { length: 16 }).notNull().default("#000000"),
  stock: integer("stock").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productRatingsTable = pgTable("product_ratings", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  stars: integer("stars").notNull(),
  label: varchar("label", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deliveryRegionsTable = pgTable("delivery_regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const aboutPageTable = pgTable("about_page", {
  id: serial("id").primaryKey(),
  content: text("content").notNull().default("{}"),
});

export type DbCategory = typeof categoriesTable.$inferSelect;
export type DbSubcategory = typeof subcategoriesTable.$inferSelect;
export type DbProduct = typeof productsTable.$inferSelect;
export type DbProductColor = typeof productColorsTable.$inferSelect;
export type DbProductRating = typeof productRatingsTable.$inferSelect;
export type DbDeliveryRegion = typeof deliveryRegionsTable.$inferSelect;
export type DbAboutPage = typeof aboutPageTable.$inferSelect;
