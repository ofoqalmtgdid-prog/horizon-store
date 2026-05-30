import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { CheckCircle2, Package, Truck, Clock } from "lucide-react";

const STATUS_MAP = {
  pending: { label: "قيد المراجعة", icon: Clock },
  preparing: { label: "قيد التجهيز", icon: Package },
  prepared: { label: "تم التجهيز", icon: CheckCircle2 },
  delivered_to_courier: { label: "تم التسليم لشركة التوصيل", icon: Truck },
  cancelled: { label: "ملغي", icon: Clock },
  stockout: { label: "نفاد المخزون", icon: Clock },
};

const TIMELINE_STEPS = ["pending", "preparing", "prepared", "delivered_to_courier"];

export default function OrderDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { data: order, isLoading } = useGetOrder(id, {
    query: { queryKey: getGetOrderQueryKey(id), enabled: !!id }
  });

  if (isLoading) return <div className="text-center py-20">جاري التحميل...</div>;
  if (!order) return <div className="text-center py-20 text-destructive">لم يتم العثور على الطلب</div>;

  const statusInfo = STATUS_MAP[order.status as keyof typeof STATUS_MAP] || STATUS_MAP.pending;
  const isCancelled = order.status === "cancelled" || order.status === "stockout";
  
  const currentStepIndex = TIMELINE_STEPS.indexOf(order.status);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/orders">طلباتي</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><span className="font-semibold">طلب #{order.id}</span></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">طلب #{order.id}</h1>
          <div className="text-muted-foreground">{format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}</div>
        </div>
        <Badge variant={isCancelled ? "destructive" : "default"} className="text-lg px-4 py-1 self-start">
          {statusInfo.label}
        </Badge>
      </div>

      {!isCancelled && (
        <Card>
          <CardContent className="p-6">
            <div className="relative flex justify-between">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 z-0" />
              <div 
                className="absolute top-1/2 right-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-500" 
                style={{ width: `${currentStepIndex >= 0 ? (currentStepIndex / (TIMELINE_STEPS.length - 1)) * 100 : 0}%` }} 
              />
              
              {TIMELINE_STEPS.map((step, idx) => {
                const StepIcon = STATUS_MAP[step as keyof typeof STATUS_MAP].icon;
                const isCompleted = currentStepIndex >= idx;
                const isActive = currentStepIndex === idx;
                
                return (
                  <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    } ${isActive ? "ring-4 ring-primary/20" : ""}`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                      {STATUS_MAP[step as keyof typeof STATUS_MAP].label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>المنتجات</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-0">
              {order.items.map(item => (
                <div key={item.id} className="flex gap-4 p-4 border-b last:border-0">
                  <div className="w-20 h-20 bg-muted rounded p-2 flex-shrink-0 relative">
                    <img src={item.productImage?.startsWith("/objects/") ? `/api/storage${item.productImage}` : item.productImage} alt={item.productName} className={`w-full h-full object-contain mix-blend-multiply ${item.outOfStock ? 'opacity-50 grayscale' : ''}`} />
                    {item.outOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Badge variant="destructive" className="text-[10px]">غير متوفر</Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold line-clamp-2">{item.productName}</div>
                    {item.selectedColor && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-full border border-border flex-shrink-0"
                          style={{ backgroundColor: item.selectedColor }}
                        />
                        <span className="text-xs text-muted-foreground">اللون المختار</span>
                      </div>
                    )}
                    <div className="text-muted-foreground mt-1">الكمية: {item.quantity}</div>
                  </div>
                  <div className="font-bold text-primary" dir="ltr">
                    {item.price * item.quantity} د.ل
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>تفاصيل التوصيل</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">المدينة</div>
                <div className="font-medium">{order.region}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">العنوان</div>
                <div className="font-medium">{order.address}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">رقم الهاتف</div>
                <div className="font-medium" dir="ltr">{order.phone}</div>
              </div>
              {order.backupPhone && (
                <div>
                  <div className="text-muted-foreground mb-1">هاتف احتياطي</div>
                  <div className="font-medium" dir="ltr">{order.backupPhone}</div>
                </div>
              )}
              {order.notes && (
                <div>
                  <div className="text-muted-foreground mb-1">ملاحظات</div>
                  <div className="font-medium">{order.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>الملخص</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>الإجمالي</span>
                <span className="text-primary" dir="ltr">{order.total} د.ل</span>
              </div>
              <div className="text-sm text-center text-muted-foreground pt-4">
                الدفع عند الاستلام
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
