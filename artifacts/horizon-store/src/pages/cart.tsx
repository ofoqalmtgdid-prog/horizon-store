import { useGetCart, useUpdateCartItem, useDeleteCartItem, getGetCartQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useGetCart();
  const updateMutation = useUpdateCartItem();
  const deleteMutation = useDeleteCartItem();

  if (isLoading) return <div className="text-center py-20">جاري التحميل...</div>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
          <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">سلة المشتريات فارغة</h2>
        <p className="text-muted-foreground max-w-md">
          لم تقم بإضافة أي منتجات إلى سلة المشتريات بعد. اكتشف منتجاتنا وأضف ما يعجبك!
        </p>
        <Button asChild size="lg">
          <Link href="/">تصفح المنتجات</Link>
        </Button>
      </div>
    );
  }

  const handleUpdateQuantity = async (productId: number, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity < 1) return;
    
    try {
      await updateMutation.mutateAsync({ productId, data: { quantity: newQuantity } });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  };

  const handleDelete = async (productId: number) => {
    try {
      await deleteMutation.mutateAsync({ productId });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "تم حذف المنتج من السلة" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">سلة المشتريات</h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <Card key={item.productId} className="overflow-hidden">
              <CardContent className="p-4 flex gap-4 items-center">
                <Link href={`/product/${item.productId}`}>
                  <a className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center p-2">
                    <img src={item.product.imageUrl?.startsWith("/objects/") ? `/api/storage${item.product.imageUrl}` : item.product.imageUrl} alt={item.product.name} className="w-full h-full object-contain mix-blend-multiply" />
                  </a>
                </Link>
                
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.productId}`}>
                    <a className="font-semibold hover:text-primary transition-colors line-clamp-2">
                      {item.product.name}
                    </a>
                  </Link>
                  {(item as any).selectedColor && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className="inline-block w-3.5 h-3.5 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: (item as any).selectedColor }}
                      />
                      <span className="text-xs text-muted-foreground">اللون المختار</span>
                    </div>
                  )}
                  <div className="text-primary font-bold mt-1" dir="ltr">{item.product.price} د.ل</div>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(item.productId)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-2 bg-muted rounded-full p-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full"
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity, 1)}
                      disabled={updateMutation.isPending}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full"
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity, -1)}
                      disabled={item.quantity <= 1 || updateMutation.isPending}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div>
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-bold text-lg border-b pb-4">ملخص الطلب</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">عدد المنتجات</span>
                  <span className="font-medium">{cart.count}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-4 border-t">
                  <span>الإجمالي</span>
                  <span className="text-primary" dir="ltr">{cart.total} د.ل</span>
                </div>
              </div>
              
              <Button 
                className="w-full text-lg h-12" 
                size="lg"
                onClick={() => setLocation("/checkout")}
              >
                إكمال عملية الشراء
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
