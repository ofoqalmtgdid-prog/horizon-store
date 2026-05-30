import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Home, Heart, ShoppingCart, User, Package, Search, ChevronDown, X, Menu, Facebook, Instagram, Info, MapPin, LayoutDashboard } from "lucide-react";
import { useGetCart, getGetCartQueryKey, useListCategories, useAdminSummary, getAdminSummaryQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";

function imageUrlFor(p: string | null | undefined): string {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  if (p.startsWith("/objects/")) return `/api/storage${p}`;
  return p;
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.09a8.16 8.16 0 004.77 1.52V7.16a4.85 4.85 0 01-1-.47z"/>
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function CategoryDropdown() {
  const { data: categories } = useListCategories();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Menu className="w-4 h-4" />
        <span>الأقسام</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 right-0 bg-background border border-border rounded-xl shadow-xl z-50 min-w-[260px] max-h-[70vh] overflow-y-auto p-2">
          {categories?.map((cat) => (
            <div key={cat.id} className="mb-1">
              <Link
                href={`/category/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 cursor-pointer group text-right"
              >
                {cat.icon && <span className="text-base">{cat.icon}</span>}
                <span className="font-semibold text-sm group-hover:text-primary transition-colors">{cat.name}</span>
              </Link>
              {(cat as any).subcategories?.length > 0 && (
                <div className="mr-4 border-r border-border/50 pr-2 mb-1">
                  {(cat as any).subcategories.map((sub: any) => (
                    <Link
                      key={sub.id}
                      href={`/subcategory/${sub.slug}`}
                      onClick={() => setOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted text-right text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {sub.name}
                      {sub.productCount > 0 && (
                        <span className="mr-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{sub.productCount}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="relative">
      {open ? (
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="h-9 w-36 md:w-52 text-sm"
            dir="rtl"
          />
          <button type="button" onClick={() => { setOpen(false); setQuery(""); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <button
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
          aria-label="بحث"
        >
          <Search className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function SocialLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all duration-200"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span
        className="text-sm font-medium transition-all duration-200 whitespace-nowrap overflow-hidden"
        style={{ maxWidth: hovered ? 100 : 0, opacity: hovered ? 1 : 0 }}
      >
        {label}
      </span>
    </a>
  );
}

function MobileWhatsAppButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex flex-col items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-green-600 transition-colors"
      >
        <WhatsAppIcon className="w-5 h-5" />
        <span className="text-[9px] font-medium">واتساب</span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border border-border rounded-xl shadow-2xl p-3 w-52 space-y-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-150">
          <p className="text-[11px] text-muted-foreground text-center font-medium">تواصل معنا عبر واتساب</p>
          <a
            href="https://wa.me/218925361200"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span dir="ltr">0925 361 200</span>
          </a>
          <a
            href="https://wa.me/218925361400"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span dir="ltr">0925 361 400</span>
          </a>
        </div>
      )}
    </div>
  );
}

function WhatsAppFooterLink() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-muted-foreground hover:text-green-600 transition-all duration-200"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <WhatsAppIcon className="w-5 h-5 flex-shrink-0" />
        <span
          className="text-sm font-medium transition-all duration-200 whitespace-nowrap overflow-hidden"
          style={{ maxWidth: hovered || open ? 80 : 0, opacity: hovered || open ? 1 : 0 }}
        >
          واتساب
        </span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-3 left-0 bg-background border border-border rounded-xl shadow-2xl p-3 w-52 space-y-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-150">
          <p className="text-[11px] text-muted-foreground text-center font-medium">تواصل معنا عبر واتساب</p>
          <a
            href="https://wa.me/218925361200"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span dir="ltr">0925 361 200</span>
          </a>
          <a
            href="https://wa.me/218925361400"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span dir="ltr">0925 361 400</span>
          </a>
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";

  const { data: cart } = useGetCart({ query: { queryKey: getGetCartQueryKey(), enabled: isAuthenticated } });

  const { data: adminSummary } = useAdminSummary({
    query: {
      queryKey: getAdminSummaryQueryKey(),
      enabled: isAdmin,
      refetchInterval: 30_000,
    },
  });
  const pendingCount = isAdmin ? (adminSummary?.pendingOrders ?? 0) : 0;

  if (location === "/login" || location === "/register") return <>{children}</>;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pb-[120px] md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-3 md:px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center flex-shrink-0">
            <img src="/logo.png" alt="الأفق المتجدد" className="h-9 w-auto" />
          </Link>

          <div className="mr-2">
            <CategoryDropdown />
          </div>

          <div className="flex items-center gap-2 mr-auto">
            <SearchBar />

            {isAuthenticated && (
              <Link href="/cart" className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <ShoppingCart className="w-5 h-5" />
                {!!cart?.count && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {cart.count}
                  </span>
                )}
              </Link>
            )}

            <div className="hidden md:flex items-center gap-1">
              {isAuthenticated ? (
                <>
                  <Link href="/orders" className="px-3 py-2 text-sm font-medium hover:text-primary hover:bg-muted rounded-lg transition-colors">طلباتي</Link>
                  <Link href="/favorites" className="px-3 py-2 text-sm font-medium hover:text-primary hover:bg-muted rounded-lg transition-colors">المفضلة</Link>
                  {isAdmin && (
                    <Link href="/admin" className="relative px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center gap-1">
                      التحكم
                      {pendingCount > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center animate-pulse">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <Link href="/profile" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium hover:text-primary hover:bg-muted rounded-lg transition-colors">
                    {(user as any)?.avatarUrl ? (
                      <img src={imageUrlFor((user as any).avatarUrl)} className="w-6 h-6 rounded-full object-cover border border-border" alt="" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    <span>{user?.fullName?.split(" ")[0]}</span>
                  </Link>
                </>
              ) : (
                <Link href="/login" className="px-3 py-2 text-sm font-semibold text-primary hover:underline">تسجيل الدخول</Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-3 md:px-4 py-4 md:py-6">
        {children}
      </main>

      {/* Footer — desktop */}
      <footer className="border-t border-border/50 bg-muted/20 py-6 px-4 hidden md:block">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">الأفق المتجدد</span>
            <span>•</span>
            <span>وجهتك الأولى في ليبيا</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/about" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Info className="w-4 h-4" />
              <span>من نحن</span>
            </Link>
            <Link href="/branches" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <MapPin className="w-4 h-4" />
              <span>فروعنا</span>
            </Link>
            <div className="h-4 w-px bg-border/50" />
            <SocialLink href="https://www.facebook.com/Distant.horizon.pc/" icon={Facebook} label="فيسبوك" />
            <SocialLink href="https://www.instagram.com/alofoq_almotajaded" icon={Instagram} label="إنستغرام" />
            <WhatsAppFooterLink />
            <SocialLink href="https://www.tiktok.com/@alofoq_ly" icon={TikTokIcon} label="تيك توك" />
          </div>
        </div>
      </footer>

      {/* Mobile Social Strip — fixed above bottom nav */}
      <div className="md:hidden fixed bottom-16 inset-x-0 bg-background/95 backdrop-blur-sm border-t border-border/60 py-1.5 px-4 flex items-center justify-center gap-6 z-40 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <a
          href="https://www.facebook.com/Distant.horizon.pc/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <Facebook className="w-5 h-5" />
          <span className="text-[9px] font-medium">فيسبوك</span>
        </a>
        <a
          href="https://www.instagram.com/alofoq_almotajaded"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <Instagram className="w-5 h-5" />
          <span className="text-[9px] font-medium">إنستغرام</span>
        </a>
        <MobileWhatsAppButton />
        <a
          href="https://www.tiktok.com/@alofoq_ly"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <TikTokIcon className="w-5 h-5" />
          <span className="text-[9px] font-medium">تيك توك</span>
        </a>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t border-border z-50 flex h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link href="/" className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-medium">الرئيسية</span>
        </Link>
        <Link href="/orders" className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${location.startsWith('/orders') ? 'text-primary' : 'text-muted-foreground'}`}>
          <Package className="w-5 h-5" />
          <span className="text-[9px] font-medium">طلباتي</span>
        </Link>
        <Link href="/branches" className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${location === '/branches' ? 'text-primary' : 'text-muted-foreground'}`}>
          <MapPin className="w-5 h-5" />
          <span className="text-[9px] font-medium">فروعنا</span>
        </Link>
        {isAdmin ? (
          <Link href="/admin" className={`flex flex-col items-center justify-center flex-1 gap-0.5 relative transition-colors ${location === '/admin' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className="relative">
              <LayoutDashboard className="w-5 h-5" />
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-medium">التحكم</span>
          </Link>
        ) : (
          <Link href="/favorites" className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${location === '/favorites' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Heart className="w-5 h-5" />
            <span className="text-[9px] font-medium">المفضلة</span>
          </Link>
        )}
        <Link href="/profile" className={`flex flex-col items-center justify-center flex-1 gap-0.5 relative transition-colors ${location === '/profile' ? 'text-primary' : 'text-muted-foreground'}`}>
          {(user as any)?.avatarUrl ? (
            <img src={imageUrlFor((user as any).avatarUrl)} className="w-5 h-5 rounded-full object-cover border border-border" alt="" />
          ) : (
            <User className="w-5 h-5" />
          )}
          <span className="text-[9px] font-medium">حسابي</span>
        </Link>
      </nav>
    </div>
  );
}
