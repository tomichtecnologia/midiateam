#!/usr/bin/env python3
"""Script para aprovar usuários pendentes no sistema local"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def approve_pending_users():
    # Conectar ao MongoDB local
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["midiateam_local"]
    
    # Buscar usuários pendentes
    pending = await db.pending_registrations.find({"status": "pending"}).to_list(100)
    
    if not pending:
        print("✅ Nenhum usuário pendente encontrado")
        return
    
    print(f"📋 Encontrados {len(pending)} usuários pendentes:\n")
    
    for reg in pending:
        print(f"  - {reg['name']} ({reg['email']})")
        
        # Criar usuário registrado
        new_user_id = reg.get('registration_id', '').replace('reg_', 'user_')
        new_user = {
            "user_id": new_user_id,
            "name": reg["name"],
            "email": reg["email"],
            "phone": reg.get("phone"),
            "password_hash": reg["password_hash"],
            "is_admin": True,  # Primeiro usuário é admin
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.registered_users.insert_one(new_user)
        
        # Buscar ou criar entidade padrão
        default_entity = await db.entities.find_one({"name": "Padrão"})
        if not default_entity:
            entity_id = "entity_default001"
            entity_doc = {
                "entity_id": entity_id,
                "name": "Padrão",
                "description": "Entidade padrão do sistema",
                "active": True,
                "custom_roles": ["operator", "editor", "camera", "sound", "social_media"],
                "custom_departments": ["production", "content", "development"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.entities.insert_one(entity_doc)
        else:
            entity_id = default_entity["entity_id"]
        
        # Criar membro
        member_id = reg.get('registration_id', '').replace('reg_', 'member_')
        new_member = {
            "member_id": member_id,
            "user_id": new_user_id,
            "entity_id": entity_id,
            "name": reg["name"],
            "email": reg["email"],
            "phone": reg.get("phone"),
            "roles": ["operator"],
            "department": "production",
            "active": True,
            "is_admin": True,
            "can_vote": True,
            "points": 0,
            "badges": [],
            "level": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.members.insert_one(new_member)
        
        # Atualizar registro como aprovado
        await db.pending_registrations.update_one(
            {"registration_id": reg["registration_id"]},
            {"$set": {
                "status": "approved",
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "approved_by": "system"
            }}
        )
        
        print(f"  ✅ {reg['name']} aprovado como admin!")
    
    print(f"\n✅ Todos os {len(pending)} usuários foram aprovados!")
    
    # Mostrar resumo
    total_users = await db.registered_users.count_documents({})
    total_members = await db.members.count_documents({})
    print(f"\n📊 Resumo:")
    print(f"  - Total de usuários registrados: {total_users}")
    print(f"  - Total de membros: {total_members}")

if __name__ == "__main__":
    asyncio.run(approve_pending_users())
