import { useListMyOrders, useGetOrder, useCancelOrder, useResolveStockout, getListMyOrdersQueryKey, getGetOrderQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Package, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_MAP = {
  pending: { label: "قيد المراجعة", variant: "secondary" as const },
  preparing: { label: "قيد التجهيز", variant: "default" as const },
  prepared: { label: "تم التجهيز", variant: "default" as const },
  delivered_to_courier: { label: "تم التسليم لشركة التوصيل", variant: "default" as const },
  payment_received: { label: "تم الاستلام ✓", variant: "default" as const },
  cancelled: { label: "ملغي", variant: "destructive" as const },
  stockout: { label: "نفاد المخزون", variant: "destructive" as const },
};

export default function Orders() {
  const { data: orders, isLoading } = useListMyOrders();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cancelMutation = useCancelOrder();
  const resolveMutation = useResolveStockout();

  if (isLoading) return <div className="text-center py-20">جاري التحميل...</div>;

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
          <Package className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">لا توجد طلبات سابقة</h2>
        <p className="text-muted-foreground max-w-md">
          لم تقم بأي طلبات بعد. ابدأ التسوق الآن!
        </p>
        <Button asChild size="lg">
          <Link href="/">تصفح المنتجات</Link>
        </Button>
      </div>
    );
  }

  const handleCancel = async (id: number) => {
    if (!confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) return;
    try {
      await cancelMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
      toast({ title: "تم إلغاء الطلب" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  };

  const handleResolveStockout = async (id: number, action: "continue_without" | "cancel") => {
    try {
      await resolveMutation.mutateAsync({ id, data: { action } });
      queryClient.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
      toast({ title: action === "continue_without" ? "تم تحديث الطلب وإكماله" : "تم إلغاء الطلب" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">طلباتي</h1>
      
      <div className="space-y-4">
        {orders.map((order) => {
          const statusInfo = STATUS_MAP[order.status as keyof typeof STATUS_MAP] || { label: order.status, variant: "outline" };
          const date = new Date(order.createdAt);
          
          return (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    طلب رقم #{order.id} • {format(date, "yyyy/MM/dd")}
                  </div>
                  <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">
                    {statusInfo.label}
                  </Badge>
                </div>
                <div className="text-xl font-bold text-primary" dir="ltr">
                  {order.total} د.ل
                </div>
              </CardHeader>
              
              {order.status === "stockout" && (
                <div className="bg-destructive/10 border-b border-destructive/20 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-destructive font-medium">
                    <AlertTriangle className="w-5 h-5" />
                    <span>بعض منتجات هذا الطلب لم تعد متوفرة في المخزون.</span>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button size="sm" variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleResolveStockout(order.id, "continue_without")} disabled={resolveMutation.isPending}>
                      إكمال بدون المنتج
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleResolveStockout(order.id, "cancel")} disabled={resolveMutation.isPending}>
                      إلغاء الطلب بالكامل
                    </Button>
                  </div>
                </div>
              )}
              
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4">
                  {order.items.slice(0, 4).map(item => (
                    <div key={item.id} className="w-16 h-16 bg-muted rounded-lg p-1 flex items-center justify-center relative">
                      <img src={item.productImage?.startsWith("/objects/") ? `/api/storage${item.productImage}` : item.productImage} alt={item.productName} className="w-full h-full object-contain mix-blend-multiply" />
                      {item.outOfStock && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                          <XCircle className="w-6 h-6 text-destructive" />
                        </div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center font-bold text-muted-foreground">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 p-4 border-t flex justify-between">
                <Button variant="outline" asChild>
                  <Link href={`/orders/${order.id}`}>عرض التفاصيل</Link>
                </Button>
                
                {order.status === "pending" && (
                  <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleCancel(order.id)} disabled={cancelMutation.isPending}>
                    إلغاء الطلب
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
