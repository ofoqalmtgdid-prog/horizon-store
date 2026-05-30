import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminCreateProduct,
  useAdminUpdateProduct,
  useListCategories,
  getAdminListProductsQueryKey,
  getGetProductQueryKey,
  type Product,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

interface ColorEntry { id?: number; name: string; hexCode: string; stock: number; enabled: boolean; }

function imageUrlFor(p: string | null | undefined): string {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  if (p.startsWith("/objects/")) return `/api/storage${p}`;
  return p;
}

function ImageUploadSlot({
  label, value, onChange
}: { label: string; value: string; onChange: (v: string) => void }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const preview = imageUrlFor(value);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ variant: "destructive", title: "الحجم كبير جداً (أقصى 10MB)" }); return; }
    setUploading(true);
    try {
      const r = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!r.ok) throw new Error("فشل طلب الرفع");
      const { uploadURL, objectPath } = await r.json();
      const put = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("فشل رفع الملف");
      onChange(objectPath);
      toast({ title: "تم رفع الصورة" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally { setUploading(false); e.target.value = ""; }
  };

  const inputId = `img-upload-${label.replace(/\s/g, "")}`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-20 h-20 bg-muted rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-contain mix-blend-multiply" />
        ) : (
          <ImagePlus className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <input type="file" accept="image/*" id={inputId} className="hidden" onChange={handleFile} disabled={uploading} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs gap-1 h-7 px-2"
        onClick={() => document.getElementById(inputId)?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        {label}
      </Button>
    </div>
  );
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const isEdit = !!product;
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: categories } = useListCategories();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [image2, setImage2] = useState("");
  const [image3, setImage3] = useState("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [colorsEnabled, setColorsEnabled] = useState(false);
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [newColor, setNewColor] = useState<ColorEntry>({ name: "", hexCode: "#000000", stock: 10, enabled: true });

  const createMutation = useAdminCreateProduct();
  const updateMutation = useAdminUpdateProduct();

  const token = localStorage.getItem("horizonStoreToken");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-session-token": token ?? "" };

  useEffect(() => {
    if (!open) return;
    if (product) {
      setName(product.name);
      setDescription(product.description);
      setPrice(String(product.price));
      setStock(String(product.stock));
      setImageUrl(product.imageUrl);
      setImage2((product as any).image2 || "");
      setImage3((product as any).image3 || "");
      setSubcategoryId(String(product.subcategoryId));
      setColorsEnabled(!!(product as any).colorsEnabled);
      if (isEdit && product.id) {
        fetch(`/api/admin/products/${product.id}/colors`, { headers })
          .then((r) => r.json())
          .then(setColors)
          .catch(() => setColors([]));
      }
    } else {
      setName(""); setDescription(""); setPrice(""); setStock("");
      setImageUrl(""); setImage2(""); setImage3("");
      setSubcategoryId(""); setColorsEnabled(false); setColors([]);
    }
    setNewColor({ name: "", hexCode: "#000000", stock: 0, enabled: true });
  }, [product, open]);

  const addColor = () => {
    if (!newColor.name) return;
    setColors((c) => [...c, { ...newColor }]);
    setNewColor({ name: "", hexCode: "#000000", stock: 0, enabled: true });
  };

  const removeColor = (i: number) => setColors((c) => c.filter((_, idx) => idx !== i));
  const toggleColor = (i: number) => setColors((c) => c.map((col, idx) => idx === i ? { ...col, enabled: !col.enabled } : col));

  const handleSubmit = async () => {
    if (!name || !description || !price || !stock || !imageUrl || !subcategoryId) {
      toast({ variant: "destructive", title: "بيانات ناقصة" }); return;
    }
    try {
      let savedId = product?.id;
      if (isEdit && product) {
        await updateMutation.mutateAsync({
          id: product.id,
          data: { name, description, price: Number(price), stock: Number(stock), imageUrl, subcategoryId: Number(subcategoryId), image2: image2 || undefined, image3: image3 || undefined, colorsEnabled } as any,
        });
        toast({ title: "تم تحديث المنتج" });
      } else {
        const created: any = await createMutation.mutateAsync({
          data: { name, description, price: Number(price), stock: Number(stock), imageUrl, subcategoryId: Number(subcategoryId), image2: image2 || undefined, image3: image3 || undefined, colorsEnabled } as any,
        });
        savedId = created?.id;
        toast({ title: "تم إضافة المنتج" });
      }

      if (savedId && colorsEnabled) {
        const colorsRes = await fetch(`/api/admin/products/${savedId}/colors`, {
          method: "POST",
          headers,
          body: JSON.stringify({ colors: colors.map((c, i) => ({ ...c, sortOrder: i })) }),
        });
        if (!colorsRes.ok) {
          const errData = await colorsRes.json().catch(() => ({}));
          throw new Error(errData.message || "فشل حفظ الألوان");
        }
      }

      qc.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
      if (savedId) {
        qc.invalidateQueries({ queryKey: getGetProductQueryKey(savedId) });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg flex flex-col p-4 sm:p-6 gap-0">
        <DialogHeader className="pb-3 border-b mb-3 flex-shrink-0">
          <DialogTitle>{isEdit ? "تعديل منتج" : "إضافة منتج جديد"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 flex-1 overflow-y-auto">
          {/* Images */}
          <div>
            <Label className="mb-2 block">صور المنتج (حتى 3 صور)</Label>
            <div className="flex gap-4 flex-wrap">
              <ImageUploadSlot label="الصورة الرئيسية" value={imageUrl} onChange={setImageUrl} />
              <ImageUploadSlot label="صورة 2" value={image2} onChange={setImage2} />
              <ImageUploadSlot label="صورة 3" value={image3} onChange={setImage3} />
            </div>
          </div>

          {/* Name */}
          <div>
            <Label className="mb-2 block">اسم المنتج</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Description */}
          <div>
            <Label className="mb-2 block">الوصف</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">السعر (د.ل)</Label>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">المخزون</Label>
              <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>

          {/* Subcategory */}
          <div>
            <Label className="mb-2 block">القسم الفرعي</Label>
            <Select value={subcategoryId} onValueChange={setSubcategoryId}>
              <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectScrollUpButton />
                {categories?.map((cat) => (
                  (cat as any).subcategories?.length > 0 && (
                    <SelectGroup key={cat.id}>
                      <SelectLabel className="text-primary font-bold text-xs py-1">{cat.name}</SelectLabel>
                      {(cat as any).subcategories.map((sub: any) => (
                        <SelectItem key={sub.id} value={String(sub.id)} className="pr-4">
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )
                ))}
                <SelectScrollDownButton />
              </SelectContent>
            </Select>
          </div>

          {/* Colors toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="colors-toggle" className="cursor-pointer font-medium flex-1">تفعيل خيار الألوان لهذا المنتج</Label>
            <Switch checked={colorsEnabled} onCheckedChange={setColorsEnabled} id="colors-toggle" className="flex-shrink-0" />
          </div>

          {/* Colors manager */}
          {colorsEnabled && (
            <div className="space-y-3 border rounded-xl p-4">
              <p className="text-sm font-semibold">إدارة ألوان المنتج</p>

              {/* Existing colors */}
              {colors.length > 0 && (
                <div className="space-y-2">
                  {colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-full border flex-shrink-0" style={{ backgroundColor: c.hexCode }} />
                      <span className="font-medium flex-1">{c.name}</span>
                      <span className="text-muted-foreground text-xs">مخزون: {c.stock}</span>
                      <Switch checked={c.enabled} onCheckedChange={() => toggleColor(i)} />
                      <button className="text-destructive hover:text-destructive/80" onClick={() => removeColor(i)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new color */}
              <div className="flex items-end gap-2 pt-2 border-t flex-wrap">
                <div>
                  <Label className="text-xs mb-1 block">اللون</Label>
                  <input
                    type="color"
                    value={newColor.hexCode}
                    onChange={(e) => setNewColor((c) => ({ ...c, hexCode: e.target.value }))}
                    className="w-10 h-9 rounded cursor-pointer border border-input"
                  />
                </div>
                <div className="flex-1 min-w-[80px]">
                  <Label className="text-xs mb-1 block">الاسم</Label>
                  <Input
                    value={newColor.name}
                    onChange={(e) => setNewColor((c) => ({ ...c, name: e.target.value }))}
                    placeholder="مثال: أحمر"
                    className="h-9"
                  />
                </div>
                <div className="w-20">
                  <Label className="text-xs mb-1 block">المخزون</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newColor.stock}
                    onChange={(e) => setNewColor((c) => ({ ...c, stock: Number(e.target.value) }))}
                    className="h-9"
                  />
                </div>
                <Button type="button" size="sm" className="h-9 gap-1" onClick={addColor} disabled={!newColor.name}>
                  <Plus className="w-4 h-4" />
                  إضافة
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-3 border-t flex-shrink-0 gap-2 flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">إلغاء</Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex-1 sm:flex-none"
          >
            {createMutation.isPending || updateMutation.isPending
              ? "جاري الحفظ..."
              : isEdit ? "حفظ التعديلات" : "إضافة المنتج"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
