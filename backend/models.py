from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text

from database import Base


class User(Base):
  __tablename__ = "users"

  id = Column(Integer, primary_key=True, index=True)
  email = Column(String(255), unique=True, index=True, nullable=False)
  password_hash = Column(String(255), nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ExamAttempt(Base):
  __tablename__ = "exam_attempts"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
  score = Column(Integer, nullable=False)
  accuracy = Column(Float, nullable=False)
  completion_time = Column(Integer, nullable=False)
  error_types = Column(Text, nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
