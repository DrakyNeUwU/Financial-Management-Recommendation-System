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
    allow_origins=[
        "http://localhost:3000",
        "https://financial-management-recommendation.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)
app.include_router(transactions.router, prefix="/transactions")
app.include_router(categories.router, prefix="/categories")
@app.get("/")
def root():
    return {"message": "Finance App đang chạy!"}

from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    # Log error on server (production: log to file/service)
    import sys
    print(f"Server Error: {exc}", file=sys.stderr)
    print(traceback.format_exc(), file=sys.stderr)
    
    # Return safe error message (no trace leak)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error"},
        headers={
            "Access-Control-Allow-Origin": "https://financial-management-recommendation.vercel.app",
            "Access-Control-Allow-Credentials": "true"
        }
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "supabase": "connected"}


