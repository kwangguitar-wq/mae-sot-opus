import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME, ORG_NAME } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} ${ORG_NAME}` },
      {
        name: "description",
        content: `ระบบบริหารจัดการตารางงาน${APP_NAME} ${ORG_NAME} — ปฏิทินงาน มอบหมายผู้รับผิดชอบ แจ้งเตือน และรายงาน`,
      },
      { property: "og:title", content: `${APP_NAME} ${ORG_NAME}` },
      {
        property: "og:description",
        content: "ระบบบริหารจัดการตารางงานประชาสัมพันธ์ ปฏิทินงาน การมอบหมายงาน และรายงานสถิติ",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      navigate({ to: data.user ? "/dashboard" : "/auth", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
    </div>
  );
}
