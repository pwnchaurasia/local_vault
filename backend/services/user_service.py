from sqlalchemy.orm import Session
from db.models import User
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class UserService:
    @staticmethod
    def create_user_by_phone_number(phone_number: str, db: Session) -> Optional[User]:
        """Create or get user by phone number"""
        try:
            # Check if user already exists
            existing_user = db.query(User).filter(User.phone_number == phone_number).first()
            if existing_user:
                # Update verification status
                existing_user.is_phone_verified = True
                existing_user.is_active = True
                db.commit()
                db.refresh(existing_user)
                return existing_user
            
            # Create new user
            new_user = User(
                phone_number=phone_number,
                is_phone_verified=True,
                is_active=True
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            logger.info(f"New user created with phone: {phone_number}")
            return new_user
            
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            db.rollback()
            return None
    
    @staticmethod
    def get_user_by_phone(phone_number: str, db: Session) -> Optional[User]:
        """Get user by phone number"""
        return db.query(User).filter(User.phone_number == phone_number).first()
    
    @staticmethod
    def get_user_by_id(user_id: int, db: Session) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def update_user_profile(user_id: int, name: str = None, email: str = None, db: Session = None) -> Optional[User]:
        """Update user profile information"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            
            if name:
                user.name = name
            if email:
                user.email = email
                user.is_email_verified = False  # Reset email verification
            
            db.commit()
            db.refresh(user)
            return user
            
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            db.rollback()
            return None
