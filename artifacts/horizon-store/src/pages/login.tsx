import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
  identifier: z.string().min(1, "رقم الهاتف أو البريد الإلكتروني مطلوب"),
  password: z.string().min(4, "كلمة المرور قصيرة جداً"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setLoading(true);
    try {
      const isEmail = values.identifier.includes("@");
      const body = isEmail
        ? { email: values.identifier, password: values.password }
        : { phone: values.identifier, password: values.password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل تسجيل الدخول");
      setToken(data.token);
      toast({ title: "تم تسجيل الدخول بنجاح", description: `مرحباً ${data.user.fullName}` });
      setLocation("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ في تسجيل الدخول", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل تسجيل الدخول بـ Google");
      setToken(data.token);
      toast({ title: "تم تسجيل الدخول بنجاح", description: `مرحباً ${data.user.fullName}` });
      setLocation("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary font-bold">تسجيل الدخول</CardTitle>
          <CardDescription>مرحباً بك مجدداً في متجر الأفق المتجدد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoogleSignInButton onCredential={handleGoogleCredential} />

          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">أو</span>
              <Separator className="flex-1" />
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف أو البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="09X XXX XXXX أو example@email.com"
                        dir="ltr"
                        className="text-right"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input type="password" dir="ltr" className="text-right" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "جاري الدخول..." : "دخول"}
              </Button>
            </form>
          </Form>

          <div className="mt-2 text-center text-sm">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              سجل الآن
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
