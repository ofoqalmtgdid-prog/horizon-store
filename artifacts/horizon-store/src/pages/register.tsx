import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LIBYAN_CITIES = [
  "طرابلس", "بنغازي", "مصراتة", "الزاوية", "سرت", "البيضاء", "طبرق", "سبها", "أجدابيا", "درنة", "الخمس", "زليتن", "غريان"
];

const phoneSchema = z.object({
  fullName: z.string().min(10, "يجب إدخال الاسم الرباعي"),
  phone: z.string().min(10, "رقم الهاتف غير صالح"),
  region: z.string().min(1, "يرجى اختيار المدينة"),
  age: z.coerce.number().min(18, "يجب أن يكون العمر 18 أو أكثر").max(100),
  gender: z.enum(["male", "female"]),
  password: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "كلمات المرور غير متطابقة", path: ["confirmPassword"] });

const emailSchema = z.object({
  fullName: z.string().min(3, "أدخل اسمك"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "كلمات المرور غير متطابقة", path: ["confirmPassword"] });

type PhoneValues = z.infer<typeof phoneSchema>;
type EmailValues = z.infer<typeof emailSchema>;

function PhoneRegisterForm() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { fullName: "", phone: "", region: "", age: undefined as any, gender: "male", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: PhoneValues) => {
    try {
      const response = await registerMutation.mutateAsync({
        data: { fullName: values.fullName, phone: values.phone, region: values.region, age: values.age, gender: values.gender, password: values.password },
      });
      setToken(response.token);
      toast({ title: "تم التسجيل بنجاح", description: "مرحباً بك في متجر الأفق المتجدد" });
      setLocation("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ في التسجيل", description: error.message || "حدث خطأ غير متوقع" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="fullName" render={({ field }) => (
          <FormItem><FormLabel>الاسم الرباعي</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem><FormLabel>رقم الهاتف</FormLabel><FormControl><Input dir="ltr" className="text-right" placeholder="09X XXX XXXX" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="region" render={({ field }) => (
          <FormItem><FormLabel>المدينة</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="اختر مدينتك" /></SelectTrigger></FormControl>
              <SelectContent>{LIBYAN_CITIES.map(city => (<SelectItem key={city} value={city}>{city}</SelectItem>))}</SelectContent>
            </Select>
          <FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="age" render={({ field }) => (
            <FormItem><FormLabel>العمر</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="gender" render={({ field }) => (
            <FormItem><FormLabel>الجنس</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-5 pt-2">
                  <FormItem className="flex items-center gap-2"><FormControl><RadioGroupItem value="male" /></FormControl><FormLabel className="font-normal">ذكر</FormLabel></FormItem>
                  <FormItem className="flex items-center gap-2"><FormControl><RadioGroupItem value="female" /></FormControl><FormLabel className="font-normal">أنثى</FormLabel></FormItem>
                </RadioGroup>
              </FormControl>
            <FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>كلمة المرور</FormLabel><FormControl><Input type="password" dir="ltr" className="text-right" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
          <FormItem><FormLabel>تأكيد كلمة المرور</FormLabel><FormControl><Input type="password" dir="ltr" className="text-right" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "جاري التسجيل..." : "إنشاء حساب"}
        </Button>
      </form>
    </Form>
  );
}

function EmailRegisterForm() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: EmailValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: values.fullName, email: values.email, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل التسجيل");
      setToken(data.token);
      toast({ title: "تم التسجيل بنجاح", description: "مرحباً بك في متجر الأفق المتجدد" });
      setLocation("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ في التسجيل", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="fullName" render={({ field }) => (
          <FormItem><FormLabel>الاسم الكامل</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input type="email" dir="ltr" className="text-right" placeholder="example@gmail.com" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>كلمة المرور</FormLabel><FormControl><Input type="password" dir="ltr" className="text-right" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
          <FormItem><FormLabel>تأكيد كلمة المرور</FormLabel><FormControl><Input type="password" dir="ltr" className="text-right" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "جاري التسجيل..." : "إنشاء حساب بالبريد"}
        </Button>
      </form>
    </Form>
  );
}

export default function Register() {
  const { setToken } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleGoogleCredential = async (credential: string) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل التسجيل بـ Google");
      setToken(data.token);
      toast({ title: "تم التسجيل بنجاح", description: `مرحباً ${data.user.fullName}` });
      setLocation("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary font-bold">إنشاء حساب جديد</CardTitle>
          <CardDescription>انضم إلى متجر الأفق المتجدد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoogleSignInButton onCredential={handleGoogleCredential} label="التسجيل بـ Google" />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">أو أنشئ حساباً</span>
            <Separator className="flex-1" />
          </div>

          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="phone">بالهاتف</TabsTrigger>
              <TabsTrigger value="email">بالبريد الإلكتروني</TabsTrigger>
            </TabsList>
            <TabsContent value="phone" className="mt-4">
              <PhoneRegisterForm />
            </TabsContent>
            <TabsContent value="email" className="mt-4">
              <EmailRegisterForm />
            </TabsContent>
          </Tabs>

          <div className="text-center text-sm">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              تسجيل الدخول
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
