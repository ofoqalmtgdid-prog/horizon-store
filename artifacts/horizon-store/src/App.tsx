import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Category from "@/pages/category";
import Subcategory from "@/pages/subcategory";
import Product from "@/pages/product";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import Favorites from "@/pages/favorites";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import About from "@/pages/about";
import Branches from "@/pages/branches";
import SearchPage from "@/pages/search";

const queryClient = new QueryClient();

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

function StoreThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    fetch("/api/about")
      .then((r) => r.json())
      .then((d: any) => {
        let data = d;
        if (d?.content && typeof d.content === "string") {
          try { data = JSON.parse(d.content); } catch { data = d; }
        }
        if (data.primaryColor && /^#[0-9A-Fa-f]{6}$/.test(data.primaryColor)) {
          const hsl = hexToHsl(data.primaryColor);
          document.documentElement.style.setProperty("--primary", hsl);
          document.documentElement.style.setProperty("--ring", hsl);
        }
        if (data.faviconUrl) {
          const imgSrc = data.faviconUrl.startsWith("/objects/")
            ? `/api/storage${data.faviconUrl}`
            : data.faviconUrl;
          let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = imgSrc;
        }
      })
      .catch(() => {});
  }, []);
  return <>{children}</>;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/category/:slug" component={Category} />
        <Route path="/subcategory/:slug" component={Subcategory} />
        <Route path="/product/:id" component={Product} />
        
        <Route path="/cart">
          <ProtectedRoute><Cart /></ProtectedRoute>
        </Route>
        <Route path="/checkout">
          <ProtectedRoute><Checkout /></ProtectedRoute>
        </Route>
        <Route path="/orders">
          <ProtectedRoute><Orders /></ProtectedRoute>
        </Route>
        <Route path="/orders/:id">
          <ProtectedRoute><OrderDetail /></ProtectedRoute>
        </Route>
        <Route path="/favorites">
          <ProtectedRoute><Favorites /></ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute><Profile /></ProtectedRoute>
        </Route>
        <Route path="/admin">
          <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
        </Route>
        <Route path="/about" component={About} />
        <Route path="/branches" component={Branches} />
        <Route path="/search" component={SearchPage} />
        
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <StoreThemeProvider>
            <Router />
          </StoreThemeProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
