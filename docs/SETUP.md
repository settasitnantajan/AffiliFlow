# AffiliFlow — Setup Guide

## ภาพรวม

AffiliFlow เป็นระบบ auto-generate วีดีโอ Shopee Video สำหรับ affiliate
- **เว็บ (Vercel)** — อัพโหลด, จัดคิว, ดูผลลัพธ์
- **Local (Mac)** — รัน pipeline ผลิตวีดีโอ (YouTube block cloud IP)

---

## 1. ติดตั้ง System Dependencies

### Node.js

```bash
# ใช้ Node 20+
node -v
```

### yt-dlp (ดาวน์โหลดวีดีโอ YouTube)

```bash
brew install yt-dlp
yt-dlp --version
```

### FFmpeg + FFprobe (ตัด/แปลงวีดีโอ)

```bash
brew install ffmpeg
ffmpeg -version
ffprobe -version
```

### Python 3.11 (สำหรับ SadTalker AI Video — optional)

```bash
brew install python@3.11
```

---

## 2. Clone & Install

```bash
git clone <repo-url>
cd AffiliFlow
npm install
```

---

## 3. Environment Variables

สร้างไฟล์ `.env.local` ที่ root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Groq AI (LLM + Vision)
GROQ_API_KEY=your-groq-api-key

# Pexels (stock video fallback)
PEXELS_API_KEY=your-pexels-api-key

# Login password
AUTH_PASSWORD=your-password

# Optional
SERPER_API_KEY=your-serper-key        # Google image search
PIPELINE_SECRET=your-secret           # API security header
```

### วิธีขอ API Keys

| Service | URL | ใช้ทำอะไร |
|---------|-----|-----------|
| Supabase | https://supabase.com | Database + Storage |
| Groq | https://console.groq.com | AI วิเคราะห์รูป + สร้างแคปชั่น |
| Pexels | https://www.pexels.com/api | วีดีโอ stock (fallback) |
| Serper | https://serper.dev | ค้นหารูปสินค้า (optional) |

---

## 4. Supabase Setup

### Database Tables

รัน migration files ใน `supabase/migrations/` ตามลำดับ:

```bash
# ใช้ Supabase CLI หรือรัน SQL ใน Dashboard
supabase db push
```

### Storage

สร้าง bucket ชื่อ `videos` ใน Supabase Storage (public)

---

## 5. รัน Dev Server

```bash
npm run dev
# เปิดที่ http://localhost:8888
```

---

## 6. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, shadcn/ui v4, Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| AI | Groq (Llama 3.3 70B, Llama 4 Scout Vision) |
| Video Download | yt-dlp, @ybd-project/ytdl-core |
| Video Processing | FFmpeg |
| Scraping | Cheerio |
| Deploy (Web) | Vercel |
| Deploy (Pipeline) | Local Mac + cron |

---

## 7. โครงสร้างโปรเจค

```
src/
├── app/                    # Next.js pages + API routes
│   ├── api/
│   │   ├── pipeline/       # run, status, run-items
│   │   ├── queue/          # CRUD queue items
│   │   ├── upload/         # อัพโหลดสินค้า
│   │   ├── videos/         # mark-posted
│   │   └── badge-counts/   # badge counts for nav
│   ├── queue/              # หน้าคิว
│   ├── videos/             # หน้าวีดีโอผลลัพธ์
│   ├── pipeline/           # หน้า pipeline status
│   ├── upload/             # หน้าอัพโหลด
│   └── settings/           # หน้าตั้งค่า
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── sidebar.tsx         # Navigation + badge counts
│   ├── queue-list.tsx      # Queue list + checkbox + run
│   ├── pipeline-runner.tsx # Pipeline progress tracker
│   └── copy-button.tsx     # Copy + mark posted
├── lib/
│   ├── ai/                 # Groq AI (vision, caption, hashtag)
│   ├── video/              # YouTube download, editor
│   ├── pipeline.ts         # Main pipeline orchestration
│   └── supabase-server.ts  # Supabase client
docs/
├── SETUP.md                # ไฟล์นี้
└── LOCAL-PIPELINE.md       # วิธีรัน pipeline + cron + pmset
```

---

## 8. Pipeline Flow

```
Upload สินค้า → เข้าคิว (queued)
                    ↓
Pipeline รัน (cron 08:00 หรือกดมือ)
                    ↓
1. หยิบจากคิว → 2. AI วิเคราะห์รูป → 3. ค้นหา+ดาวน์โหลดวีดีโอ YouTube
                    ↓
4. AI สร้างแคปชั่น+แฮชแท็ก → 5. บันทึกผลลัพธ์
                    ↓
หน้าวีดีโอ → กดคัดลอก → โพสต์ Shopee Video
```

---

ดูเพิ่มเติม: [LOCAL-PIPELINE.md](./LOCAL-PIPELINE.md) สำหรับวิธีตั้ง cron + pmset wake/sleep
