# routers/categories.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter()

class CategoryCreate(BaseModel):
    name: str
    type: str        # 'income' hoặc 'expense'
    group_50_30_20: Optional[str] = None  # 'needs', 'wants', 'savings'

@router.get("")
def get_categories():
    result = supabase.table("categories").select("*").order("name").execute()
    return result.data

@router.post("")
def create_category(category: CategoryCreate):
    if category.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="type phải là 'income' hoặc 'expense'")
    if category.group_50_30_20 and category.group_50_30_20 not in ("needs", "wants", "savings"):
        raise HTTPException(status_code=400, detail="group_50_30_20 phải là 'needs', 'wants', hoặc 'savings'")
    
    result = supabase.table("categories").insert({
        "name": category.name,
        "type": category.type,
        "group_50_30_20": category.group_50_30_20
    }).execute()
    return result.data[0]


@router.delete("/{category_id}")
def delete_category(category_id: str):
    usage = (
        supabase.table("transactions")
        .select("id")
        .eq("category_id", category_id)
        .execute()
    )

    if usage.data:
        transaction_ids = [row["id"] for row in usage.data]
        supabase.table("transactions").update({"category_id": None}).in_("id", transaction_ids).execute()

    result = supabase.table("categories").delete().eq("id", category_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    return {"message": "Đã xoá danh mục", "id": category_id}


class CategoryUpdate(BaseModel):
    group_50_30_20: Optional[str] = None  # 'needs', 'wants', 'savings', or None to clear

@router.patch("/{category_id}")
def update_category(category_id: str, body: CategoryUpdate):
    if body.group_50_30_20 and body.group_50_30_20 not in ("needs", "wants", "savings"):
        raise HTTPException(status_code=400, detail="group_50_30_20 phải là 'needs', 'wants', hoặc 'savings'")
    result = supabase.table("categories").update({
        "group_50_30_20": body.group_50_30_20
    }).eq("id", category_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    return result.data[0]