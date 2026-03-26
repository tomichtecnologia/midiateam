from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import asyncio
from pathlib import Path

# Carregar variáveis de ambiente
env_path = Path(__file__).parent / 'backend/.env'
load_dotenv(env_path)

async def check_user_picture():
    mongo_url = os.getenv('MONGO_URL', "mongodb://localhost:27017")
    print(f"Conectando ao MongoDB: {mongo_url}")
    client = AsyncIOMotorClient(mongo_url)
    
    found = False
    for db_name in await client.list_database_names():
        db = client[db_name]
        try:
            cols = await db.list_collection_names()
            if "user_sessions" in cols:
                found = True
                print(f"\n✅ ENCONTRADO user_sessions em: {db_name}")
                print("--- Sessões Ativas ---")
                count = 0
                async for s in db.user_sessions.find().sort("_id", -1).limit(3):
                    count += 1
                    uid = s.get('user_id')
                    print(f"  Token: {s.get('session_token')[:10]}... | UserID: {uid}")
                    
                    # Tentar achar o usuário nesse banco
                    u = await db.users.find_one({"user_id": uid})
                    if u:
                        print(f"    -> User (users): {u.get('email')} | Pic: {u.get('picture')}")
                    else:
                        print(f"    -> User {uid} não encontrado em 'users' deste banco")

                if count == 0:
                    print("  (Tabela existe mas está vazia)")
        except Exception as e:
            print(f"Erro acessando {db_name}: {e}")

    if not found:
        print("\n❌ NENHUM banco possui a coleção user_sessions.")

if __name__ == "__main__":
    asyncio.run(check_user_picture())
