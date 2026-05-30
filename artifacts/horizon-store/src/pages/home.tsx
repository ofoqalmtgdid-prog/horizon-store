import { useListCategories, useGetFeaturedByCategory, type CategoryFeatured } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ProductCard } from "@/components/product-card";
import { ChevronLeft, ShoppingBag } from "lucide-react";

function imageUrlFor(p: string | null | undefined): string {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  if (p.startsWith("/objects/")) return `/api/storage${p}`;
  return p;
}

function CategoryFeaturedSection({ block }: { block: CategoryFeatured }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const products = block.products;

  useEffect(() => {
    if (!products || products.length <= 3) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 3 >= products.length ? 0 : prev + 3));
    }, 10000);
    return () => clearInterval(interval);
  }, [products]);

  if (!products || products.length === 0) return null;

  const currentProducts = products.slice(currentIndex, currentIndex + 3);

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="text-xl font-bold text-foreground">{block.category.name}</h2>
        </div>
        <Link
          href={`/category/${block.category.slug}`}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          عرض الكل
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
        {currentProducts.map((product) => (
          <div key={product.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface StoreSettings {
  storeName: string;
  storeSubtitle: string;
  heroImageUrl: string;
  primaryColor: string;
  logoUrl: string;
}

export default function Home() {
  const { data: categories, isLoading } = useListCategories();
  const { data: featured } = useGetFeaturedByCategory();
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: "الأفق المتجدد",
    storeSubtitle: "وجهتك الأولى بأسعار تنافسية",
    heroImageUrl: "",
    primaryColor: "#f97316",
    logoUrl: "",
  });

  useEffect(() => {
    fetch("/api/about")
      .then((r) => r.json())
      .then((d: any) => {
        let data = d;
        if (d?.content && typeof d.content === "string") {
          try { data = JSON.parse(d.content); } catch { data = d; }
        }
        if (data.storeName || data.storeSubtitle || data.heroImageUrl || data.primaryColor) {
          setSettings({
            storeName: data.storeName || "الأفق المتجدد",
            storeSubtitle: data.storeSubtitle || "وجهتك الأولى بأسعار تنافسية",
            heroImageUrl: data.heroImageUrl || "",
            primaryColor: data.primaryColor || "#f97316",
            logoUrl: data.logoUrl || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  if (isLoading) {
    return <div className="flex justify-center py-20 text-muted-foreground">جاري التحميل...</div>;
  }

  const heroBg = settings.heroImageUrl
    ? `url('${imageUrlFor(settings.heroImageUrl)}')`
    : "url('/store-front.jpg')";

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Banner */}
      <section className="relative rounded-2xl overflow-hidden flex items-center justify-center text-center py-16 md:py-24 px-6 min-h-[220px] md:min-h-[280px]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: heroBg }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/65" />
        <div className="absolute inset-0 bg-primary/15" />

        <div className="relative z-10 max-w-xl mx-auto space-y-3">
          {settings.logoUrl ? (
            <img src={imageUrlFor(settings.logoUrl)} alt={settings.storeName} className="w-20 h-20 object-contain mx-auto rounded-2xl" />
          ) : (
            <div className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
              متجر الإلكترونيات في ليبيا
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-xl">
            {settings.storeName}
          </h1>
          <p className="text-sm md:text-base text-white/85 font-medium leading-relaxed drop-shadow">
            {settings.storeSubtitle}
          </p>
        </div>
      </section>

      {/* Categories — Modern grid with images */}
      {categories && categories.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h2 className="text-xl font-bold">تصفح الأقسام</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {categories.map((cat, i) => {
              const hasImg = !!(cat as any).imageUrl;
              const imgSrc = imageUrlFor((cat as any).imageUrl);
              const ACCENT_COLORS = [
                "bg-orange-500","bg-blue-500","bg-violet-500","bg-emerald-500",
                "bg-rose-500","bg-cyan-500","bg-yellow-500","bg-pink-500",
              ];
              const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];

              return (
                <Link key={cat.id} href={`/category/${cat.slug}`} className="group block">
                  {hasImg ? (
                    /* Image card — magazine style */
                    <div className="relative overflow-hidden rounded-2xl aspect-[4/3] shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <img
                        src={imgSrc}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 inset-x-0 p-3">
                        <h3 className="text-white font-bold text-sm md:text-base leading-tight drop-shadow">
                          {cat.name}
                        </h3>
                        {(cat as any).subcategories?.length > 0 && (
                          <p className="text-white/70 text-[10px] mt-0.5">
                            {(cat as any).subcategories.length} قسم فرعي
                          </p>
                        )}
                      </div>
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full p-1">
                        <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
                      </div>
                    </div>
                  ) : (
                    /* Emoji/icon card — gradient style */
                    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] cursor-pointer">
                      <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10 ${accent}`} />
                      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-muted" />
                      <div className="relative flex flex-col gap-3">
                        <div className={`w-11 h-11 rounded-xl ${accent} bg-opacity-15 flex items-center justify-center text-2xl shadow-sm`}
                          style={{ backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` }}
                        >
                          <span>{cat.icon || "📦"}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm md:text-base leading-tight group-hover:text-primary transition-colors duration-200">
                            {cat.name}
                          </h3>
                          {(cat as any).subcategories?.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {(cat as any).subcategories.length} قسم فرعي
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Shop CTA if no categories */}
      {(!categories || categories.length === 0) && (
        <div className="text-center py-16">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">لا توجد أقسام بعد</p>
        </div>
      )}

      {/* Featured Products by Category */}
      <div className="space-y-12">
        {featured?.map((block) => (
          <CategoryFeaturedSection key={block.category.id} block={block} />
        ))}
      </div>
    </div>
  );
}
