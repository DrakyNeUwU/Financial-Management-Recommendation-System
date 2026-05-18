# Financial Management Recommendation System (FMRS)

Ứng dụng theo dõi và phân tích tài chính cá nhân. Ghi chép thu chi, xem biến động theo ngày, phân loại danh mục theo quy tắc 50/30/20, và nhận gợi ý tài chính thông minh.

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Backend** | Python 3 + FastAPI + Uvicorn |
| **Database** | Supabase (PostgreSQL) |
| **Frontend** | Next.js (TypeScript) |
| **Auth** | Supabase Auth + JWT |
| **Deploy** | Railway (backend) |
| **Env** | python-dotenv |

## Cấu trúc project

```
Financial-Management-Recommendation-System/
├── .env                        ← secrets (KHÔNG commit)
├── .gitignore
├── requirements.txt            ← Python dependencies
├── Procfile                    ← Railway start command
├── database.py                 ← khởi tạo kết nối Supabase
├── auth.py                     ← xác thực JWT / Supabase Auth
├── main.py                     ← FastAPI app chính, CORS, routers
├── README.md
├── routers/
│   ├── __init__.py
│   ├── categories.py           ← CRUD danh mục
│   └── transactions.py         ← CRUD + thống kê giao dịch
└── frontend/                   ← Next.js app
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx        ← trang chính
    │   │   └── dashboard/      ← dashboard tài chính
    │   └── lib/
    │       ├── api.ts          ← gọi backend API
    │       └── supabase.ts     ← Supabase client
    └── package.json
```

## Setup

### 1. Clone repo

```bash
git clone https://github.com/DrakyNeUwU/Financial-Management-Recommendation-System.git
cd Financial-Management-Recommendation-System
```

### 2. Cài thư viện Python

```bash
pip install -r requirements.txt
```

### 3. Tạo file `.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

> Lấy URL và KEY từ Supabase Dashboard → Project Settings → API

### 4. Tạo bảng trên Supabase

Chạy trong Supabase SQL Editor:

```sql
-- Bảng danh mục
CREATE TABLE categories (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id        UUID REFERENCES auth.users ON DELETE CASCADE,
    name           TEXT NOT NULL,
    type           TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    group_50_30_20 TEXT CHECK (group_50_30_20 IN ('needs', 'wants', 'savings')),
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- Bảng giao dịch
CREATE TABLE transactions (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID REFERENCES auth.users ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    amount      DECIMAL(12, 2) NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    date        DATE NOT NULL,
    note        TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

> **Dev mode:** RLS đang tắt trên cả 2 bảng. Bật lại khi triển khai Auth.

### 5. Chạy backend

```bash
python -m uvicorn main:app --reload
```

### 6. Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

| URL | Mô tả |
|-----|-------|
| `http://localhost:8000` | Backend API root |
| `http://localhost:8000/docs` | Swagger UI tự động |
| `http://localhost:3000` | Frontend Next.js |

## Deploy lên Railway

1. Push code lên GitHub
2. Tạo project mới trên [Railway](https://railway.app) → connect GitHub repo
3. Thêm **Environment Variables** trong Railway dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
4. Railway tự detect `Procfile` và deploy

## API Endpoints

### `/transactions`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/transactions` | Tạo giao dịch mới |
| `GET` | `/transactions?month=MM-YYYY` | Lấy giao dịch trong tháng |
| `GET` | `/transactions/daily-summary?month=MM-YYYY` | Tổng chi tiêu theo ngày |
| `DELETE` | `/transactions/{id}` | Xoá giao dịch |

**POST /transactions — Request body:**
```json
{
  "type": "expense",
  "amount": 50000,
  "category_id": "uuid-của-danh-mục",
  "transaction_date": "2026-05-16",
  "note": "cà phê sáng"
}
```

> `note` là optional. `transaction_date` format `YYYY-MM-DD`.

---

### `/categories`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/categories` | Lấy tất cả danh mục |
| `POST` | `/categories` | Tạo danh mục mới |
| `DELETE` | `/categories/{id}` | Xoá danh mục |

**POST /categories — Request body:**
```json
{
  "name": "Ăn uống",
  "type": "expense",
  "group_50_30_20": "needs"
}
```

> `group_50_30_20` chỉ áp dụng cho `expense`. Các giá trị hợp lệ: `needs`, `wants`, `savings`.

> **Lưu ý khi xoá danh mục:** Nếu danh mục đang được dùng trong giao dịch, các giao dịch đó sẽ bị set `category_id = null` trước khi xoá.

---

### `/health`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/` | `{"message": "Finance App đang chạy!"}` |
| `GET` | `/health` | `{"status": "ok", "supabase": "connected"}` |
| `GET` | `/docs` | Swagger UI (FastAPI built-in) |

## Test nhanh trên PowerShell

```powershell
# Health check
irm "http://localhost:8000/health"

# Lấy danh mục
irm "http://localhost:8000/categories" | ConvertTo-Json -Depth 5

# Lấy giao dịch tháng 5/2026
irm "http://localhost:8000/transactions?month=05-2026" | ConvertTo-Json -Depth 5

# Thêm giao dịch
irm "http://localhost:8000/transactions" -Method POST -ContentType "application/json" `
  -Body '{"type":"expense","amount":50000,"category_id":"your-uuid","transaction_date":"2026-05-16","note":"test"}'

# Xoá giao dịch
irm "http://localhost:8000/transactions/your-uuid" -Method DELETE

# Thêm danh mục
irm "http://localhost:8000/categories" -Method POST -ContentType "application/json" `
  -Body '{"name":"Ăn uống","type":"expense","group_50_30_20":"needs"}'

# Xoá danh mục
irm "http://localhost:8000/categories/your-uuid" -Method DELETE
```

## Lưu ý

- File `.env` đã có trong `.gitignore` — **không commit lên GitHub**
- Thêm biến môi trường trực tiếp trên Railway dashboard khi deploy
- RLS đang tắt trên cả 2 bảng (dev mode) — bật lại khi làm Auth production
- CORS đang để `allow_origins=["*"]` — giới hạn lại khi deploy production
- Ô số tiền hỗ trợ biểu thức: nhập `33000+36000` → tự tính ra `69000`

---

## 🎨 Cập nhật UI & Analytics

- **Landing Page & Auth (Tự động):** Tích hợp giao diện Split Layout cực kỳ hiện đại ngay trên trang chủ (`/`), hiển thị tính năng cốt lõi và form đăng nhập cùng lúc.
- **Typography:** Đã chuyển toàn bộ font chữ sang **Inter** để tối ưu hiển thị số liệu tài chính.
- **Analytics:** Hỗ trợ tích hợp [PostHog](https://posthog.com) cho Frontend (theo dõi sự kiện người dùng và mức độ tương tác).
