#!/usr/bin/env python3
"""
Seed script para criar o superadmin no banco de produção.
Executar dentro do container backend ou com acesso ao MongoDB.
"""
import hashlib
import secrets
import uuid
import sys
from datetime import datetime, timezone

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${hashed}"

def main():
    from pymongo import MongoClient
    import os
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://db:27017')
    db_name = os.environ.get('DB_NAME', 'midiateam_prod')
    
    client = MongoClient(mongo_url)
    db = client[db_name]
    
    print(f"📦 Conectado ao MongoDB: {mongo_url}/{db_name}")
    
    # ============================================================
    # 1. Criar entidade padrão se não existir
    # ============================================================
    default_entity = db.entities.find_one({"name": "Padrão"})
    if not default_entity:
        entity_id = f"entity_{uuid.uuid4().hex[:12]}"
        default_entity = {
            "entity_id": entity_id,
            "name": "Padrão",
            "description": "Organização padrão do sistema",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.entities.insert_one(default_entity)
        print(f"✅ Entidade 'Padrão' criada: {entity_id}")
    else:
        entity_id = default_entity["entity_id"]
        print(f"ℹ️  Entidade 'Padrão' já existe: {entity_id}")
    
    # ============================================================
    # 2. Criar superadmin
    # ============================================================
    email = "danilo@tomich.com.br"
    password = "Aqz.12589.fe"
    name = "Danilo Tomich"
    
    existing = db.registered_users.find_one({"email": email})
    
    if existing:
        # Atualizar APENAS permissões (NÃO sobrescrever senha!)
        update_fields = {
            "role": "superadmin",
            "is_superadmin": True,
            "is_admin": True,
            "is_active": True,
        }
        # Só definir senha se o usuário não tiver uma ainda
        if not existing.get("password_hash"):
            update_fields["password_hash"] = hash_password(password)
            print(f"   🔑 Senha definida (usuário não tinha senha)")
        
        db.registered_users.update_one(
            {"email": email},
            {"$set": update_fields}
        )
        user_id = existing["user_id"]
        print(f"✅ Superadmin ATUALIZADO (permissões): {email} (user_id: {user_id})")
        print(f"   ℹ️  Senha NÃO foi alterada (preservada)")
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "name": name,
            "email": email,
            "password_hash": hash_password(password),
            "role": "superadmin",
            "is_superadmin": True,
            "is_admin": True,
            "is_active": True,
            "entities": [entity_id],
            "current_entity": entity_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.registered_users.insert_one(new_user)
        print(f"✅ Superadmin CRIADO: {email} (user_id: {user_id})")
    
    # ============================================================
    # 3. Criar membro na entidade padrão
    # ============================================================
    existing_member = db.members.find_one({"user_id": user_id, "entity_id": entity_id})
    if not existing_member:
        db.members.insert_one({
            "member_id": f"member_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "entity_id": entity_id,
            "name": name,
            "email": email,
            "roles": ["Administrador"],
            "department": "Administração",
            "active": True,
            "is_admin": True,
            "can_vote": True,
            "points": 100,
            "badges": ["first_login"],
            "level": 5,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        print(f"✅ Membro criado na entidade '{default_entity['name']}'")
    else:
        print(f"ℹ️  Membro já existe na entidade '{default_entity['name']}'")
    
    print()
    print("🎉 Seed concluído!")
    print(f"   Login: {email}")
    print(f"   Senha: {password}")
    print(f"   Role:  superadmin (acesso total)")

if __name__ == "__main__":
    main()
