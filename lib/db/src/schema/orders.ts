import { pgTable, serial, text, integer, timestamp, numeric, varchar, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./catalog";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  region: text("region").notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  backupPhone: varchar("backup_phone", { length: 32 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  productImage: text("product_image").notNull().default(""),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  outOfStock: boolean("out_of_stock").notNull().default(false),
  selectedColor: text("selected_color"),
});

export type DbOrder = typeof ordersTable.$inferSelect;
export type DbOrderItem = typeof orderItemsTable.$inferSelect;
