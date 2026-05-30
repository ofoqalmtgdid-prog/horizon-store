import { pgTable, integer, primaryKey, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./catalog";

export const cartItemsTable = pgTable(
  "cart_items",
  {
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    selectedColor: text("selected_color"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.productId] }),
  }),
);

export type DbCartItem = typeof cartItemsTable.$inferSelect;
