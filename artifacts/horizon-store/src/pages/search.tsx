import { useSearch } from "wouter";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Search, PackageSearch } from "lucide-react";
import type { Product } from "@workspace/api-client-react";

function imageUrlFor(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

export default function SearchPage() {
  const qs = useSearch();
  const params = new URLSearchParams(qs);
  const q = params.get("q") ?? "";

  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(false);
    const token = localStorage.getItem("horizonStoreToken");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["x-session-token"] = token;
    }
    fetch(`/api/products/search?q=${encodeURIComponent(q.trim())}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        setResults(Array.isArray(data) ? data : []);
        setSearched(true);
        setLoading(false);
      })
      .catch(() => {
        setResults([]);
        setSearched(true);
        setLoading(false);
      });
  }, [q]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold">
            {q ? `نتائج البحث عن "${q}"` : "البحث"}
          </h1>
          {searched && (
            <p className="text-sm text-muted-foreground">
              {results.length > 0
                ? `تم العثور على ${results.length} منتج`
                : "لا توجد نتائج"}
            </p>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-muted-foreground">جاري البحث...</div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <PackageSearch className="w-16 h-16 opacity-30" />
          <p className="text-lg font-medium">لا توجد منتجات تطابق "{q}"</p>
          <p className="text-sm">جرّب كلمات مختلفة أو تصفح الأقسام</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {results.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                imageUrl: imageUrlFor(product.imageUrl),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
