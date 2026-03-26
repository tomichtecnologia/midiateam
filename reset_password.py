#!/usr/bin/env python3
"""Script para resetar senha de um usuário"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import hashlib
import secrets

def hash_password(password: str) -> str:
    """Hash password using SHA256 with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${hashed}"

async def reset_password():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["midiateam_local"]
    
    email = "admin@midiateam.com"
    new_password = "admin123"
    
    # Hash da nova senha
    password_hash = hash_password(new_password)
    
    # Atualizar senha
    result = await db.registered_users.update_one(
        {"email": email},
        {"$set": {"password_hash": password_hash}}
    )
    
    if result.matched_count > 0:
        print(f"✅ Senha resetada com sucesso para {email}")
        print(f"   Nova senha: {new_password}")
        print(f"   Hash: {password_hash[:30]}...")
    else:
        print(f"❌ Usuário {email} não encontrado")

if __name__ == "__main__":
    asyncio.run(reset_password())
