

# Local Pipeline Setup

## วิธีรัน Pipeline บนเครื่อง

Pipeline ต้องรันบน local เท่านั้น เพราะ YouTube block cloud IP (Vercel, Render, etc.)

### 1. เปิด dev server

```bash
cd /Users/duke/Documents/AffiliFlow
npm run dev -- -p 8888
```

เปิดไว้ตลอดเพื่อให้ cron เรียกได้

### 2. รัน pipeline มือ

```bash
curl -s -X POST http://localhost:8888/api/pipeline/run
```

### 3. ตั้ง cron รันทุกวัน 8:00 น.

```bash
(crontab -l 2>/dev/null; echo "0 8 * * * curl -s -X POST http://localhost:8888/api/pipeline/run >> /tmp/affiliflow-cron.log 2>&1") | crontab -
```

### 4. ดู cron ที่ตั้งไว้

```bash
crontab -l
```

### 5. ยกเลิก cron

```bash
crontab -r
```

### 6. ดู log

```bash
cat /tmp/affiliflow-cron.log
```

## Schedule & Sleep Management

Mac ต้องตื่นอยู่ตอน 8:00 น. เพื่อให้ cron รัน pipeline ได้ — ถ้าพับจอ (sleep) cron จะไม่ทำงาน

### ตั้ง pmset ให้ Mac ตื่นอัตโนมัติ 07:55

```bash
sudo pmset repeat wakeorpoweron MTWRFSU 07:55:00
```

- `wakeorpoweron` = ถ้า sleep จะ wake, ถ้าปิดเครื่องจะเปิดเครื่อง
- `MTWRFSU` = ทุกวัน (Mon-Sun)
- **Mac ต้องเสียบสายชาร์จ** pmset ถึงจะปลุกเครื่องได้

### ดู pmset schedule ที่ตั้งไว้

```bash
pmset -g sched
```

### ตั้ง pmset ให้ Mac หลับอัตโนมัติ 08:30

```bash
sudo pmset repeat wakeorpoweron MTWRFSU 07:55:00 sleep MTWRFSU 08:30:00
```

คำสั่งเดียวตั้งทั้ง wake + sleep ได้เลย (pmset repeat รับได้หลาย event)

### ยกเลิก pmset schedule ทั้งหมด

```bash
sudo pmset repeat cancel
```

### สรุป flow

1. **07:55** — pmset ปลุก Mac
2. **08:00** — cron รัน `curl -s -X POST http://localhost:8888/api/pipeline/run`
3. **08:30** — pmset สั่ง Mac หลับ
4. dev server ต้องเปิดไว้ (หรือตั้ง launchd ให้เปิดอัตโนมัติ)

## หมายเหตุ

- ต้องเปิดเครื่อง + เปิด dev server ไว้ ถึงจะรัน pipeline ได้
- Mac ต้องเสียบสายชาร์จ pmset ถึงจะปลุกเครื่องได้
- Vercel ใช้สำหรับเว็บ, upload, queue, แสดงผลเท่านั้น
- ผลลัพธ์เก็บใน Supabase → Vercel อ่านแสดงผลได้
