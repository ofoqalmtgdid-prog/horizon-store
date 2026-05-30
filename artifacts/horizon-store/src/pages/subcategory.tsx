import { useListSubcategoryProducts, getListSubcategoryProductsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default function Subcategory() {
  const params = useParams();
  const slug = params.slug || "";
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");
  
  const { data, isLoading } = useListSubcategoryProducts(slug, { sort }, {
    query: { queryKey: getListSubcategoryProductsQueryKey(slug, { sort }), enabled: !!slug }
  });

  if (isLoading) {
    return <div className="text-center py-20 text-muted-foreground">جاري التحميل...</div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-destructive">لم يتم العثور على القسم</div>;
  }

  const { subcategory, category, products } = data;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link href="/">الرئيسية</Link></BreadcrumbLink>
          </BreadcrumbItem>
          {category && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link href={`/category/${category.slug}`}>{category.name}</Link></BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="font-semibold">{subcategory.name}</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <h1 className="text-3xl font-bold">{subcategory.name}</h1>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground whitespace-nowrap">ترتيب حسب:</span>
          <Select value={sort} onValueChange={(val: any) => setSort(val)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="price_asc">السعر من الأقل للأعلى</SelectItem>
              <SelectItem value="price_desc">السعر من الأعلى للأقل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-xl">
          لا توجد منتجات في هذا القسم حالياً
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
