import {
  useAdminSummary,
  useAdminListOrders,
  useAdminUpdateOrderStatus,
  useAdminListProducts,
  useAdminDeleteProduct,
  useAdminListCategories,
  useAdminCreateCategory,
  useAdminUpdateCategory,
  useAdminDeleteCategory,
  getAdminSummaryQueryKey,
  getAdminListOrdersQueryKey,
  getAdminListProductsQueryKey,
  getAdminListCategoriesQueryKey,
  type Product,
} from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Package, Users, DollarSign, AlertCircle, Plus, Pencil, Trash2, Printer, MapPin, Info, Search, Phone, X, ShoppingBag, ChevronUp, CheckCircle, XCircle, Layers, Palette, Globe, Upload, Store } from "lucide-react";
import { ProductFormDialog } from "@/components/product-form-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function imageUrlFor(p: string) {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  if (p.startsWith("/objects/")) return `/api/storage${p}`;
  return p;
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

async function loadAboutData(): Promise<Record<string, unknown>> {
  try {
    const d = await fetch("/api/about").then(r => r.json());
    if (d?.content && typeof d.content === "string") {
      try { return JSON.parse(d.content); } catch { return d; }
    }
    return d ?? {};
  } catch { return {}; }
}

async function saveAboutMerge(patch: Record<string, unknown>, authHeaders: Record<string, string>): Promise<void> {
  const current = await loadAboutData();
  const merged = { ...current, ...patch };
  const r = await fetch("/api/admin/about", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(merged),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "فشل الحفظ");
}

const ORDER_STATUS_MAP: Record<string, string> = {
  pending: "قيد المراجعة",
  preparing: "قيد التجهيز",
  prepared: "تم التجهيز",
  delivered_to_courier: "لدى التوصيل",
  payment_received: "تم الاستلام والدفع",
  cancelled: "ملغي",
};

function printOrder(order: any) {
  const w = window.open("", "_blank", "width=700,height=900");
  if (!w) return;
  const items = (order.items ?? [])
    .map(
      (it: any) =>
        `<tr><td>${it.productName ?? it.productId}${it.selectedColor ? ` <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${it.selectedColor};border:1px solid #ccc;vertical-align:middle;margin-right:4px"></span>` : ""}</td><td>${it.quantity}</td><td>${it.price ?? 0} د.ل</td><td>${(it.quantity * (it.price ?? 0)).toFixed(2)} د.ل</td></tr>`
    )
    .join("");
  w.document.write(`
    <html dir="rtl"><head><meta charset="utf-8"><title>طلب #${order.id}</title>
    <style>body{font-family:Arial;padding:24px;direction:rtl}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:right}h2{margin-bottom:4px}.info{margin:12px 0}</style>
    </head><body>
    <h2>متجر الأفق المتجدد</h2>
    <p class="info">طلب رقم: <strong>#${order.id}</strong> — ${format(new Date(order.createdAt), "yyyy/MM/dd HH:mm")}</p>
    <p class="info">العميل: ${order.userName ?? "—"} | الهاتف: ${order.phone ?? "—"}</p>
    <p class="info">المنطقة: ${order.region ?? "—"} | العنوان: ${order.address ?? "—"}</p>
    <table><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${items}</tbody></table>
    <p style="margin-top:12px;font-weight:bold;">المجموع: ${order.total} د.ل${order.deliveryFee ? ` | التوصيل: ${order.deliveryFee} د.ل` : ""}</p>
    <script>window.print();</script></body></html>
  `);
  w.document.close();
}

interface DeliveryRegion { id: number; name: string; price: number; enabled: boolean; sortOrder?: number; }

function DeliveryRegionsTab() {
  const { toast } = useToast();
  const [regions, setRegions] = useState<DeliveryRegion[]>([]);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("horizonStoreToken");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-session-token": token ?? "" };

  const load = () => {
    setLoading(true);
    fetch("/api/admin/delivery-regions", { headers })
      .then((r) => r.json())
      .then(setRegions)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const addRegion = async () => {
    if (!newName.trim() || !newPrice) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/delivery-regions", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newName.trim(), price: Number(newPrice), enabled: true }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      toast({ title: "تمت الإضافة" });
      setNewName(""); setNewPrice("");
      load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally { setSaving(false); }
  };

  const updateRegion = async (id: number, patch: Partial<DeliveryRegion>) => {
    try {
      await fetch(`/api/admin/delivery-regions/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(patch),
      });
      load();
    } catch {}
  };

  const deleteRegion = async (id: number) => {
    if (!confirm("حذف المنطقة؟")) return;
    await fetch(`/api/admin/delivery-regions/${id}`, { method: "DELETE", headers });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> مناطق التوصيل وأسعارها</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="اسم المدينة" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
          <Input placeholder="السعر" type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-24" dir="ltr" />
          <Button onClick={addRegion} disabled={saving || !newName.trim() || !newPrice}><Plus className="w-4 h-4" /></Button>
        </div>
        {loading ? <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المدينة</TableHead>
                <TableHead>سعر التوصيل</TableHead>
                <TableHead>مفعّل</TableHead>
                <TableHead className="text-left">حذف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className="w-20 h-7 text-sm"
                        defaultValue={r.price}
                        onBlur={(e) => updateRegion(r.id, { price: Number(e.target.value) })}
                        dir="ltr"
                      />
                      <span className="text-xs text-muted-foreground">د.ل</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={r.enabled} onCheckedChange={(v) => updateRegion(r.id, { enabled: v })} />
                  </TableCell>
                  <TableCell className="text-left">
                    <Button size="icon" variant="ghost" onClick={() => deleteRegion(r.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Categories Tab
// ─────────────────────────────────────────────────────────────────────────────
// Category form fields — defined OUTSIDE CategoriesTab to prevent focus loss
// ─────────────────────────────────────────────────────────────────────────────
type CatForm = { name: string; slug: string; icon: string; imageUrl: string; sortOrder: string };

interface CategoryFormFieldsProps {
  form: CatForm;
  setForm: React.Dispatch<React.SetStateAction<CatForm>>;
  uploadingKey: string | null;
  uploadRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  compact?: boolean;
}

function CategoryFormFields({ form, setForm, uploadingKey, uploadRef, onFileChange, compact = false }: CategoryFormFieldsProps) {
  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]/g, "");
  const imgPrev = (p: string) => p?.startsWith("/objects/") ? `/api/storage${p}` : (p || "");
  return (
    <>
      <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"} gap-${compact ? "2" : "3"}`}>
        <div className="space-y-1">
          <Label className="text-xs">اسم القسم *</Label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: compact ? f.slug : autoSlug(e.target.value) }))}
            placeholder="مثال: أجهزة كمبيوتر"
            className={compact ? "h-8 text-sm" : ""}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">المعرف (Slug)</Label>
          <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="computers" dir="ltr" className={compact ? "h-8 text-sm" : ""} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">أيقونة (إيموجي)</Label>
          <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="💻" className={`text-xl ${compact ? "h-8 text-sm" : ""}`} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">الترتيب</Label>
          <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} dir="ltr" className={compact ? "h-8 text-sm" : ""} />
        </div>
      </div>
      <div className="space-y-1 mt-2">
        <Label className="text-xs">صورة القسم</Label>
        <div className="flex items-center gap-3">
          <div
            className="bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors flex-shrink-0"
            style={{ width: compact ? 80 : 112, height: compact ? 48 : 72 }}
            onClick={() => uploadRef.current?.click()}
          >
            {form.imageUrl ? (
              <img src={imgPrev(form.imageUrl)} alt="" className="w-full h-full object-cover" />
            ) : uploadingKey === "imageUrl" ? (
              <span className="text-[10px] text-muted-foreground">رفع...</span>
            ) : (
              <Upload className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-muted-foreground`} />
            )}
          </div>
          {form.imageUrl && (
            <button type="button" onClick={() => setForm(f => ({ ...f, imageUrl: "" }))} className="text-xs text-destructive hover:underline">حذف الصورة</button>
          )}
        </div>
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </div>
    </>
  );
}

function CategoriesTab() {
  const { data: categories } = useAdminListCategories();
  const createMutation = useAdminCreateCategory();
  const updateMutation = useAdminUpdateCategory();
  const deleteMutation = useAdminDeleteCategory();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CatForm>({ name: "", slug: "", icon: "", imageUrl: "", sortOrder: "0" });
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem("horizonStoreToken");
  const authHeaders = { Authorization: `Bearer ${token ?? ""}`, "x-session-token": token ?? "" };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]/g, "");

  const uploadImage = async (file: File): Promise<string> => {
    const r = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    if (!r.ok) throw new Error("فشل طلب الرفع");
    const { uploadURL, objectPath } = await r.json();
    const put = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!put.ok) throw new Error("فشل رفع الصورة");
    return objectPath;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey("imageUrl");
    try {
      const path = await uploadImage(file);
      setForm(f => ({ ...f, imageUrl: path }));
      toast({ title: "تم رفع الصورة" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally { setUploadingKey(null); e.target.value = ""; }
  };

  const reset = () => setForm({ name: "", slug: "", icon: "", imageUrl: "", sortOrder: "0" });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      await createMutation.mutateAsync({ data: {
        name: form.name, slug: form.slug || autoSlug(form.name),
        ...(form.icon ? { icon: form.icon } : {}),
        ...(form.imageUrl ? { imageUrl: form.imageUrl } : {}),
        sortOrder: Number(form.sortOrder) || 0,
      } });
      qc.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });
      toast({ title: "تم إنشاء القسم" });
      reset(); setShowAdd(false);
    } catch (e: any) { toast({ variant: "destructive", title: "خطأ", description: e.message }); }
  };

  const handleUpdate = async (id: number) => {
    try {
      await updateMutation.mutateAsync({ id, data: {
        name: form.name, slug: form.slug,
        ...(form.icon !== undefined ? { icon: form.icon } : {}),
        imageUrl: form.imageUrl || undefined,
        sortOrder: Number(form.sortOrder) || 0,
      } });
      qc.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });
      toast({ title: "تم تحديث القسم" });
      setEditingId(null); reset();
    } catch (e: any) { toast({ variant: "destructive", title: "خطأ", description: e.message }); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`حذف قسم "${name}"؟ سيُحذف كل ما يتبعه من أقسام فرعية ومنتجات!`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });
      toast({ title: "تم حذف القسم" });
    } catch (e: any) { toast({ variant: "destructive", title: "خطأ", description: e.message }); }
  };

  const startEdit = (cat: any) => {
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon ?? "", imageUrl: cat.imageUrl ?? "", sortOrder: String(cat.sortOrder ?? 0) });
    setEditingId(cat.id); setShowAdd(false);
  };

  const imgPrev = (p: string) => p?.startsWith("/objects/") ? `/api/storage${p}` : (p || "");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4" /> الأقسام ({categories?.length ?? 0})
          </CardTitle>
          <Button size="sm" className="gap-1" onClick={() => { setShowAdd(!showAdd); setEditingId(null); reset(); }}>
            <Plus className="w-3.5 h-3.5" />
            {showAdd ? "إلغاء" : "إضافة قسم جديد"}
          </Button>
        </CardHeader>
        {showAdd && (
          <CardContent className="pt-0 pb-4 border-t">
            <div className="pt-4 space-y-3">
              <CategoryFormFields form={form} setForm={setForm} uploadingKey={uploadingKey} uploadRef={uploadRef} onFileChange={handleFile} />
              <div className="flex gap-2 pt-1">
                <Button onClick={handleCreate} disabled={!form.name.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "جاري الإضافة..." : "إضافة القسم"}
                </Button>
                <Button variant="outline" onClick={() => { setShowAdd(false); reset(); }}>إلغاء</Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(categories ?? []).map((cat: any) => (
          <Card key={cat.id} className={`transition-all ${editingId === cat.id ? "ring-2 ring-primary" : ""}`}>
            <CardContent className="p-3">
              {editingId === cat.id ? (
                <div className="space-y-3">
                  <CategoryFormFields form={form} setForm={setForm} uploadingKey={uploadingKey} uploadRef={uploadRef} onFileChange={handleFile} compact />
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => handleUpdate(cat.id)} disabled={updateMutation.isPending} className="flex-1">
                      {updateMutation.isPending ? "حفظ..." : "حفظ التعديل"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); reset(); }}>إلغاء</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border border-border/50">
                    {cat.imageUrl ? (
                      <img src={imgPrev(cat.imageUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{cat.icon || "📦"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{cat.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">{cat.slug}</p>
                    {cat.icon && !cat.imageUrl && <p className="text-base mt-0.5">{cat.icon}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => startEdit(cat)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => handleDelete(cat.id, cat.name)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Settings Tab
// ─────────────────────────────────────────────────────────────────────────────
function StoreSettingsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    storeName: "", storeSubtitle: "", heroImageUrl: "",
    primaryColor: "#f97316", logoUrl: "", faviconUrl: "",
    whatsapp1: "", whatsapp2: "",
  });
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const heroRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem("horizonStoreToken");
  const authHeaders = { Authorization: `Bearer ${token ?? ""}`, "x-session-token": token ?? "" };

  useEffect(() => {
    loadAboutData().then(d => {
      setForm({
        storeName: (d.storeName as string) ?? "الأفق المتجدد",
        storeSubtitle: (d.storeSubtitle as string) ?? "وجهتك الأولى بأسعار تنافسية",
        heroImageUrl: (d.heroImageUrl as string) ?? "",
        primaryColor: (d.primaryColor as string) ?? "#f97316",
        logoUrl: (d.logoUrl as string) ?? "",
        faviconUrl: (d.faviconUrl as string) ?? "",
        whatsapp1: (d.whatsapp1 as string) ?? "",
        whatsapp2: (d.whatsapp2 as string) ?? "",
      });
    }).finally(() => setLoading(false));
  }, []);

  const uploadImage = async (file: File): Promise<string> => {
    const r = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    if (!r.ok) throw new Error("فشل طلب الرفع");
    const { uploadURL, objectPath } = await r.json();
    await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    return objectPath;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey(key);
    try {
      const path = await uploadImage(file);
      setForm(f => ({ ...f, [key]: path }));
      toast({ title: "تم رفع الصورة" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally { setUploadingKey(null); e.target.value = ""; }
  };

  const imgPrev = (p: string) => p?.startsWith("/objects/") ? `/api/storage${p}` : (p || "");

  const applyColorNow = (hex: string) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    const hsl = hexToHsl(hex);
    document.documentElement.style.setProperty("--primary", hsl);
    document.documentElement.style.setProperty("--ring", hsl);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveAboutMerge(form as unknown as Record<string, unknown>, authHeaders);
      applyColorNow(form.primaryColor);
      // Update favicon live
      if (form.faviconUrl) {
        let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
        link.href = imgPrev(form.faviconUrl);
      }
      toast({ title: "✓ تم حفظ إعدادات المتجر" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally { setSaving(false); }
  };

  if (loading) return <Card><CardContent className="py-12 text-center text-muted-foreground">جاري التحميل...</CardContent></Card>;

  return (
    <div className="space-y-4">
      {/* Identity */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Store className="w-4 h-4" /> اسم المتجر والشعار</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1.5 block">اسم المتجر</Label>
            <Input value={form.storeName} onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))} placeholder="اسم متجرك" />
          </div>
          <div>
            <Label className="mb-1.5 block">السلوجان / الوصف القصير</Label>
            <Input value={form.storeSubtitle} onChange={e => setForm(f => ({ ...f, storeSubtitle: e.target.value }))} placeholder="وجهتك الأولى بأسعار تنافسية" />
          </div>
          <div>
            <Label className="mb-1.5 block">أرقام واتساب</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input value={form.whatsapp1} onChange={e => setForm(f => ({ ...f, whatsapp1: e.target.value }))} placeholder="218925000000" dir="ltr" />
              <Input value={form.whatsapp2} onChange={e => setForm(f => ({ ...f, whatsapp2: e.target.value }))} placeholder="218925000000 (اختياري)" dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> اللون الرئيسي</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="color"
              value={form.primaryColor}
              onChange={e => {
                setForm(f => ({ ...f, primaryColor: e.target.value }));
                applyColorNow(e.target.value);
              }}
              className="w-14 h-10 rounded-lg cursor-pointer border-2 border-border p-0.5 bg-transparent"
            />
            <Input
              value={form.primaryColor}
              onChange={e => {
                setForm(f => ({ ...f, primaryColor: e.target.value }));
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) applyColorNow(e.target.value);
              }}
              className="w-32 font-mono text-sm" dir="ltr" placeholder="#f97316"
            />
            <div className="w-10 h-10 rounded-xl border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: form.primaryColor }} />
            <p className="text-xs text-muted-foreground">اللون يطبَّق فوراً على المتجر</p>
          </div>
          {/* Preset colors */}
          <div className="flex flex-wrap gap-2 pt-1">
            {["#f97316","#3b82f6","#10b981","#8b5cf6","#ef4444","#f59e0b","#06b6d4","#ec4899","#14b8a6","#6366f1"].map(c => (
              <button
                key={c}
                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${form.primaryColor === c ? "border-foreground scale-110" : "border-border"}`}
                style={{ backgroundColor: c }}
                onClick={() => { setForm(f => ({ ...f, primaryColor: c })); applyColorNow(c); }}
                title={c}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4" /> الصور والأيقونات</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {/* Hero */}
          <div>
            <Label className="mb-2 block font-medium">صورة البانر الرئيسي</Label>
            <div
              className="relative w-full h-32 bg-muted rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
              onClick={() => heroRef.current?.click()}
            >
              {form.heroImageUrl ? (
                <>
                  <img src={imgPrev(form.heroImageUrl)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : uploadingKey === "heroImageUrl" ? (
                <span className="text-muted-foreground text-sm">جاري الرفع...</span>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Upload className="w-7 h-7 mx-auto mb-1" />
                  <p className="text-sm font-medium">رفع صورة البانر</p>
                  <p className="text-xs">1200×400 أو أكبر</p>
                </div>
              )}
            </div>
            {form.heroImageUrl && (
              <button onClick={() => setForm(f => ({ ...f, heroImageUrl: "" }))} className="text-xs text-destructive hover:underline mt-1.5">حذف الصورة</button>
            )}
            <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "heroImageUrl")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Logo */}
            <div>
              <Label className="mb-2 block font-medium">شعار المتجر (Logo)</Label>
              <div
                className="w-full h-24 bg-muted rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
                onClick={() => logoRef.current?.click()}
              >
                {form.logoUrl ? (
                  <img src={imgPrev(form.logoUrl)} alt="" className="w-full h-full object-contain p-2" />
                ) : uploadingKey === "logoUrl" ? (
                  <span className="text-xs text-muted-foreground">رفع...</span>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Store className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-xs">Logo</span>
                  </div>
                )}
              </div>
              {form.logoUrl && (
                <button onClick={() => setForm(f => ({ ...f, logoUrl: "" }))} className="text-xs text-destructive hover:underline mt-1">حذف</button>
              )}
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "logoUrl")} />
            </div>

            {/* Favicon */}
            <div>
              <Label className="mb-2 block font-medium">أيقونة التبويب (Favicon)</Label>
              <div
                className="w-full h-24 bg-muted rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
                onClick={() => faviconRef.current?.click()}
              >
                {form.faviconUrl ? (
                  <img src={imgPrev(form.faviconUrl)} alt="" className="w-full h-full object-contain p-3" />
                ) : uploadingKey === "faviconUrl" ? (
                  <span className="text-xs text-muted-foreground">رفع...</span>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Globe className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-xs">Favicon</span>
                  </div>
                )}
              </div>
              {form.faviconUrl && (
                <button onClick={() => setForm(f => ({ ...f, faviconUrl: "" }))} className="text-xs text-destructive hover:underline mt-1">حذف</button>
              )}
              <input ref={faviconRef} type="file" accept="image/*,.ico" className="hidden" onChange={e => handleFileUpload(e, "faviconUrl")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-4">
        <Button onClick={save} disabled={saving} size="lg" className="gap-2 min-w-[140px]">
          {saving ? "جاري الحفظ..." : "حفظ جميع الإعدادات"}
        </Button>
      </div>
    </div>
  );
}

interface AboutFormData {
  description: string;
  managerName: string;
  foundedYear: string;
  socialLinks: { facebook: string; instagram: string; tiktok: string };
  branches: { name: string; address: string; phone: string; imageUrl?: string; locationUrl?: string }[];
}

function BranchImageUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = value?.startsWith("/objects/") ? `/api/storage${value}` : (value || "");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ variant: "destructive", title: "الحجم كبير جداً (أقصى 10MB)" }); return; }
    setUploading(true);
    try {
      const token = localStorage.getItem("horizonStoreToken");
      const r = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-session-token": token ?? "",
        },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        throw new Error(errData.message || "فشل طلب الرفع");
      }
      const { uploadURL, objectPath } = await r.json();
      const put = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("فشل رفع الصورة");
      onChange(objectPath);
      toast({ title: "تم رفع صورة الفرع" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <div
        className="w-20 h-14 bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-primary transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <Plus className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          {uploading ? "جاري الرفع..." : preview ? "تغيير الصورة" : "رفع صورة الفرع"}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="mr-2 text-xs text-destructive hover:underline"
          >
            حذف
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function AboutTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<Set<number>>(new Set());

  const toggleBranch = (i: number) =>
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const [form, setForm] = useState<AboutFormData>({
    description: "",
    managerName: "",
    foundedYear: "",
    socialLinks: { facebook: "", instagram: "", tiktok: "" },
    branches: [
      { name: "فرع جنزور", address: "على طريق الساحلي جنزور", phone: "", imageUrl: "" },
      { name: "فرع عالم الغد", address: "شارع القرطبية", phone: "", imageUrl: "" },
      { name: "فرع عالم الرقمي", address: "طريق الصقري التقنية مول", phone: "", imageUrl: "" },
      { name: "فرع الأمان تك", address: "طريق الصقري قبل جزيرة الغنودي", phone: "", imageUrl: "" },
    ],
  });

  const token = localStorage.getItem("horizonStoreToken");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-session-token": token ?? "" };

  useEffect(() => {
    loadAboutData().then((parsed) => {
      setForm({
        description: (parsed.description as string) ?? "",
        managerName: (parsed.managerName as string) ?? "",
        foundedYear: (parsed.foundedYear as string) ?? "",
        socialLinks: {
          facebook: (parsed as any).socialLinks?.facebook ?? "",
          instagram: (parsed as any).socialLinks?.instagram ?? "",
          tiktok: (parsed as any).socialLinks?.tiktok ?? "",
        },
        branches: (parsed as any).branches?.length > 0
          ? (parsed as any).branches.map((b: any) => ({ name: b.name ?? "", address: b.address ?? "", phone: b.phone ?? "", imageUrl: b.imageUrl ?? "", locationUrl: b.locationUrl ?? "" }))
          : [
              { name: "فرع جنزور", address: "على طريق الساحلي جنزور", phone: "", imageUrl: "", locationUrl: "" },
              { name: "فرع عالم الغد", address: "شارع القرطبية", phone: "", imageUrl: "", locationUrl: "" },
              { name: "فرع عالم الرقمي", address: "طريق الصقري التقنية مول", phone: "", imageUrl: "", locationUrl: "" },
              { name: "فرع الأمان تك", address: "طريق الصقري قبل جزيرة الغنودي", phone: "", imageUrl: "", locationUrl: "" },
            ],
      });
    }).finally(() => setLoading(false));
  }, []);

  const updateBranch = (i: number, patch: Partial<{ name: string; address: string; phone: string; imageUrl?: string; locationUrl?: string }>) => {
    setForm((f) => ({ ...f, branches: f.branches.map((b, idx) => idx === i ? { ...b, ...patch } : b) }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveAboutMerge(form as unknown as Record<string, unknown>, headers);
      toast({ title: "تم حفظ صفحة من نحن" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally { setSaving(false); }
  };

  if (loading) return <Card><CardContent className="py-12 text-center text-muted-foreground">جاري التحميل...</CardContent></Card>;

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-4 h-4" /> معلومات المتجر</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">وصف المتجر</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="اكتب وصفاً عن المتجر..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">اسم المدير العام</Label>
              <Input value={form.managerName} onChange={(e) => setForm((f) => ({ ...f, managerName: e.target.value }))} placeholder="الاسم الكامل" />
            </div>
            <div>
              <Label className="mb-2 block">سنة التأسيس</Label>
              <Input value={form.foundedYear} onChange={(e) => setForm((f) => ({ ...f, foundedYear: e.target.value }))} placeholder="مثال: 2020" dir="ltr" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader><CardTitle className="text-base">روابط التواصل الاجتماعي</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">فيسبوك</Label>
            <Input
              value={form.socialLinks.facebook}
              onChange={(e) => setForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, facebook: e.target.value } }))}
              placeholder="https://facebook.com/..."
              dir="ltr"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">إنستغرام</Label>
            <Input
              value={form.socialLinks.instagram}
              onChange={(e) => setForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, instagram: e.target.value } }))}
              placeholder="https://instagram.com/..."
              dir="ltr"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">تيك توك</Label>
            <Input
              value={form.socialLinks.tiktok}
              onChange={(e) => setForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, tiktok: e.target.value } }))}
              placeholder="https://tiktok.com/..."
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Branches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> الفروع</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              const newIdx = form.branches.length;
              setForm((f) => ({ ...f, branches: [...f.branches, { name: "", address: "", phone: "", imageUrl: "" }] }));
              setExpandedBranches((prev) => new Set([...prev, newIdx]));
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة فرع
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {form.branches.map((branch, i) => {
            const isOpen = expandedBranches.has(i);
            return (
              <div key={i} className="border rounded-xl overflow-hidden bg-muted/20">
                {/* Summary row (always visible) */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{branch.name || `فرع ${i + 1}`}</p>
                    {branch.address && (
                      <p className="text-xs text-muted-foreground truncate">{branch.address}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={isOpen ? "default" : "outline"}
                    className="h-7 px-2.5 text-xs gap-1 shrink-0"
                    onClick={() => toggleBranch(i)}
                  >
                    {isOpen ? (
                      <><ChevronUp className="w-3 h-3" /> إغلاق</>
                    ) : (
                      <><Pencil className="w-3 h-3" /> تعديل</>
                    )}
                  </Button>
                  {form.branches.length > 1 && (
                    <button
                      className="text-destructive hover:text-destructive/80 shrink-0"
                      onClick={() => {
                        setForm((f) => ({ ...f, branches: f.branches.filter((_, idx) => idx !== i) }));
                        setExpandedBranches((prev) => {
                          const next = new Set<number>();
                          prev.forEach((n) => { if (n < i) next.add(n); else if (n > i) next.add(n - 1); });
                          return next;
                        });
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Expandable edit form */}
                {isOpen && (
                  <div className="border-t px-3 py-3 space-y-2 bg-background">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs mb-1 block">اسم الفرع</Label>
                        <Input className="h-8 text-sm" value={branch.name} onChange={(e) => updateBranch(i, { name: e.target.value })} placeholder="الفرع الرئيسي" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">رقم الهاتف</Label>
                        <Input className="h-8 text-sm" value={branch.phone} onChange={(e) => updateBranch(i, { phone: e.target.value })} placeholder="09xxxxxxxx" dir="ltr" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">العنوان</Label>
                      <Input className="h-8 text-sm" value={branch.address} onChange={(e) => updateBranch(i, { address: e.target.value })} placeholder="المدينة، الحي، الشارع" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">رابط الموقع على الخريطة</Label>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <Input
                          className="h-8 text-sm"
                          value={branch.locationUrl ?? ""}
                          onChange={(e) => updateBranch(i, { locationUrl: e.target.value })}
                          placeholder="https://maps.google.com/..."
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">صورة الفرع</Label>
                      <BranchImageUpload value={branch.imageUrl ?? ""} onChange={(url) => updateBranch(i, { imageUrl: url })} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full sm:w-auto gap-2">
        {saving ? "جاري الحفظ..." : "حفظ جميع التغييرات"}
      </Button>
    </div>
  );
}

const LAST_ORDER_KEY = "horizonAdmin_lastOrderId";

const notifSupported = typeof window !== "undefined" && "Notification" in window;

function useAdminOrderNotifications(orders: any[] | undefined, toast: any) {
  const initialized = useRef(false);
  const [notifAllowed, setNotifAllowed] = useState(() => {
    try { return notifSupported && Notification.permission === "granted"; } catch { return false; }
  });

  const requestPermission = async () => {
    if (!notifSupported) return false;
    try {
      const result = await Notification.requestPermission();
      setNotifAllowed(result === "granted");
      return result === "granted";
    } catch { return false; }
  };

  useEffect(() => {
    if (!orders || orders.length === 0) return;
    const latestId = orders[0]?.id ?? 0;

    if (!initialized.current) {
      initialized.current = true;
      const stored = localStorage.getItem(LAST_ORDER_KEY);
      if (!stored) localStorage.setItem(LAST_ORDER_KEY, String(latestId));
      return;
    }

    const storedId = parseInt(localStorage.getItem(LAST_ORDER_KEY) ?? "0", 10);
    const newOrders = orders.filter((o) => o.id > storedId);

    if (newOrders.length > 0) {
      localStorage.setItem(LAST_ORDER_KEY, String(latestId));

      const msg = newOrders.length === 1
        ? `طلب جديد من ${newOrders[0].userName ?? "عميل"}`
        : `${newOrders.length} طلبات جديدة في المتجر`;

      toast({ title: "🛒 طلب جديد!", description: msg });

      try {
        if (notifSupported && Notification.permission === "granted") {
          new Notification("متجر الأفق المتجدد — طلب جديد!", {
            body: msg,
            icon: "/logo.png",
            tag: "new-order",
          });
        }
      } catch { /* notifications not available */ }
    }
  }, [orders]);

  return { notifAllowed, requestPermission };
}

export default function Admin() {
  const { data: summary } = useAdminSummary();
  const { data: orders } = useAdminListOrders(
    {},
    { query: { queryKey: getAdminListOrdersQueryKey(), refetchInterval: 30_000 } },
  );
  const { data: products } = useAdminListProducts();
  const updateOrderMutation = useAdminUpdateOrderStatus();
  const deleteProductMutation = useAdminDeleteProduct();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { notifAllowed, requestPermission } = useAdminOrderNotifications(orders as any, toast);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [customerModal, setCustomerModal] = useState<any | null>(null);

  const filteredOrders = (orders ?? []).filter((o: any) => {
    if (!orderSearch.trim()) return true;
    const q = orderSearch.trim().toLowerCase();
    return (
      (o.userName ?? "").toLowerCase().includes(q) ||
      (o.phone ?? "").toLowerCase().includes(q)
    );
  });

  const lowStockProducts = (products ?? []).filter((p) => p.stock <= 5);

  const openCreate = () => { setEditingProduct(null); setProductDialogOpen(true); };
  const openEdit = (p: Product) => { setEditingProduct(p); setProductDialogOpen(true); };

  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`هل تريد حذف "${p.name}"؟`)) return;
    try {
      await deleteProductMutation.mutateAsync({ id: p.id });
      qc.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
      qc.invalidateQueries({ queryKey: getAdminSummaryQueryKey() });
      toast({ title: "تم حذف المنتج" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    }
  };

  const handleUpdateOrderStatus = async (id: number, status: string) => {
    try {
      await updateOrderMutation.mutateAsync({ id, data: { status } as any });
      qc.invalidateQueries({ queryKey: getAdminListOrdersQueryKey() });
      qc.invalidateQueries({ queryKey: getAdminSummaryQueryKey() });
      toast({ title: "تم تحديث حالة الطلب" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-destructive">لوحة تحكم الإدارة</h1>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0"><DollarSign className="w-5 h-5" /></div>
            <div><div className="text-xs text-muted-foreground">المبيعات</div><div className="text-xl font-bold" dir="ltr">{summary.totalRevenue} د.ل</div></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5" /></div>
            <div><div className="text-xs text-muted-foreground">الطلبات</div><div className="text-xl font-bold">{summary.totalOrders}</div><div className="text-[10px] text-muted-foreground">{summary.pendingOrders} معلق</div></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5" /></div>
            <div><div className="text-xs text-muted-foreground">العملاء</div><div className="text-xl font-bold">{summary.totalUsers}</div></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center flex-shrink-0"><AlertCircle className="w-5 h-5" /></div>
            <div><div className="text-xs text-muted-foreground">نواقص المخزون</div><div className="text-xl font-bold">{summary.lowStockProducts}</div></div>
          </CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="orders">الطلبات</TabsTrigger>
          <TabsTrigger value="products">المنتجات</TabsTrigger>
          <TabsTrigger value="categories">الأقسام</TabsTrigger>
          <TabsTrigger value="lowstock" className="flex items-center gap-1">
            النواقص
            {lowStockProducts.length > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {lowStockProducts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="delivery">التوصيل</TabsTrigger>
          <TabsTrigger value="about">من نحن</TabsTrigger>
          <TabsTrigger value="settings">⚙ إعدادات المتجر</TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="ابحث باسم الزبون أو رقم الهاتف..."
              className="pr-9 pl-9"
              dir="rtl"
            />
            {orderSearch && (
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setOrderSearch("")}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                <span>الطلبات</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-normal text-muted-foreground">
                    {filteredOrders.length} / {(orders ?? []).length}
                  </span>
                  {!notifAllowed && (
                    <button
                      onClick={requestPermission}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      🔔 تفعيل الإشعارات
                    </button>
                  )}
                  {notifAllowed && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      🔔 الإشعارات مفعّلة
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">

              {/* Mobile card view */}
              <div className="sm:hidden divide-y divide-border">
                {filteredOrders.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground text-sm">لا توجد نتائج</p>
                )}
                {filteredOrders.map((order: any) => (
                  <div key={order.id} className={`p-3 space-y-2 ${order.status === "pending" ? "bg-amber-50 dark:bg-amber-950/20 border-r-4 border-amber-400" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground">#{order.id}</span>
                        <button
                          className="flex items-center gap-1 font-semibold text-sm hover:text-primary"
                          onClick={() => setCustomerModal(order)}
                        >
                          <ShoppingBag className="w-3 h-3 text-primary" />
                          {order.userName || "—"}
                        </button>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span dir="ltr">{order.phone || "—"}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-sm text-primary" dir="ltr">{order.total} د.ل</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "MM/dd HH:mm")}</div>
                        <Badge
                          variant={order.status === "cancelled" ? "destructive" : order.status === "pending" ? "outline" : "secondary"}
                          className={`text-[10px] mt-1 ${order.status === "pending" ? "border-amber-400 text-amber-700 bg-amber-100" : ""}`}
                        >
                          {ORDER_STATUS_MAP[order.status] ?? order.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Pending: show Accept/Reject buttons */}
                    {order.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
                          onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                        >
                          <CheckCircle className="w-4 h-4" />
                          قبول الطلب
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 h-9 gap-1.5 font-semibold"
                          onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                        >
                          <XCircle className="w-4 h-4" />
                          رفض
                        </Button>
                        <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" onClick={() => printOrder(order)}>
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select
                          value={order.status}
                          onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}
                          disabled={order.status === "cancelled" || order.status === "payment_received"}
                        >
                          <SelectTrigger className="flex-1 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">قيد المراجعة</SelectItem>
                            <SelectItem value="preparing">قيد التجهيز</SelectItem>
                            <SelectItem value="prepared">تم التجهيز</SelectItem>
                            <SelectItem value="delivered_to_courier">لدى التوصيل</SelectItem>
                            <SelectItem value="payment_received">تم الاستلام والدفع</SelectItem>
                            <SelectItem value="cancelled">إلغاء</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="outline" className="h-8 w-8 flex-shrink-0" onClick={() => printOrder(order)}>
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تحديث</TableHead>
                      <TableHead>طباعة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order: any) => (
                      <TableRow key={order.id} className={order.status === "pending" ? "bg-amber-50 dark:bg-amber-950/20 border-r-4 border-amber-400" : ""}>
                        <TableCell className="font-medium text-xs">
                          <div>#{order.id}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {order.items?.map((it: any) => it.selectedColor && (
                              <span key={it.id} title={it.productName} className="inline-block w-3 h-3 rounded-full border border-border" style={{ backgroundColor: it.selectedColor }} />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <button className="text-sm font-medium hover:text-primary hover:underline text-right flex items-center gap-1 group" onClick={() => setCustomerModal(order)}>
                            <ShoppingBag className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                            {order.userName || "—"}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span dir="ltr">{order.phone || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(order.createdAt), "MM/dd HH:mm")}</TableCell>
                        <TableCell dir="ltr" className="text-right text-sm font-medium">{order.total} د.ل</TableCell>
                        <TableCell>
                          <Badge
                            variant={order.status === "cancelled" ? "destructive" : order.status === "pending" ? "outline" : "secondary"}
                            className={`text-[10px] ${order.status === "pending" ? "border-amber-400 text-amber-700 bg-amber-100" : ""}`}
                          >
                            {ORDER_STATUS_MAP[order.status] ?? order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.status === "pending" ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                قبول
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2.5 text-xs gap-1"
                                onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                رفض
                              </Button>
                            </div>
                          ) : (
                            <Select value={order.status} onValueChange={(val) => handleUpdateOrderStatus(order.id, val)} disabled={order.status === "cancelled" || order.status === "payment_received"}>
                              <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">قيد المراجعة</SelectItem>
                                <SelectItem value="preparing">قيد التجهيز</SelectItem>
                                <SelectItem value="prepared">تم التجهيز</SelectItem>
                                <SelectItem value="delivered_to_courier">لدى التوصيل</SelectItem>
                                <SelectItem value="payment_received">تم الاستلام والدفع</SelectItem>
                                <SelectItem value="cancelled">إلغاء</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => printOrder(order)}><Printer className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredOrders.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد نتائج للبحث عن "{orderSearch}"</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>المنتجات</CardTitle>
              <Button onClick={openCreate} className="gap-2" data-testid="button-add-product">
                <Plus className="w-4 h-4" />
                إضافة
              </Button>
            </CardHeader>
            <CardContent className="p-0">

              {/* Mobile card view */}
              <div className="sm:hidden divide-y divide-border">
                {products?.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-3">
                    <div className="w-12 h-12 bg-muted rounded-lg p-1 flex-shrink-0">
                      <img src={imageUrlFor(product.imageUrl)} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.subcategoryName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-primary" dir="ltr">{product.price} د.ل</span>
                        <Badge variant={product.stock === 0 ? "destructive" : product.stock <= 5 ? "outline" : "secondary"} className="text-[10px]">
                          {product.stock === 0 ? "نفد" : `${product.stock}`}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(product)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeleteProduct(product)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الصورة</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>المخزون</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead className="text-left">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="w-9 h-9 bg-muted rounded p-1">
                            <img src={imageUrlFor(product.imageUrl)} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[160px] truncate text-sm" title={product.name}>{product.name}</TableCell>
                        <TableCell dir="ltr" className="text-right text-sm">{product.price} د.ل</TableCell>
                        <TableCell>
                          <Badge variant={product.stock === 0 ? "destructive" : "secondary"} className="text-xs">{product.stock}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{product.subcategoryName}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(product)} data-testid={`button-edit-product-${product.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteProduct(product)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="lowstock" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                قائمة النواقص — المخزون 5 قطع أو أقل
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">لا توجد منتجات ناقصة</p>
                  <p className="text-sm">جميع المنتجات لديها مخزون كافٍ</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الصورة</TableHead>
                      <TableHead>اسم الصنف</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>المخزون المتبقي</TableHead>
                      <TableHead className="text-left">تعديل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockProducts.map((product) => (
                      <TableRow key={product.id} className={product.stock === 0 ? "bg-destructive/5" : ""}>
                        <TableCell>
                          <div className="w-10 h-10 bg-muted rounded p-1">
                            <img src={imageUrlFor(product.imageUrl)} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{product.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{product.subcategoryName}</TableCell>
                        <TableCell>
                          <Badge variant={product.stock === 0 ? "destructive" : "outline"} className="font-bold text-sm">
                            {product.stock === 0 ? "نفد" : `${product.stock} قطعة`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <Button size="sm" variant="outline" onClick={() => openEdit(product)} className="gap-1 text-xs">
                            <Pencil className="w-3 h-3" />
                            تعديل المخزون
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          <CategoriesTab />
        </TabsContent>

        {/* Delivery Regions Tab */}
        <TabsContent value="delivery" className="mt-4">
          <DeliveryRegionsTab />
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="mt-4">
          <AboutTab />
        </TabsContent>

        {/* Store Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <StoreSettingsTab />
        </TabsContent>
      </Tabs>

      <ProductFormDialog open={productDialogOpen} onOpenChange={setProductDialogOpen} product={editingProduct} />

      {/* Customer Orders Modal */}
      <Dialog open={!!customerModal} onOpenChange={(v) => { if (!v) setCustomerModal(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <ShoppingBag className="w-5 h-5 text-primary" />
              طلب #{customerModal?.id} — {customerModal?.userName || "—"}
            </DialogTitle>
          </DialogHeader>

          {/* Customer Info */}
          <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span dir="ltr" className="font-medium">{customerModal?.phone || "—"}</span>
            </div>
            <div className="text-muted-foreground">
              {customerModal?.region && <span>المنطقة: {customerModal.region}</span>}
              {customerModal?.address && <span className="mr-3">| العنوان: {customerModal.address}</span>}
            </div>
            <div className="flex items-center gap-4 pt-1">
              <span>الإجمالي: <strong>{customerModal?.total} د.ل</strong></span>
              {customerModal?.deliveryFee > 0 && (
                <span className="text-muted-foreground text-xs">| توصيل: {customerModal.deliveryFee} د.ل</span>
              )}
            </div>
          </div>

          {/* Ordered Products */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground">المنتجات المطلوبة</h4>
            {(customerModal?.items ?? []).map((it: any) => {
              const productInStore = (products ?? []).find((p) => p.id === it.productId);
              const stockNow = productInStore?.stock ?? null;
              return (
                <div key={it.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-background">
                  <div className="w-12 h-12 bg-muted rounded flex-shrink-0 flex items-center justify-center p-1">
                    <img
                      src={it.productImage?.startsWith("/objects/") ? `/api/storage${it.productImage}` : (it.productImage ?? "")}
                      alt=""
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{it.productName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {it.selectedColor && (
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-full border border-border flex-shrink-0"
                          style={{ backgroundColor: it.selectedColor }}
                        />
                      )}
                      <span className="text-xs text-muted-foreground">× {it.quantity}</span>
                      <span className="text-xs font-medium">{it.price} د.ل</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {stockNow !== null && (
                      <Badge
                        variant={stockNow === 0 ? "destructive" : stockNow <= 5 ? "outline" : "secondary"}
                        className="text-[10px]"
                      >
                        {stockNow === 0 ? "نفد" : `مخزون: ${stockNow}`}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
