from fastapi import HTTPException, Header
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


def _extract_token(authorization: str) -> str:
    """Parse 'Bearer <token>' → trả về token."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    return authorization.split(" ")[1]


async def get_current_user(authorization: str = Header(...)):
    """Xác thực JWT và trả về user object (có .id, .email)."""
    token = _extract_token(authorization)
    try:
        # Dùng client cơ bản để verify token
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        user = client.auth.get_user(token)
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalid or expired")


def get_user_supabase(authorization: str = Header(...)) -> Client:
    """
    Trả về Supabase client được gắn JWT của user.

    Tại sao cần điều này?
    - Client global trong database.py dùng anon key → auth.uid() = null
    - Client này gắn JWT → Supabase biết user là ai
    - RLS hoạt động đúng, auth.uid() trả về UUID của user
    - user_id column (DEFAULT auth.uid()) tự điền khi insert

    Analogy C++: giống truyền credentials vào một database connection riêng
    thay vì dùng chung một connection pool không có auth context.
    """
    token = _extract_token(authorization)
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        # Gắn JWT vào tất cả PostgREST request của client này
        client.postgrest.auth(token)
        return client
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalid or expired")
