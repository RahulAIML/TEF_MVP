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

JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_me")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
auth_scheme = HTTPBearer()
optional_auth_scheme = HTTPBearer(auto_error=False)


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


def _get_or_create_demo_user(db: Session) -> User:
  demo_email = "demo@tef.local"
  user = db.query(User).filter(User.email == demo_email).first()
  if user:
    return user

  user = User(email=demo_email, password_hash=hash_password("demo_pass_123"))
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def get_optional_user(
  credentials: HTTPAuthorizationCredentials | None = Depends(optional_auth_scheme),
  db: Session = Depends(get_db)
) -> User:
  if credentials is None:
    return _get_or_create_demo_user(db)

  token = credentials.credentials
  try:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    subject: Optional[str] = payload.get("sub")
  except JWTError:
    return _get_or_create_demo_user(db)

  if not subject:
    return _get_or_create_demo_user(db)

  user = db.query(User).filter(User.email == subject).first()
  if not user:
    return _get_or_create_demo_user(db)

  return user
