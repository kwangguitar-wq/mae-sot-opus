import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DatabaseBackup, Upload, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { backupData, restoreData } from "@/lib/admin.functions";
import { downloadJSON } from "@/lib/export";
import { APP_NAME, ORG_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAccess } from "@/components/AppLayout";

export const Route = createFileRoute("/_authenticated/backup")({
  head: () => ({
    meta: [
      { title: `สำรองและกู้คืนข้อมูล — ${APP_NAME} ${ORG_NAME}` },
      { name: "description", content: "สำรองข้อมูลระบบเป็นไฟล์ และกู้คืนข้อมูลโดยผู้ดูแลระบบพร้อมการยืนยันก่อนทำรายการ" },
      { property: "og:title", content: `สำรองและกู้คืนข้อมูล — ${APP_NAME}` },
      { property: "og:description", content: "สำรองและกู้คืนข้อมูลระบบตารางงานประชาสัมพันธ์" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BackupPage,
});

function BackupPage() {
  const { data: access } = useAccess();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState<any | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  if (!access?.isAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">หน้านี้ใช้ได้เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น</p>
      </div>
    );
  }

  async function doBackup() {
    setBusy(true);
    try {
      const data = await backupData({});
      downloadJSON(`backup-${new Date().toISOString().slice(0, 10)}.json`, data);
      toast.success("สำรองข้อมูลเรียบร้อยแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สำรองข้อมูลไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!json?.meta || !json?.data) throw new Error("รูปแบบไฟล์สำรองไม่ถูกต้อง");
      setPayload(json);
      setConfirmText("");
      setOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อ่านไฟล์ไม่สำเร็จ");
    }
  }

  async function doRestore() {
    if (!payload) return;
    setBusy(true);
    try {
      await restoreData({ data: { backup: payload, confirm: "RESTORE" } });
      toast.success("กู้คืนข้อมูลเรียบร้อยแล้ว");
      setOpen(false);
      setPayload(null);
      if (fileRef.current) fileRef.current.value = "";
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "กู้คืนข้อมูลไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold lg:text-2xl">สำรองและกู้คืนข้อมูล</h1>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DatabaseBackup className="size-4" /> สำรองข้อมูล</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            ดาวน์โหลดข้อมูลทั้งระบบ (ผู้ใช้ สิทธิ์ ประเภทงาน สถานที่ งาน ผู้รับผิดชอบ การแจ้งเตือน และการตั้งค่า) เป็นไฟล์ JSON
          </p>
          <Button onClick={doBackup} disabled={busy}>
            {busy ? "กำลังสำรอง..." : "ดาวน์โหลดไฟล์สำรอง"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="size-4" /> กู้คืนข้อมูล</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">
            คำเตือน: การกู้คืนจะเขียนทับข้อมูลปัจจุบันทั้งหมด กรุณาสำรองข้อมูลล่าสุดก่อนดำเนินการ
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="backup-file">เลือกไฟล์สำรอง (.json)</Label>
            <Input
              id="backup-file"
              ref={fileRef}
              type="file"
              accept="application/json"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setPayload(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการกู้คืนข้อมูล</AlertDialogTitle>
            <AlertDialogDescription>
              ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลจากไฟล์สำรอง พิมพ์ RESTORE เพื่อยืนยัน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESTORE" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doRestore(); }}
              disabled={busy || confirmText !== "RESTORE"}
            >
              {busy ? "กำลังกู้คืน..." : "กู้คืนข้อมูล"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
