import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse

from db.db_conn import get_db
from db.schemas import user_schema
from services.user_service import UserService
from utils import resp_msgs, app_logger
from utils.app_helper import generate_otp, verify_otp, create_refresh_token, create_auth_token, verify_user_from_token
from utils.app_logger import createLogger

from utils.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

logger = createLogger('app')


@router.post("/request-otp", status_code=status.HTTP_200_OK, name="request-otp")
async def request_otp(request: user_schema.UserRegistration):
    try:
        if request.phone_number:
            otp = generate_otp(identifier=request.phone_number, otp_type="mobile_verification")
            if not otp:
                return JSONResponse(
                    content={"status": "error", "message": resp_msgs.STATUS_404_MSG},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            content = {
                "status": "success",
                "message": "Otp sent to your mobile number. Please verify Using it",
            }

            return JSONResponse(
                content=content,
                status_code=status.HTTP_201_CREATED
            )
    except Exception as e:
        app_logger.exceptionlogs(f"Error in register user, Error: {e}")
        return JSONResponse(
            content={"status": "error", "message": resp_msgs.STATUS_500_MSG},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.post("/verify-otp", status_code=status.HTTP_200_OK, name="verify-otp")
async def verify_mobile_and_otp(request: user_schema.OTPVerification,
                                db: Session = Depends(get_db)):
    if not request.phone_number or not request.otp:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"status": "error", "message": "Please provide mobile number and OTP"}
        )

    is_verified = verify_otp(identifier=request.phone_number, otp_input=request.otp, otp_type="mobile_verification")

    if not is_verified:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"status": "error", "message": resp_msgs.INVALID_OTP}
        )

    try:
        user = UserService.create_user_by_phone_number(phone_number=request.phone_number, db=db)
        if not user:
            logger.info(f"Not able to create user get_or_create_user_by_phone_number")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "error", "message": resp_msgs.INVALID_OTP}
            )

        auth_token = create_auth_token(user)
        refresh_token = create_refresh_token(user)


        return JSONResponse(
            content={
                "access_token": auth_token,
                "refresh_token": refresh_token,
            },
            status_code=status.HTTP_201_CREATED
        )
    except Exception as e:
        app_logger.exceptionlogs(f"Error while finding or creating the user, Error {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"status": "error", "message": resp_msgs.STATUS_500_MSG}
        )


@router.get("/auth-validity", name="auth-validity")
async def health_check(
        current_user = Depends(get_current_user),
        db: Session = Depends(get_db)):

    return {
        "status": "healthy",
        "service": "LocalVault API",
        "version": "2.0.0"
    }
