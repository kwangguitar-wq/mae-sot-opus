import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME, ORG_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `เข้าสู่ระบบ — ${APP_NAME} ${ORG_NAME}` },
      { name: "description", content: "เข้าสู่ระบบเพื่อจัดการตารางงานประชาสัมพันธ์" },
      { property: "og:title", content: `เข้าสู่ระบบ — ${APP_NAME}` },
      { property: "og:description", content: "เข้าสู่ระบบเพื่อจัดการตารางงานประชาสัมพันธ์" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

const signupSchema = loginSchema
  .extend({
    full_name: z.string().trim().min(1, "กรุณาระบุชื่อ-นามสกุล").max(100),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "รหัสผ่านไม่ตรงกัน", path: ["confirm"] });

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<z.infer<typeof signupSchema>>({ resolver: zodResolver(signupSchema) });

  async function onLogin(values: z.infer<typeof loginSchema>) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setLoading(false);
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : error.message,
      );
      return;
    }
    toast.success("เข้าสู่ระบบสำเร็จ");
    navigate({ to: "/dashboard", replace: true });
  }

  async function onSignup(values: z.infer<typeof signupSchema>) {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("สมัครสมาชิกสำเร็จ — กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
      return;
    }
    toast.success("สมัครสมาชิกสำเร็จ");
    navigate({ to: "/dashboard", replace: true });
  }

  async function onReset() {
    const email = loginForm.getValues("email");
    if (!loginSchema.shape.email.safeParse(email).success) {
      loginForm.setError("email", { message: "กรุณากรอกอีเมลที่ถูกต้องก่อน" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว");
      setResetMode(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gold">
            <Building2 className="size-7 text-gold-foreground" />
          </div>
          <h1 className="text-xl font-bold text-sidebar-foreground">{APP_NAME}</h1>
          <p className="text-sm text-sidebar-foreground/70">{ORG_NAME}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">เข้าสู่ระบบ</CardTitle>
            <CardDescription>สำหรับเจ้าหน้าที่ฝ่ายประชาสัมพันธ์</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
                <TabsTrigger value="signup">สมัครสมาชิก</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">อีเมล</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  {!resetMode && (
                    <div className="space-y-1.5">
                      <Label htmlFor="password">รหัสผ่าน</Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        {...loginForm.register("password")}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-xs text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                  )}
                  {resetMode ? (
                    <div className="space-y-2">
                      <Button type="button" className="w-full" onClick={onReset} disabled={loading}>
                        {loading ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => setResetMode(false)}
                      >
                        กลับไปเข้าสู่ระบบ
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setResetMode(true)}
                        className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
                      >
                        ลืมรหัสผ่าน?
                      </button>
                    </>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">ชื่อ-นามสกุล</Label>
                    <Input id="full_name" {...signupForm.register("full_name")} />
                    {signupForm.formState.errors.full_name && (
                      <p className="text-xs text-destructive">
                        {signupForm.formState.errors.full_name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">อีเมล</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      {...signupForm.register("email")}
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-xs text-destructive">
                        {signupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">รหัสผ่าน</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      {...signupForm.register("password")}
                    />
                    {signupForm.formState.errors.password && (
                      <p className="text-xs text-destructive">
                        {signupForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">ยืนยันรหัสผ่าน</Label>
                    <Input
                      id="confirm"
                      type="password"
                      autoComplete="new-password"
                      {...signupForm.register("confirm")}
                    />
                    {signupForm.formState.errors.confirm && (
                      <p className="text-xs text-destructive">
                        {signupForm.formState.errors.confirm.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    ผู้ใช้คนแรกของระบบจะได้รับสิทธิ์ผู้ดูแลระบบ (Admin) โดยอัตโนมัติ
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
