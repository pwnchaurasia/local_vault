import os
from utils import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL,
                       connect_args={"check_same_thread": False},
                       pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False,
                            autoflush=False,
                            bind=engine)



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
