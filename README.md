# ai-finance

Ứng dụng theo dõi thu chi cá nhân. Ghi chép giao dịch, xem biến động chi tiêu theo ngày, phân loại theo danh mục .

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Backend** | Python 3 + FastAPI + Uvicorn |
| **Database** | Supabase (PostgreSQL) |
| **Frontend** | HTML / CSS / JS thuần — mở thẳng trên browser, không cần build |
| **Env** | python-dotenv |

## Cấu trúc project

```
ai-finance project/
├── .env                        ← secrets (KHÔNG commit)
├── .gitignore
├── database.py                 ← khởi tạo kết nối Supabase
├── main.py                     ← FastAPI app chính, CORS, routers
├── index.html                  ← giao diện người dùng
├── README.md
├── routers/
│   ├── __init__.py
│   ├── categories.py           ← CRUD danh mục
│   └── transactions.py         ← CRUD + thống kê giao dịch
└── second-brain/
    └── leaning/
        └── tuan 1/             ← ghi chép learnings theo ngày
            ├── ngay-0.md
            ├── ngay-4.md
            ├── ngay-5.md
            ├── ngay-6.md
            └── ngay-7.md
```

## Setup

### 1. Cài thư viện

```bash
pip install fastapi uvicorn supabase python-dotenv
```

### 2. Tạo file `.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

> Lấy URL và KEY từ Supabase Dashboard → Project Settings → API

### 3. Tạo bảng trên Supabase

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

## Chạy server

```powershell
python -m uvicorn main:app --reload
```

| URL | Mô tả |
|-----|-------|
| `http://localhost:8000` | Root — kiểm tra server sống |
| `http://localhost:8000/health` | Health check |
| `http://localhost:8000/docs` | Swagger UI tự động |

**Mở giao diện:** double-click `index.html` (hoặc mở bằng trình duyệt)

## API Endpoints

### `/transactions`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/transactions` | Tạo giao dịch mới |
| `GET` | `/transactions?month=MM-YYYY` | Lấy giao dịch trong tháng |
| `GET` | `/transactions/daily-summary?month=MM-YYYY` | Tổng chi tiêu (expense) theo ngày |
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

**GET /transactions/daily-summary — Response:**
```json
{
  "month": "05-2026",
  "data": [
    { "date": "2026-05-01", "total_expense": 120000 },
    { "date": "2026-05-03", "total_expense": 75000 }
  ]
}
```

> Chỉ tổng hợp các giao dịch loại `expense`.

---

### `/categories`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/categories` | Lấy tất cả danh mục (sắp xếp theo tên) |
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
| `GET` | `/` | Root — `{"message": "Finance App đang chạy!"}` |
| `GET` | `/health` | `{"status": "ok", "supabase": "connected"}` |
| `GET` | `/docs` | Swagger UI tự động (FastAPI built-in) |

## Test nhanh trên PowerShell

```powershell
# Health check
irm "http://localhost:8000/health"

# Lấy danh mục
irm "http://localhost:8000/categories" | ConvertTo-Json -Depth 5

# Lấy giao dịch tháng 5/2026
irm "http://localhost:8000/transactions?month=05-2026" | ConvertTo-Json -Depth 5

# Tổng chi tiêu theo ngày
irm "http://localhost:8000/transactions/daily-summary?month=05-2026" | ConvertTo-Json -Depth 5

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
- RLS đang tắt trên cả 2 bảng (dev mode) — bật lại khi làm Auth
- Ô số tiền hỗ trợ biểu thức: nhập `33000+36000` → tự tính ra `69000`
- CORS đang để `allow_origins=["*"]` — giới hạn lại khi deploy production
