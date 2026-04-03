from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text

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


class ListeningAttempt(Base):
  __tablename__ = "listening_attempts"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
  score = Column(Integer, nullable=False)
  total = Column(Integer, nullable=False)
  accuracy = Column(Float, nullable=False)
  completion_time = Column(Integer, nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class WritingSession(Base):
  __tablename__ = "writing_sessions"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
  session_id = Column(String(64), unique=True, index=True, nullable=False)
  mode = Column(String(20), nullable=False)
  task1_prompt = Column(Text, nullable=True)
  task2_prompt = Column(Text, nullable=True)
  task1_steps = Column(Text, nullable=True)
  task2_steps = Column(Text, nullable=True)
  task1_text = Column(Text, nullable=True)
  task2_text = Column(Text, nullable=True)
  task1_evaluation = Column(Text, nullable=True)
  task2_evaluation = Column(Text, nullable=True)
  is_submitted = Column(Boolean, default=False, nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class LearnSession(Base):
  __tablename__ = "learn_sessions"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
  source_type = Column(String(20), nullable=False)  # text, pdf, image, chat
  topic = Column(String(200), nullable=True)
  level = Column(String(10), nullable=True)
  score = Column(Float, nullable=True)
  grammar = Column(Float, nullable=True)
  vocabulary = Column(Float, nullable=True)
  structure = Column(Float, nullable=True)
  exercises_total = Column(Integer, default=0, nullable=False)
  exercises_completed = Column(Integer, default=0, nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

