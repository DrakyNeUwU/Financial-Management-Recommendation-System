from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from routers import transactions
from routers import categories 
from auth import get_current_user

app = FastAPI(title="Finance App")
# Thêm đoạn này
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(transactions.router, prefix="/transactions")
app.include_router(categories.router, prefix="/categories")
@app.get("/")
def root():
    return {"message": "Finance App đang chạy!"}

@app.get("/health")
def health_check():
    return {"status": "ok", "supabase": "connected"}