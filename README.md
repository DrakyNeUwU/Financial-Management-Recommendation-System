# 💰 Financial Management Recommendation System (FMRS)

Ứng dụng theo dõi và phân tích tài chính cá nhân được xây dựng với **Next.js** + **FastAPI** + **Supabase**. Ghi chép thu chi, xem biến động theo ngày, phân loại danh mục theo quy tắc **50/30/20**, và nhận gợi ý tài chính thông minh.

## ✨ Tính năng chính

### 📊 Dashboard Tài Chính
- **Biểu đồ chi tiêu theo ngày** — Xem trend chi tiêu với line chart interactif
- **Breakdown danh mục** — Doughnut chart hiển thị phân bố chi tiêu
- **So sánh tháng** — So sánh thu nhập & chi tiêu với tháng trước
- **Dự báo cuối tháng** — Tính toán chi tiêu dự kiến và số dư tháng này

### 🏠 Phân tích 50/30/20
- Phân loại chi tiêu thành 3 nhóm: **Thiết yếu (50%)**, **Muốn có (30%)**, **Tiết kiệm (20%)**
- Hiển thị trực quan với progress bar và cảnh báo khi vượt budget
- Gợi ý gán danh mục khi chưa có dữ liệu

### 💳 Quản lý giao dịch & danh mục
- Thêm giao dịch với **biểu thức toán học** (ví dụ: `33000+36000` → `69000`)
- Quản lý danh mục thu & chi với phân loại 50/30/20
- Collapse/expand form để tiết kiệm không gian
- Xem chi tiết giao dịch theo ngày với bảng dữ liệu

### 🔐 Xác thực
- Đăng nhập/đăng ký bằng **Supabase Auth**
- JWT token validation trên Backend
- Giao diện hiện đại với form validation

---

## 🏗️ Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | Next.js 16 (TypeScript, React 19) + Tailwind CSS |
| **Backend** | Python 3 + FastAPI + Uvicorn |
| **Database** | Supabase (PostgreSQL) |
| **Charts** | Chart.js + react-chartjs-2 |
| **Auth** | Supabase Auth + JWT |
| **Deploy** | Vercel (Frontend) + Railway (Backend) |

---

## 📁 Cấu trúc Project

```
ai-finance project/
├── .env                              ← Environment variables (không commit)
├── .gitignore
├── requirements.txt                  ← Python dependencies
├── Procfile                          ← Railway start command
├── README.md
├── main.py                           ← FastAPI app chính
├── auth.py                           ← JWT & Supabase Auth
├── database.py                       ← Supabase initialization
├── routers/
│   ├── __init__.py
│   ├── categories.py                 ← CRUD danh mục
│   └── transactions.py               ← CRUD & thống kê giao dịch
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── postcss.config.mjs
    ├── eslint.config.mjs
    ├── public/
    └── src/
        ├── app/
        │   ├── page.tsx              ← Dashboard chính
        │   ├── login/page.tsx        ← Login & Register
        │   ├── layout.tsx
        │   ├── globals.css           ← Styles toàn app
        │   └── dashboard/            ← Dashboard nested route
        └── lib/
            ├── api.ts                ← API client functions
            ├── supabase.ts           ← Supabase client config
            └── utils.ts              ← Format & utility functions
```

---

## 🚀 Cài đặt & Chạy

### Prerequisites
- Node.js 18+
- Python 3.8+
- Tài khoản Supabase
- (Optional) Railway account để deploy backend

### 1. Clone Repository

```bash
git clone https://github.com/DrakyNeUwU/Financial-Management-Recommendation-System.git
cd "ai-finance project"
```

### 2. Setup Backend

```bash
# Cài thư viện Python
pip install -r requirements.txt

# Tạo file .env
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
EOF

# Chạy server
python -m uvicorn main:app --reload
```

> Backend sẽ chạy tại `http://localhost:8000`
> Swagger UI tại `http://localhost:8000/docs`

### 3. Setup Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Tạo file .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

# Chạy dev server
npm run dev
```

> Frontend sẽ chạy tại `http://localhost:3000`

### 4. Setup Supabase (Database & Auth)

#### A. Tạo Tables

Chạy SQL script này trong **Supabase SQL Editor**:

```sql
-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL CHECK (type = ANY ('{income,expense}'::text[])),
    group_50_30_20 text CHECK (group_50_30_20 = ANY ('{needs,wants,savings}'::text[])),
    PRIMARY KEY (id)
);

-- 3. Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    amount numeric(12,2) NOT NULL,
    type text NOT NULL CHECK (type = ANY ('{income,expense}'::text[])),
    date date NOT NULL,
    note text,
    PRIMARY KEY (id)
);

-- 4. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
```

#### B. Enable Authentication
- Supabase Dashboard → Authentication → Providers
- Enable **Email** provider (default)
- Configure email templates nếu cần

---

## 📡 API Endpoints

### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "supabase": "connected"
}
```

---

### `POST /categories` — Tạo danh mục
**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "name": "Ăn uống",
  "type": "expense",
  "group_50_30_20": "needs"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Ăn uống",
  "type": "expense",
  "group_50_30_20": "needs",
  "user_id": "uuid",
  "created_at": "2026-05-19T..."
}
```

---

### `GET /categories` — Lấy danh mục
**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Ăn uống",
    "type": "expense",
    "group_50_30_20": "needs"
  }
]
```

---

### `DELETE /categories/{id}` — Xoá danh mục
**Headers:** `Authorization: Bearer {token}`

> ⚠️ Nếu danh mục có giao dịch, các giao dịch đó sẽ bị set `category_id = null`

---

### `POST /transactions` — Tạo giao dịch
**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "type": "expense",
  "amount": 50000,
  "category_id": "uuid",
  "transaction_date": "2026-05-19",
  "note": "Cà phê sáng"
}
```

**Response:**
```json
{
  "id": "uuid",
  "type": "expense",
  "amount": 50000,
  "category_id": "uuid",
  "date": "2026-05-19",
  "note": "Cà phê sáng",
  "user_id": "uuid",
  "created_at": "2026-05-19T..."
}
```

---

### `GET /transactions?month=MM-YYYY` — Lấy giao dịch trong tháng
**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "expense",
    "amount": 50000,
    "category_id": "uuid",
    "date": "2026-05-19",
    "note": "Cà phê"
  }
]
```

---

### `DELETE /transactions/{id}` — Xoá giao dịch
**Headers:** `Authorization: Bearer {token}`

---

## 🧪 Test API (PowerShell)

```powershell
# Health check
irm "http://localhost:8000/health"

# Lấy danh mục (cần token)
irm "http://localhost:8000/categories" -Headers @{
  "Authorization" = "Bearer YOUR_JWT_TOKEN"
}

# Tạo giao dịch
irm "http://localhost:8000/transactions" -Method POST `
  -ContentType "application/json" `
  -Headers @{"Authorization" = "Bearer YOUR_JWT_TOKEN"} `
  -Body '{"type":"expense","amount":50000,"category_id":"uuid","transaction_date":"2026-05-19","note":"test"}'
```

---

## 🎨 UI/UX Improvements (v1.2.0)

### Recent Updates
✅ **Amount Display** — Tối ưu font-size để hiển thị đủ 9 chữ số  
✅ **Month Comparison Colors** — Cải thiện logic màu: tăng = xanh ✓, giảm = đỏ ✗  
✅ **Form Collapse** — Form nhập liệu có thể collapse/expand để tiết kiệm không gian  
✅ **50/30/20 Suggestions** — Gợi ý gán nhóm cho danh mục khi chưa có dữ liệu  
✅ **Line Chart Tooltip** — Thêm ngày vào tooltip khi hover (ví dụ: "Ngày 15")  

### Design Features
- **Dark theme** với color scheme: Dark Blue, Neon Green, Red, Gray
- **Responsive layout** — Sidebar + Right column grid layout
- **Typography** — Inter font cho tối ưu tài chính
- **Charts** — Chart.js với custom tooltip & styling
- **Glassmorphism** — Auth page với blur effect modern

---

## � Bug Fixes & Improvements (v1.2.1)

✅ **Month Comparison Logic** — Fix bug khi đảo ngược tháng so sánh không hiển thị dữ liệu  
✅ **Negative Balance Display** — Hiển thị `~0đ/ngày` khi số dư dự kiến là âm  
✅ **PostHog Analytics** — Tích hợp tracking analytics để monitor user behavior  

---

## �🚢 Deployment

### Frontend (Vercel)
1. Push code lên GitHub
2. Kết nối repo với [Vercel](https://vercel.com)
3. Thêm Environment Variables trong Vercel Dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app
   ```
4. Deploy tự động khi push lên `main` branch

### Backend (Railway)
1. Tạo project trên [Railway](https://railway.app)
2. Connect GitHub repo
3. Add Environment Variables:
   ```
   SUPABASE_URL=...
   SUPABASE_KEY=...
   ```
4. Railway sẽ detect `Procfile` và deploy tự động

---

## 📝 Features Roadmap

- [ ] Budget alerts & notifications
- [ ] Export data to CSV/PDF
- [ ] Multi-currency support
- [ ] Recurring transactions
- [ ] Investment tracking
- [ ] Mobile app (React Native)
- [ ] Advanced analytics & insights

---

## 🔐 Security Notes

- `.env` file đã trong `.gitignore` — **không commit credentials**
- RLS (Row Level Security) tắt trong dev mode — **bật lại trên production**
- CORS chỉ cho phép từ Vercel frontend + localhost
- JWT token được validate trên mỗi request

---

## 📚 Documentation

- **FastAPI Docs:** `http://localhost:8000/docs` (Swagger UI)
- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **Chart.js Docs:** https://www.chartjs.org/docs

---

## 🤝 Contributing

Contributions được chào đón! Vui lòng:
1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

MIT License — Xem [LICENSE](LICENSE) file cho chi tiết

---

## 👨‍💻 Author

**Khanh Nguyen** — [GitHub](https://github.com/DrakyNeUwU)

---

## 📞 Support

Nếu có vấn đề:
1. Check [GitHub Issues](https://github.com/DrakyNeUwU/Financial-Management-Recommendation-System/issues)
2. Xem setup instructions lại
3. Kiểm tra Supabase connection
4. Tạo issue mới nếu problem không solve được

---

**Last Updated:** May 19, 2026  
**Version:** 1.2.0
