from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import create_access_token, hash_password, verify_password
from database import get_db
from models import User
from schemas import AuthResponse, LoginRequest, SignupRequest, UserResponse

router = APIRouter(tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
  email = payload.email.lower().strip()
  existing = db.query(User).filter(User.email == email).first()
  if existing:
    raise HTTPException(status_code=400, detail="Email is already registered.")

  user = User(email=email, password_hash=hash_password(payload.password))
  db.add(user)
  db.commit()
  db.refresh(user)

  token = create_access_token(user.email)
  return AuthResponse(
    access_token=token,
    user=UserResponse(id=user.id, email=user.email, created_at=user.created_at)
  )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
  email = payload.email.lower().strip()
  user = db.query(User).filter(User.email == email).first()
  if not user or not verify_password(payload.password, user.password_hash):
    raise HTTPException(status_code=401, detail="Invalid email or password.")

  token = create_access_token(user.email)
  return AuthResponse(
    access_token=token,
    user=UserResponse(id=user.id, email=user.email, created_at=user.created_at)
  )
