import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useGetCart, usePlaceOrder, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Truck } from "lucide-react";

interface DeliveryRegion {
  id: number;
  name: string;
  price: number;
  enabled: boolean;
}

const checkoutSchema = z.object({
  region: z.string().min(1, "يرجى اختيار المدينة"),
  address: z.string().min(5, "يرجى إدخال العنوان بالتفصيل"),
  phone: z.string().min(10, "رقم الهاتف غير صالح"),
  backupPhone: z.string().min(10, "رقم الهاتف الاحتياطي غير صالح"),
  notes: z.string().optional(),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [regions, setRegions] = useState<DeliveryRegion[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const { data: cart, isLoading: isCartLoading } = useGetCart();
  const placeOrder = usePlaceOrder();

  useEffect(() => {
    fetch("/api/delivery-regions")
      .then((r) => r.json())
      .then((data: DeliveryRegion[]) => setRegions(data.filter((r) => r.enabled)))
      .catch(() => {});
  }, []);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      region: user?.region || "",
      address: "",
      phone: user?.phone || "",
      backupPhone: "",
      notes: "",
    },
  });

  const selectedRegion = form.watch("region");

  useEffect(() => {
    const found = regions.find((r) => r.name === selectedRegion);
    setDeliveryFee(found?.price ?? 0);
  }, [selectedRegion, regions]);

  if (isCartLoading) return <div className="text-center py-20">جاري التحميل...</div>;
  if (!cart || cart.items.length === 0) {
    setLocation("/cart");
    return null;
  }

  const itemsTotal = cart.total;
  const grandTotal = itemsTotal + deliveryFee;

  const onSubmit = async (values: CheckoutValues) => {
    try {
      await placeOrder.mutateAsync({ data: { ...values, deliveryFee } as any });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "تم تأكيد الطلب بنجاح", description: "سنتواصل معك قريباً لتأكيد التوصيل" });
      setLocation("/orders");
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ", description: error.message || "حدث خطأ أثناء إتمام الطلب" });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">إتمام الشراء</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>معلومات التوصيل</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المدينة</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر مدينتك" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {regions.length > 0
                                ? regions.map((r) => (
                                    <SelectItem key={r.id} value={r.name}>
                                      <span className="flex items-center gap-2">
                                        {r.name}
                                        <span className="text-xs text-muted-foreground" dir="ltr">
                                          ({r.price} د.ل توصيل)
                                        </span>
                                      </span>
                                    </SelectItem>
                                  ))
                                : ["طرابلس","بنغازي","مصراتة","الزاوية","سرت","البيضاء","طبرق","سبها"].map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العنوان التفصيلي</FormLabel>
                          <FormControl>
                            <Input placeholder="مثال: حي الأندلس، شارع الظل" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الهاتف</FormLabel>
                          <FormControl>
                            <Input dir="ltr" className="text-right" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="backupPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم هاتف احتياطي</FormLabel>
                          <FormControl>
                            <Input dir="ltr" className="text-right" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="أي تفاصيل أخرى..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold">طريقة الدفع</div>
                      <div className="text-sm text-muted-foreground">الدفع عند الاستلام</div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full text-lg h-12" disabled={placeOrder.isPending}>
                    {placeOrder.isPending ? "جاري تأكيد الطلب..." : "تأكيد الطلب"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader className="border-b pb-4">
              <CardTitle>ملخص الطلب</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-5 space-y-3 max-h-[280px] overflow-auto">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex gap-3 text-sm">
                    <div className="w-10 h-10 bg-muted rounded p-1 flex-shrink-0">
                      <img
                        src={item.product.imageUrl?.startsWith("/objects/") ? `/api/storage${item.product.imageUrl}` : item.product.imageUrl}
                        alt=""
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium line-clamp-1">{item.product.name}</div>
                      <div className="text-muted-foreground text-xs">× {item.quantity}</div>
                    </div>
                    <div className="font-bold text-primary text-sm whitespace-nowrap" dir="ltr">
                      {item.product.price * item.quantity} د.ل
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-5 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المجموع</span>
                  <span dir="ltr">{itemsTotal} د.ل</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Truck className="w-3.5 h-3.5" />
                      رسوم التوصيل
                    </span>
                    <span className="text-primary" dir="ltr">+{deliveryFee} د.ل</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>الإجمالي</span>
                  <span className="text-primary" dir="ltr">{grandTotal} د.ل</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
