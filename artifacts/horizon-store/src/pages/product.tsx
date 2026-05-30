import { useState } from "react";
import {
  useGetProduct,
  useAddCartItem,
  useAddFavorite,
  useRemoveFavorite,
  useGetFavorites,
  getGetCartQueryKey,
  getGetFavoritesQueryKey,
  getGetProductQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Heart, PackageCheck, AlertCircle, Star, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const RATING_LABELS = ["ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"];

function StarRatingWidget({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className="focus:outline-none"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              s <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30 hover:text-yellow-300"
            }`}
          />
        </button>
      ))}
      {(hover || value) > 0 && (
        <span className="text-sm font-medium text-muted-foreground mr-2">
          {RATING_LABELS[(hover || value) - 1]}
        </span>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: product, isLoading, refetch } = useGetProduct(id, {
    query: { queryKey: getGetProductQueryKey(id), enabled: !!id },
  });

  const { data: favorites } = useGetFavorites({
    query: { queryKey: getGetFavoritesQueryKey(), enabled: isAuthenticated },
  });
  const isFavorite = favorites?.some((f: any) => f.id === id) ?? false;

  const addCart = useAddCartItem();
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();

  const [activeImg, setActiveImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  if (isLoading) return <div className="text-center py-20 text-muted-foreground">جاري التحميل...</div>;
  if (!product) return <div className="text-center py-20 text-destructive">لم يتم العثور على المنتج</div>;

  const p = product as any;
  const imageUrlFor = (url: string | null | undefined) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/objects/")) return `/api/storage${url}`;
    return url;
  };
  const images = [product.imageUrl, p.image2, p.image3].filter(Boolean).map(imageUrlFor) as string[];
  const colors = (p.colors ?? []) as { id: number; name: string; hexCode: string; stock: number; enabled: boolean }[];
  const enabledColors = p.colorsEnabled === true ? colors.filter((c) => c.enabled) : [];
  const avgRating = typeof p.averageRating === "number" ? p.averageRating : null;
  const ratingCount = p.ratingCount ?? 0;

  const isOutOfStock = (() => {
    if (enabledColors.length > 0) {
      if (!selectedColor) return false;
      const c = enabledColors.find((c) => c.hexCode === selectedColor);
      return (c?.stock ?? 0) === 0;
    }
    return product.stock === 0;
  })();

  const handleAddToCart = async () => {
    if (!isAuthenticated) { setLocation("/login"); return; }
    if (enabledColors.length > 0 && !selectedColor) {
      toast({ variant: "destructive", title: "اختر اللون أولاً" });
      return;
    }
    try {
      await addCart.mutateAsync({
        data: {
          productId: product.id,
          quantity: 1,
          ...(selectedColor ? { selectedColor } : {}),
        },
      });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "تمت الإضافة للسلة", description: product.name });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  };

  const handleFav = async () => {
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

  const handleSubmitRating = async () => {
    if (!isAuthenticated) { setLocation("/login"); return; }
    if (userRating === 0) { toast({ variant: "destructive", title: "اختر تقييمك أولاً" }); return; }
    setSubmittingRating(true);
    try {
      const token = localStorage.getItem("horizonStoreToken");
      const res = await fetch(`/api/products/${id}/ratings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-session-token": token ?? "",
        },
        body: JSON.stringify({ stars: userRating, label: RATING_LABELS[userRating - 1] }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "فشل التقييم");
      }
      toast({ title: "شكراً على تقييمك!" });
      setUserRating(0);
      setUserComment("");
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link href="/">الرئيسية</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link href={`/category/${product.categorySlug}`}>{product.categoryName}</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link href={`/subcategory/${product.subcategorySlug}`}>{product.subcategoryName}</Link></BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square bg-muted rounded-2xl flex items-center justify-center p-8 overflow-hidden border">
            <img
              src={images[activeImg]}
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply"
            />
            {isOutOfStock && (
              <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full font-bold text-sm shadow-md">
                نفد المخزون
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  className={`flex-1 aspect-square bg-muted rounded-xl border-2 flex items-center justify-center p-2 transition-all overflow-hidden ${
                    activeImg === i ? "border-primary shadow-md" : "border-transparent hover:border-border"
                  }`}
                  onClick={() => setActiveImg(i)}
                >
                  <img src={img} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2">{product.name}</h1>

            {/* Rating summary */}
            {avgRating != null && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/25"}`} />
                  ))}
                </div>
                <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({ratingCount} تقييم)</span>
              </div>
            )}

            <div className="text-2xl font-extrabold text-primary" dir="ltr">{product.price} د.ل</div>
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {/* Stock status */}
          <div className="text-sm font-medium">
            {product.stock === 0 && enabledColors.length === 0 ? (
              <span className="flex items-center gap-2 text-destructive"><AlertCircle className="w-4 h-4"/> غير متوفر حالياً</span>
            ) : (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400"><PackageCheck className="w-4 h-4"/> متوفر</span>
            )}
          </div>

          {/* Color picker */}
          {enabledColors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">اختر اللون:</p>
              <div className="flex flex-wrap gap-2">
                {enabledColors.map((c) => (
                  <button
                    key={c.id}
                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${
                      selectedColor === c.hexCode
                        ? "border-primary shadow-md"
                        : "border-border hover:border-muted-foreground"
                    } ${c.stock === 0 ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                    onClick={() => c.stock > 0 && setSelectedColor(c.hexCode)}
                    disabled={c.stock === 0}
                    title={c.stock === 0 ? "نفد" : `${c.stock} متبقي`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                      style={{ backgroundColor: c.hexCode }}
                    />
                    {c.name}
                    {c.stock === 0 && <span className="text-[9px] text-destructive mr-1">نفد</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-auto pt-4 border-t">
            <Button
              className="flex-1 gap-2 h-12 text-base"
              onClick={handleAddToCart}
              disabled={addCart.isPending}
            >
              <ShoppingCart className="w-5 h-5" />
              {addCart.isPending ? "جاري الإضافة..." : "إضافة إلى السلة"}
            </Button>
            <Button
              variant={isFavorite ? "default" : "outline"}
              size="icon"
              className="h-12 w-12"
              onClick={handleFav}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? "fill-primary-foreground text-primary-foreground" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Rating Section */}
      {isAuthenticated && (
        <div className="border rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-bold">قيّم هذا المنتج</h2>
          <StarRatingWidget value={userRating} onChange={setUserRating} />
          <Button
            className="gap-2"
            onClick={handleSubmitRating}
            disabled={submittingRating || userRating === 0}
          >
            <Send className="w-4 h-4" />
            إرسال التقييم
          </Button>
        </div>
      )}
    </div>
  );
}
