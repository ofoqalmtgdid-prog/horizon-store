import { useGetFavorites } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Favorites() {
  const { data: favorites, isLoading } = useGetFavorites();

  if (isLoading) return <div className="text-center py-20">جاري التحميل...</div>;

  if (!favorites || favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
          <Heart className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">قائمة المفضلة فارغة</h2>
        <p className="text-muted-foreground max-w-md">
          لم تقم بإضافة أي منتجات إلى المفضلة بعد. تصفح المنتجات واضغط على أيقونة القلب لحفظها هنا!
        </p>
        <Button asChild size="lg">
          <Link href="/">تصفح المنتجات</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">المفضلة</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {(favorites as any[]).map((fav: any) => (
          <ProductCard key={fav.id} product={fav} />
        ))}
      </div>
    </div>
  );
}
