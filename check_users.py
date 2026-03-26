#!/usr/bin/env python3
"""Script para verificar usuários no banco"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import hashlib

async def check_users():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["midiateam_local"]
    
    print("=" * 60)
    print("VERIFICANDO USUÁRIOS NO BANCO")
    print("=" * 60)
    
    # Verificar pending registrations
    print("\n📋 REGISTROS PENDENTES:")
    pending = await db.pending_registrations.find({}).to_list(100)
    for p in pending:
        print(f"  - {p['name']} ({p['email']}) - Status: {p['status']}")
    
    # Verificar registered users
    print("\n👤 USUÁRIOS REGISTRADOS:")
    users = await db.registered_users.find({}).to_list(100)
    for u in users:
        print(f"  - {u['name']} ({u['email']})")
        print(f"    user_id: {u['user_id']}")
        print(f"    is_admin: {u.get('is_admin', False)}")
        print(f"    is_active: {u.get('is_active', True)}")
        print(f"    password_hash: {u['password_hash'][:20]}...")
        print()
    
    # Verificar members
    print("\n👥 MEMBROS:")
    members = await db.members.find({}).to_list(100)
    for m in members:
        print(f"  - {m['name']} ({m['email']})")
        print(f"    member_id: {m['member_id']}")
        print(f"    user_id: {m.get('user_id', 'N/A')}")
        print(f"    is_admin: {m.get('is_admin', False)}")
        print()
    
    print("=" * 60)
    print(f"Total: {len(users)} usuários, {len(members)} membros, {len(pending)} pendentes")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(check_users())
