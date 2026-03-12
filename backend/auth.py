import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

if not JWT_SECRET:
  raise RuntimeError("JWT_SECRET is not set.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
auth_scheme = HTTPBearer()


def hash_password(password: str) -> str:
  return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
  return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
  expire = datetime.now(tz=timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
  payload = {"sub": subject, "exp": expire}
  return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
  credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
  db: Session = Depends(get_db)
) -> User:
  token = credentials.credentials
  try:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    subject: Optional[str] = payload.get("sub")
  except JWTError as exc:
    raise HTTPException(status_code=401, detail="Invalid authentication token.") from exc

  if not subject:
    raise HTTPException(status_code=401, detail="Invalid authentication token.")

  user = db.query(User).filter(User.email == subject).first()
  if not user:
    raise HTTPException(status_code=401, detail="User not found.")

  return user
