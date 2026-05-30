import { useGetCategory, getGetCategoryQueryKey } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Package2 } from "lucide-react";

export default function Category() {
  const params = useParams();
  const slug = params.slug || "";
  const { data: category, isLoading } = useGetCategory(slug, {
    query: { queryKey: getGetCategoryQueryKey(slug), enabled: !!slug }
  });

  if (isLoading) {
    return <div className="text-center py-20 text-muted-foreground">جاري التحميل...</div>;
  }

  if (!category) {
    return <div className="text-center py-20 text-destructive">لم يتم العثور على القسم</div>;
  }

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b">
        <h1 className="text-3xl font-bold">{category.name}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {category.subcategories?.map((sub) => (
          <Link key={sub.id} href={`/subcategory/${sub.slug}`}>
            <a className="block group">
              <Card className="h-full hover:border-primary transition-colors hover:shadow-md">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Package2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">{sub.name}</h3>
                  {sub.productCount !== undefined && (
                    <p className="text-sm text-muted-foreground">{sub.productCount} منتج</p>
                  )}
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
