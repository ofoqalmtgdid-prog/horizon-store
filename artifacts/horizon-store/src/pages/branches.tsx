import { useEffect, useState } from "react";
import { MapPin, Phone, Building2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Branch {
  name: string;
  address: string;
  phone?: string;
  imageUrl?: string;
  locationUrl?: string;
}

const DEFAULT_BRANCHES: Branch[] = [
  { name: "فرع جنزور", address: "على طريق الساحلي جنزور" },
  { name: "فرع عالم الغد", address: "شارع القرطبية" },
  { name: "فرع عالم الرقمي", address: "طريق الصقري التقنية مول" },
  { name: "فرع الأمان تك", address: "طريق الصقري قبل جزيرة الغنودي" },
];

function mapsLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + " طرابلس ليبيا")}`;
}

function imageUrlFor(p: string | null | undefined): string {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  if (p.startsWith("/objects/")) return `/api/storage${p}`;
  return p;
}

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/about")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        let parsed: any = data;
        if (data.content && typeof data.content === "string") {
          try { parsed = JSON.parse(data.content); } catch { parsed = {}; }
        }
        if (parsed.branches?.length > 0) {
          setBranches(parsed.branches);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-2">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">فروعنا</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          نخدمكم في عدة مواقع في طرابلس وضواحيها
        </p>
      </div>

      {/* Store Front Image */}
      <div className="relative rounded-2xl overflow-hidden h-48 md:h-64">
        <img
          src="/store-front.jpg"
          alt="متجر الأفق المتجدد"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-5">
          <div>
            <p className="text-white font-bold text-lg">شركة الأفق المتجدد</p>
            <p className="text-white/80 text-sm">للحاسبات وتقنية المعلومات</p>
          </div>
        </div>
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {branches.map((branch, i) => {
            const imgSrc = imageUrlFor(branch.imageUrl);
            return (
              <Card key={i} className="overflow-hidden group hover:shadow-lg transition-shadow duration-300">
                {/* Branch image */}
                <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={branch.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-14 h-14 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute bottom-3 right-3">
                    <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                      {branch.name}
                    </span>
                  </div>
                </div>

                <CardContent className="pt-4 pb-4 space-y-2">
                  <h3 className="font-bold text-base">{branch.name}</h3>
                  <div className="flex items-start gap-2 text-muted-foreground text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>{branch.address}</span>
                  </div>
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Phone className="w-4 h-4 flex-shrink-0 text-primary" />
                      <a href={`tel:${branch.phone}`} dir="ltr" className="hover:text-primary transition-colors">{branch.phone}</a>
                    </div>
                  )}
                  <a
                    href={branch.locationUrl || mapsLink(branch.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors px-3 py-1.5 rounded-lg mt-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    موقعنا على الخريطة
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
