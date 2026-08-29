# Mae Sot PR Calendar

สร้างเว็บแอปชื่อ “ตารางงานฝ่ายประชาสัมพันธ์ เทศบาลนครแม่สอด” ให้เป็นระบบใช้งานจริง Full-stack TypeScript + Tailwind + shadcn/ui และใช้ฐานข้อมูลจริง PostgreSQL/Supabase ของ Lovable โดยออกแบบ UI ภาษาไทยที่สวยงาม ทันสมัย เป็นมืออาชีพ เน้นการใช้งานบนมือถือและเดสก์ท็อป responsive

ข้อกำหนดหลัก:

1. Dashboard หน้าแรก: สรุปงานวันนี้/สัปดาห์/เดือน, งานด่วน, งานค้าง, สถิติตามประเภท/สถานะ/ผู้รับผิดชอบ และกราฟที่อ่านง่าย
2. Calendar รองรับมุมมอง รายวัน / สัปดาห์ / เดือน / ปี พร้อมคลิกดูรายละเอียดและสร้างงาน
3. จัดการงาน: เพิ่ม / แก้ไข / ลบ / ดูรายละเอียดงาน โดยข้อมูลประกอบด้วย ชื่องาน, รายละเอียด, ประเภทงาน, วันที่, เวลาเริ่ม-สิ้นสุดแบบ 24 ชั่วโมง, ผู้รับผิดชอบหลายคน, สถานที่, ระดับความสำคัญ, สถานะ, หมายเหตุ และไฟล์แนบถ้าจำเป็น
4. ประเภทงาน: ข่าวประชาสัมพันธ์, เผยแพร่ Facebook/Website/Online, ถ่ายภาพ/วิดีโอ, ผลิตสื่อ, ลงพื้นที่ประชาสัมพันธ์, กิจกรรม/พิธีการ, ถ่ายทอดสด
5. ค้นหาและกรองงานตามคำค้น วันที่ ประเภท สถานะ ความสำคัญ ผู้รับผิดชอบ และสถานที่
6. ผู้รับผิดชอบเลือกได้มากกว่า 1 คน
7. ระบบแจ้งเตือนภายในเว็บ และเตรียมโครงสร้างสำหรับแจ้งเตือนผ่าน LINE โดยไม่หลอกว่าการส่ง LINE ใช้งานได้หากยังไม่มี credentials: ทำ integration layer/config ที่ชัดเจน และแสดงสถานะการเชื่อมต่อ
8. Authentication: Login, Admin/Staff, สิทธิ์ผู้ใช้แบบละเอียด สามารถกำหนดว่าผู้ใช้แต่ละคนจัดการหัวข้อ/โมดูลใดได้บ้าง พร้อม route/action guards
9. Audit Log บันทึกผู้ทำรายการ เวลา การกระทำ และข้อมูลสำคัญที่เปลี่ยนแปลง
10. Export Excel/CSV และพิมพ์ A4/PDF ให้จัดรูปแบบสวยงาม
11. Backup/Restore: สร้างระบบสำรอง/กู้คืนข้อมูลที่เหมาะกับสิทธิ์ Admin พร้อมยืนยันก่อนทำรายการ
12. ฐานข้อมูลจริง: ออกแบบ schema สำหรับ profiles/users, roles, permissions, work_items, work_assignees, categories, locations, notifications, audit_logs และ settings พร้อม indexes, constraints, timestamps และ Row Level Security ตามบทบาท
13. ตรวจ validation/error handling ทุกฟอร์มและทุก action มี loading/empty/error/success states, toast และ confirmation dialog สำหรับลบ/กู้คืน
14. ตรวจปุ่มทุกปุ่มไม่ให้เป็น placeholder; ทุกเมนูต้องนำไปหน้าที่มีจริงและเชื่อมโยงกันครบ
15. Responsive มือถือ: bottom navigation/เมนูที่ใช้งานง่าย, calendar และตารางปรับตามจอ
16. ดีไซน์: โทนองค์กรราชการร่วมสมัย สุภาพ โปร่ง อ่านง่าย ใช้ typography ภาษาไทยที่ชัดเจน, cards, badges, icons, spacing และ responsive layout อย่างมืออาชีพ
17. ใส่ seed/demo data สำหรับทดสอบ โดยต้องแยกชัดเจนและสามารถลบข้อมูลตัวอย่างได้
18. ก่อนจบงานให้ตรวจ flow สำคัญทั้งหมด: login -> dashboard -> calendar -> create/edit/delete/view -> search/filter -> permissions -> notifications -> audit log -> export/print -> backup/restore และแก้ error ที่พบ
19. เพิ่มหน้า Settings สำหรับจัดการผู้ใช้ สิทธิ์ ประเภทงาน สถานที่ และการตั้งค่าแจ้งเตือน/LINE
20. เตรียมระบบให้พร้อม deploy และแสดงข้อความ/สถานะที่ชัดเจนเมื่อฟีเจอร์ภายนอก เช่น LINE credentials ยังไม่ได้ตั้งค่า

ขอให้เริ่มสร้างโปรเจกต์จริงทั้งหมด ไม่ใช่แค่ mockup และให้จัดโครงสร้างโค้ดให้ดูแลต่อได้ง่าย

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mee-sot-opus.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3f7dd87a-9001-4ee5-a99f-b34c1916ea64).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
