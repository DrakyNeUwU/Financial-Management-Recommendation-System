from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from decimal import Decimal
from datetime import date
from typing import Optional
from supabase import Client
from auth import get_user_supabase

router = APIRouter()

# --- Schema (giống struct trong C++) ---
class TransactionCreate(BaseModel):
    type: str                        # "income" hoặc "expense"
    amount: Decimal
    category_id: str
    note: Optional[str] = None
    transaction_date: str            # format: "YYYY-MM-DD"


# --- Endpoints ---
@router.post("")
def create_transaction(data: TransactionCreate, db: Client = Depends(get_user_supabase)):
    if data.type not in ["income", "expense"]:
        raise HTTPException(status_code=400, detail="type phải là 'income' hoặc 'expense'")

    # Không cần truyền user_id thủ công.
    # db đã gắn JWT → auth.uid() có giá trị → column user_id DEFAULT auth.uid() tự điền.
    result = db.table("transactions").insert({
        "type": data.type,
        "amount": float(data.amount),
        "category_id": data.category_id,
        "note": data.note,
        "date": data.transaction_date,
    }).execute()

    return {"message": "Tạo giao dịch thành công", "data": result.data}


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: str, db: Client = Depends(get_user_supabase)):
    # RLS tự bảo vệ: chỉ xoá được giao dịch của chính user
    result = db.table("transactions").delete().eq("id", transaction_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
    return {"message": "Đã xoá giao dịch", "id": transaction_id}


@router.get("")
def get_transactions(
    month: str = Query(..., description="Format: MM-YYYY"),
    db: Client = Depends(get_user_supabase)
):
    try:
        m, year = map(int, month.split("-"))
        start_date = date(year, m, 1)
        end_date = date(year + 1, 1, 1) if m == 12 else date(year, m + 1, 1)
    except ValueError:
        raise HTTPException(status_code=400, detail="month phải có format MM-YYYY")

    # RLS tự filter theo user — chỉ trả về giao dịch của chính họ
    response = (
        db.table("transactions")
        .select("*")
        .gte("date", start_date.isoformat())
        .lt("date", end_date.isoformat())
        .order("date", desc=False)
        .execute()
    )

    return {"data": response.data}


@router.get("/daily-summary")
def get_daily_summary(
    month: str = Query(..., description="Format: MM-YYYY"),
    db: Client = Depends(get_user_supabase)
):
    try:
        m, year = map(int, month.split("-"))
        start_date = date(year, m, 1)
        end_date = date(year + 1, 1, 1) if m == 12 else date(year, m + 1, 1)
    except ValueError:
        raise HTTPException(status_code=400, detail="month phải có format MM-YYYY")

    response = (
        db.table("transactions")
        .select("date, amount, type")
        .gte("date", start_date.isoformat())
        .lt("date", end_date.isoformat())
        .execute()
    )

    # Group by date, chỉ sum expense
    summary = {}
    for tx in response.data:
        if tx["type"] == "expense":
            d = tx["date"]
            summary[d] = summary.get(d, 0) + float(tx["amount"])

    result = [
        {"date": d, "total_expense": summary[d]}
        for d in sorted(summary.keys())
    ]

    return {"month": month, "data": result}