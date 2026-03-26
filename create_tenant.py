from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import asyncio
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Carregar variáveis de ambiente
env_path = Path(__file__).parent / 'backend/.env'
load_dotenv(env_path)

async def create_tenant():
    mongo_url = os.getenv('MONGO_URL', "mongodb://localhost:27017")
    print(f"Conectando ao MongoDB: {mongo_url}")
    client = AsyncIOMotorClient(mongo_url)
    
    # Tentar descobrir qual banco usar
    # O usuário provavelmente está usando tomiagenda ou midiateam_local
    # Vamos listar os bancos e perguntar ou tentar todos
    dbs = await client.list_database_names()
    print(f"Bancos disponíveis: {dbs}")
    
    
    # Valores definidos automaticamente para execução via agente
    db_name = "tomich_database" 
    print(f"Usando banco de dados: {db_name}")
    db = client[db_name]
    
    company_name = "Escola Rhema"
    admin_email = "danilo@tomich.com.br"
    
    print(f"Criando empresa '{company_name}' para admin '{admin_email}'...")

    user = await db.users.find_one({"email": admin_email})
    if not user:
        user = await db.registered_users.find_one({"email": admin_email})
    
    if not user:
        print("❌ Usuário não encontrado neste banco!")
        # Tentar listar usuários para ajudar
        print("Usuários disponíveis:")
        async for u in db.users.find().limit(5):
            print(f" - {u.get('email')} (Legacy)")
        async for u in db.registered_users.find().limit(5):
             print(f" - {u.get('email')} (Registered)")
        return

    user_id = user.get("user_id")
    if not user_id:
        print("⚠️ Usuário encontrado mas user_id é None! Reparando usuário...")
        fix_user_id = f"user_{uuid.uuid4().hex[:12]}"
        
        # Atualizar usuário no banco
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"user_id": fix_user_id}}
        )
        print(f"✅ Usuário reparado com novo ID: {fix_user_id}")
        user_id = fix_user_id
        
        # Recarregar usuário para ter certeza
        user["user_id"] = user_id
        
    print(f"✅ Usuário pronto: {user.get('name')} (ID: {user_id})")

    
    # Criar Entidade
    entity_id = f"entity_{uuid.uuid4().hex[:12]}"
    entity_doc = {
        "entity_id": entity_id,
        "name": company_name,
        "description": "Criada via script",
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "custom_roles": ["operator", "editor", "camera", "sound", "social_media"],
        "custom_departments": ["production", "content", "development"]
    }
    
    await db.entities.insert_one(entity_doc)
    print(f"✅ Empresa '{company_name}' criada com ID: {entity_id}")
    
    # Criar Membro Admin
    member_id = f"member_{uuid.uuid4().hex[:12]}"
    member_doc = {
        "member_id": member_id,
        "user_id": user_id,
        "entity_id": entity_id,
        "name": user.get("name"),
        "email": user.get("email"),
        "roles": ["admin_global", "operator"],
        "department": "management",
        "active": True,
        "is_admin": True,
        "can_vote": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.members.insert_one(member_doc)
    print(f"✅ Usuário adicionado como Admin na nova empresa.")
    
    # Atualizar lista de entidades do usuário
    await db.users.update_one(
        {"user_id": user_id},
        {"$addToSet": {"entities": entity_id}}
    )
    await db.registered_users.update_one(
        {"user_id": user_id},
        {"$addToSet": {"entities": entity_id}}
    )
    print("✅ Perfil do usuário atualizado com nova entidade.")
    print("\nAgora reinicie a aplicação (ou use o seletor quando pronto) para ver a nova empresa!")

if __name__ == "__main__":
    asyncio.run(create_tenant())
