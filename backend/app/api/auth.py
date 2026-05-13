from fastapi import APIRouter, Depends, HTTPException, Cookie, Response
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.models.user import User, Session as UserSession
from typing import Optional
import hashlib

router = APIRouter(prefix="/auth", tags=["auth"])

security = HTTPBearer(auto_error=False)

class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if len(request.username) < 2 or len(request.username) > 50:
        raise HTTPException(status_code=400, detail="用户名长度应为2-50个字符")
    
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="密码长度至少6位")
    
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    user = User(
        username=request.username,
        password_hash=hash_password(request.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"success": True, "message": "注册成功", "user_id": user.id}

@router.post("/login")
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    
    if not user or user.password_hash != hash_password(request.password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    session_id = UserSession.generate_session_id()
    session = UserSession(
        session_id=session_id,
        user_id=user.id
    )
    db.add(session)
    db.commit()
    
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax"
    )
    
    return {
        "success": True,
        "message": "登录成功",
        "user": {"id": user.id, "username": user.username},
        "session_id": session_id
    }

@router.get("/me")
async def get_current_user(
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    if not session_id:
        raise HTTPException(status_code=401, detail="未登录")
    
    session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=401, detail="会话已过期")
    
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    
    return {"id": user.id, "username": user.username}

@router.post("/logout")
async def logout(
    response: Response,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    if session_id:
        session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
        if session:
            db.delete(session)
            db.commit()
    
    response.delete_cookie(key="session_id")
    
    return {"success": True, "message": "退出成功"}
