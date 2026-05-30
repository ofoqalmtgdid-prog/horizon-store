import { useEffect, useState } from "react";
import { Building2, Users, MapPin, Phone, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AboutContent {
  description?: string;
  managerName?: string;
  branches?: { name: string; address: string; phone?: string }[];
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
  foundedYear?: string;
}

export default function About() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/about")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) { setLoading(false); return; }
        // API may return {content: "jsonString"} (after admin save) or plain object
        if (data.content && typeof data.content === "string") {
          try { setContent(JSON.parse(data.content)); } catch { setContent(data); }
        } else if (Object.keys(data).length > 0) {
          setContent(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const defaultContent: AboutContent = {
    description:
      "متجر الأفق المتجدد مختص لبيع الإلكترونيات ومستلزمات الكمبيوتر في ليبيا. نقدم أحدث المنتجات بأسعار تنافسية وخدمة توصيل لجميع المدن الليبية.",
    managerName: "إدارة الأفق المتجدد",
    branches: [{ name: "الفرع الرئيسي", address: "طرابلس، ليبيا" }],
    foundedYear: "2020",
  };

  const info = content ?? defaultContent;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-2 p-2">
          <img src="/logo.png" alt="الأفق المتجدد" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold">من نحن</h1>
        {info.foundedYear && (
          <p className="text-sm text-muted-foreground">منذ {info.foundedYear}</p>
        )}
      </div>

      {/* Description */}
      {info.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-base leading-relaxed text-center">{info.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Manager */}
      {info.managerName && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المدير العام</p>
                <p className="font-semibold">{info.managerName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branches */}
      {info.branches && info.branches.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            فروعنا
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {info.branches.map((branch, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4 space-y-1">
                  <p className="font-semibold text-sm">{branch.name}</p>
                  <div className="flex items-start gap-1.5 text-muted-foreground text-xs">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{branch.address}</span>
                  </div>
                  {branch.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span dir="ltr">{branch.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Social */}
      <div className="text-center space-y-3 py-4">
        <p className="text-sm text-muted-foreground">تابعنا على وسائل التواصل الاجتماعي</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {(info.socialLinks?.facebook || "https://www.facebook.com/Distant.horizon.pc/") && (
            <a
              href={info.socialLinks?.facebook || "https://www.facebook.com/Distant.horizon.pc/"}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              فيسبوك
            </a>
          )}
          {(info.socialLinks?.instagram || "https://www.instagram.com/alofoq_almotajaded") && (
            <a
              href={info.socialLinks?.instagram || "https://www.instagram.com/alofoq_almotajaded"}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              إنستغرام
            </a>
          )}
          {(info.socialLinks?.tiktok || "https://www.tiktok.com/@alofoq_ly") && (
            <a
              href={info.socialLinks?.tiktok || "https://www.tiktok.com/@alofoq_ly"}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              تيك توك
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
