import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, User, MapPin, Phone, Pencil, Wallet, Check, X as XIcon, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CITIES = ["طرابلس","بنغازي","مصراتة","الزاوية","سرت","البيضاء","طبرق","سبها","أجدابيا","درنة","الخمس","زليتن","غريان","أخرى"];

function imageUrlFor(p: string | null | undefined): string {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  if (p.startsWith("/objects/")) return `/api/storage${p}`;
  return p;
}

export default function Profile() {
  const { user, clearToken, refreshUser } = useAuth() as any;
  const [, setLocation] = useLocation();
  const logout = useLogout();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({ fullName: "", region: "", password: "" });

  useEffect(() => {
    if (user) {
      setForm({ fullName: user.fullName || "", region: user.region || "", password: "" });
    }
  }, [user]);

  const handleLogout = async () => {
    try { await logout.mutateAsync(); } catch {}
    clearToken();
    setLocation("/");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "الصورة كبيرة جداً (أقصى 5MB)" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem("horizonStoreToken");
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("فشل طلب الرفع");
      const { uploadURL, objectPath } = await urlRes.json();

      const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putRes.ok) throw new Error("فشل رفع الصورة");

      const saveRes = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-session-token": token ?? "",
        },
        body: JSON.stringify({ avatarUrl: objectPath }),
      });
      if (!saveRes.ok) throw new Error("فشل حفظ الصورة");

      toast({ title: "تم تحديث الصورة الشخصية" });
      if (typeof refreshUser === "function") refreshUser();
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("horizonStoreToken");
      const body: Record<string, string> = {};
      if (form.fullName && form.fullName !== user?.fullName) body.fullName = form.fullName;
      if (form.region && form.region !== user?.region) body.region = form.region;
      if (form.password) body.password = form.password;

      if (Object.keys(body).length === 0) { setEditing(false); return; }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-session-token": token ?? "",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "فشل الحفظ");
      }

      toast({ title: "تم حفظ التغييرات" });
      setEditing(false);
      if (typeof refreshUser === "function") refreshUser();
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const walletBalance = (user as any)?.walletBalance;
  const avatarSrc = imageUrlFor((user as any)?.avatarUrl);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">الملف الشخصي</h1>

      <Card>
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar with upload */}
              <div className="relative group">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center overflow-hidden border-2 border-border">
                  {avatarSrc ? (
                    <img src={avatarSrc} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                </div>
                <button
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="تغيير الصورة"
                >
                  {uploadingAvatar
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : <Camera className="w-5 h-5 text-white" />
                  }
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div>
                <CardTitle className="text-xl">{user.fullName}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {user.role === "admin" ? "مدير النظام" : "عميل"}
                </div>
                <button
                  className="text-xs text-primary hover:underline mt-0.5"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? "جاري الرفع..." : "تغيير الصورة"}
                </button>
              </div>
            </div>
            {!editing && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4" />
                تعديل
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="اسمك الكامل"
                />
              </div>
              <div className="space-y-2">
                <Label>المدينة</Label>
                <Select value={form.region} onValueChange={(v) => setForm((f) => ({ ...f, region: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مدينتك" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة (اختياري)</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="اتركه فارغاً إذا لا تريد تغييرها"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="gap-2" onClick={handleSave} disabled={saving}>
                  <Check className="w-4 h-4" />
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setEditing(false)} disabled={saving}>
                  <XIcon className="w-4 h-4" />
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">رقم الهاتف</div>
                  <div className="font-medium" dir="ltr">{user.phone || "—"}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 pb-4 border-b">
                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">المدينة</div>
                  <div className="font-medium">{user.region || "—"}</div>
                </div>
              </div>

              {walletBalance !== undefined && (
                <div className="flex items-center gap-4 pb-4 border-b">
                  <Wallet className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">رصيد المحفظة</div>
                    <div className="font-bold text-primary text-lg" dir="ltr">{walletBalance} د.ل</div>
                    <div className="text-xs text-muted-foreground">يُضاف بعد تأكيد استلام الطلب</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            variant="destructive"
            className="w-full sm:w-auto gap-2 mt-2"
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
