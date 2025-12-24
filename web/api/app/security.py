from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
import os

try:
    from cryptography.fernet import Fernet, InvalidToken
except ImportError:  # cryptography comes with python-jose[cryptography]
    Fernet = None  # type: ignore
    InvalidToken = Exception  # type: ignore

SECRET_KEY = os.getenv("SESSION_SECRET", "dev-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
GITHUB_TOKEN_ENCRYPTION_KEY = os.getenv("GITHUB_TOKEN_ENCRYPTION_KEY")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _get_fernet() -> Optional[Fernet]:
    """Return a Fernet instance if encryption key is configured and valid."""
    if not GITHUB_TOKEN_ENCRYPTION_KEY or not Fernet:
        return None
    try:
        return Fernet(GITHUB_TOKEN_ENCRYPTION_KEY)
    except Exception:
        return None


def encrypt_token(token: Optional[str]) -> Optional[str]:
    """Encrypt a token using Fernet if available; otherwise return as-is."""
    if not token:
        return token
    fernet = _get_fernet()
    if not fernet:
        return token
    return fernet.encrypt(token.encode()).decode()


def decrypt_token(token: Optional[str]) -> Optional[str]:
    """Decrypt a stored token; return None if decryption fails."""
    if not token:
        return token
    fernet = _get_fernet()
    if not fernet:
        return token
    try:
        return fernet.decrypt(token.encode()).decode()
    except InvalidToken:
        return None
    except Exception:
        return None

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
