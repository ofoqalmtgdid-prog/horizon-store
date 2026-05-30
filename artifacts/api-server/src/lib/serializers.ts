import type { DbCategory, DbSubcategory, DbProduct, DbOrder, DbOrderItem, DbUser, DbProductColor, DbDeliveryRegion } from "@workspace/db";

export type ProductWithJoin = DbProduct & {
  subcategorySlug: string;
  subcategoryName: string;
  categorySlug: string;
  categoryName: string;
  averageRating?: number | null;
  ratingCount?: number;
  colors?: DbProductColor[];
};

export function toCategory(c: DbCategory) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    nameEn: c.nameEn,
    icon: c.icon,
    imageUrl: (c as any).imageUrl ?? null,
  };
}

export function toSubcategory(s: DbSubcategory) {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    nameEn: s.nameEn,
    categoryId: s.categoryId,
  };
}

export function toProductColor(c: DbProductColor) {
  return {
    id: c.id,
    productId: c.productId,
    name: c.name,
    hexCode: c.hexCode,
    stock: c.stock,
    enabled: c.enabled,
    sortOrder: c.sortOrder,
  };
}

export function toProduct(p: ProductWithJoin) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    imageUrl: p.imageUrl,
    image2: p.image2 ?? null,
    image3: p.image3 ?? null,
    colorsEnabled: p.colorsEnabled ?? false,
    stock: p.stock,
    subcategoryId: p.subcategoryId,
    subcategorySlug: p.subcategorySlug,
    subcategoryName: p.subcategoryName,
    categorySlug: p.categorySlug,
    categoryName: p.categoryName,
    createdAt: p.createdAt.toISOString(),
    averageRating: p.averageRating ?? null,
    ratingCount: p.ratingCount ?? 0,
    colors: (p.colors ?? []).map(toProductColor),
  };
}

export function toDeliveryRegion(r: DbDeliveryRegion) {
  return {
    id: r.id,
    name: r.name,
    price: Number(r.price),
    enabled: r.enabled,
    sortOrder: r.sortOrder,
  };
}

export function publicUser(u: DbUser) {
  return {
    id: u.id,
    fullName: u.fullName,
    phone: u.phone,
    region: u.region,
    age: u.age,
    gender: u.gender,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    walletBalance: Number(u.walletBalance ?? 0),
    createdAt: u.createdAt.toISOString(),
  };
}

export function toOrder(
  o: DbOrder,
  items: DbOrderItem[],
  userName?: string,
) {
  return {
    id: o.id,
    userId: o.userId,
    userName,
    status: o.status,
    total: Number(o.total),
    deliveryFee: Number(o.deliveryFee ?? 0),
    region: o.region,
    address: o.address,
    phone: o.phone,
    backupPhone: o.backupPhone,
    notes: o.notes ?? undefined,
    items: items.map((it) => ({
      id: it.id,
      productId: it.productId ?? 0,
      productName: it.productName,
      productImage: it.productImage,
      price: Number(it.price),
      quantity: it.quantity,
      outOfStock: it.outOfStock,
      selectedColor: it.selectedColor ?? null,
    })),
    createdAt: o.createdAt.toISOString(),
  };
}
