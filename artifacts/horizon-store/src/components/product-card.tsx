import { Product } from "@workspace/api-client-react";
import { ShoppingCart, Heart, Star } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  useAddCartItem,
  useAddFavorite,
  useRemoveFavorite,
  useGetFavorites,
  getGetFavoritesQueryKey,
  getGetCartQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

function imageUrlFor(p: string | null | undefined): string {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  if (p.startsWith("/objects/")) return `/api/storage${p}`;
  return p;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: favorites } = useGetFavorites({
    query: { queryKey: getGetFavoritesQueryKey(), enabled: isAuthenticated },
  });
  const isFavorite = favorites?.some((f: any) => f.id === product.id) ?? false;

  const addCart = useAddCartItem();
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();

  const handleCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { setLocation("/login"); return; }
    try {
      await addCart.mutateAsync({ data: { productId: product.id, quantity: 1 } });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "أضيف للسلة", description: product.name });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  };

  const handleFav = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { setLocation("/login"); return; }
    try {
      if (isFavorite) {
        await removeFav.mutateAsync({ productId: product.id });
      } else {
        await addFav.mutateAsync({ productId: product.id });
      }
      qc.invalidateQueries({ queryKey: getGetFavoritesQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  };

  const isOutOfStock = product.stock === 0;
  const avgRating = (product as any).averageRating as number | null | undefined;

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl pointer-events-none">
            <span className="bg-destructive text-destructive-foreground text-[10px] px-2.5 py-1 rounded-full font-bold shadow transform -rotate-12">
              نفد المخزون
            </span>
          </div>
        )}

        {/* Product Image */}
        <div className="aspect-square bg-muted/40 p-3 flex items-center justify-center overflow-hidden">
          <img
            src={imageUrlFor(product.imageUrl)}
            alt={product.name}
            className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Card body */}
        <div className="flex flex-col flex-1 px-2.5 pt-1.5 pb-2.5 gap-1">
          {/* Category + heart */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-muted-foreground font-medium truncate leading-none">{product.categoryName}</span>
            <button
              className="p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0 -mr-0.5"
              onClick={handleFav}
              aria-label="المفضلة"
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground/50 hover:text-destructive"
                }`}
              />
            </button>
          </div>

          {/* Product name */}
          <h3 className="text-xs font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Stars */}
          {avgRating != null && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-2.5 h-2.5 ${
                    s <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/25"
                  }`}
                />
              ))}
              <span className="text-[10px] text-muted-foreground mr-0.5">{avgRating.toFixed(1)}</span>
            </div>
          )}

          {/* Price + cart button */}
          <div className="flex items-center justify-between mt-auto pt-1">
            <span className="text-sm font-bold text-primary" dir="ltr">
              {product.price} د.ل
            </span>
            <button
              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-colors disabled:opacity-40"
              onClick={handleCart}
              disabled={isOutOfStock || addCart.isPending}
              aria-label="أضف للسلة"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
