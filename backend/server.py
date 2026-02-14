from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class Entity(BaseModel):
    """Entidade/Empresa"""
    model_config = ConfigDict(extra="ignore")
    entity_id: str = Field(default_factory=lambda: f"entity_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EntityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    phone: Optional[str] = None
    role: str = "member"
    is_admin: bool = False
    entities: List[str] = []  # Lista de entity_ids
    current_entity: Optional[str] = None  # Entidade atual selecionada
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    member_id: str = Field(default_factory=lambda: f"member_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    entity_id: str  # Entidade a qual pertence
    name: str
    email: str
    phone: Optional[str] = None
    picture: Optional[str] = None
    role: str = "operator"
    department: str = "production"
    active: bool = True
    is_admin: bool = False
    can_vote: bool = False
    # Gamification fields
    points: int = 0
    badges: List[str] = []
    level: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemberCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    picture: Optional[str] = None
    role: str = "operator"
    department: str = "production"
    is_admin: bool = False
    can_vote: bool = False
    entity_id: Optional[str] = None  # Se não informado, usa a entidade atual do usuário

class Schedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    schedule_id: str = Field(default_factory=lambda: f"schedule_{uuid.uuid4().hex[:12]}")
    entity_id: str  # Entidade a qual pertence
    title: str
    description: Optional[str] = None
    schedule_type: str
    date: str
    start_time: str
    end_time: str
    assigned_members: List[str] = []
    confirmed_members: List[str] = []
    declined_members: List[str] = []
    substitutes: dict = {}
    confirmation_deadline: str
    repeat_type: str = "none"
    repeat_days: List[str] = []
    repeat_until: Optional[str] = None
    parent_schedule_id: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScheduleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    schedule_type: str
    date: str
    start_time: str
    end_time: str
    assigned_members: List[str] = []
    repeat_type: str = "none"
    repeat_days: List[str] = []
    repeat_until: Optional[str] = None

class AttendanceConfirmation(BaseModel):
    schedule_id: str
    member_id: str
    status: str
    substitute_id: Optional[str] = None

class RejectionReason(BaseModel):
    user_id: str
    user_name: str
    reason: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreatorResponse(BaseModel):
    response: str
    created_at: str

class RevisionHistory(BaseModel):
    revision_number: int
    status: str  # approved, rejected
    votes_for: List[str]
    votes_against: List[str]
    rejection_reasons: List[dict]
    creator_response: Optional[str] = None
    closed_at: str

class ContentApproval(BaseModel):
    model_config = ConfigDict(extra="ignore")
    approval_id: str = Field(default_factory=lambda: f"approval_{uuid.uuid4().hex[:12]}")
    entity_id: str  # Entidade a qual pertence
    title: str
    description: str
    content_type: str
    content_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    submitted_by: str
    votes_for: List[str] = []
    votes_against: List[str] = []
    rejection_reasons: List[dict] = []  # Lista de motivos de rejeição
    creator_response: Optional[str] = None  # Resposta do criador aos motivos
    revision_count: int = 1  # Número da revisão atual
    revision_history: List[dict] = []  # Histórico de revisões anteriores
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContentApprovalCreate(BaseModel):
    title: str
    description: str
    content_type: str
    content_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

class CreatorResponseRequest(BaseModel):
    response: str

class Vote(BaseModel):
    approval_id: str
    vote: str
    reason: Optional[str] = None  # Motivo obrigatório para rejeição

class Link(BaseModel):
    model_config = ConfigDict(extra="ignore")
    link_id: str = Field(default_factory=lambda: f"link_{uuid.uuid4().hex[:12]}")
    entity_id: str  # Entidade a qual pertence
    title: str
    url: str
    category: str
    username: Optional[str] = None
    password: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LinkCreate(BaseModel):
    title: str
    url: str
    category: str
    username: Optional[str] = None
    password: Optional[str] = None
    notes: Optional[str] = None

# ============== DELEGATED RESPONSIBILITIES ==============

class DelegatedResponsibility(BaseModel):
    model_config = ConfigDict(extra="ignore")
    responsibility_id: str = Field(default_factory=lambda: f"resp_{uuid.uuid4().hex[:12]}")
    entity_id: str
    title: str
    description: str
    category: str  # social_media, art, production, content, admin, other
    assigned_to: str  # member_id
    priority: str = "medium"  # low, medium, high
    frequency: str = "always"  # always, weekly, monthly, as_needed
    active: bool = True
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DelegatedResponsibilityCreate(BaseModel):
    title: str
    description: str
    category: str
    assigned_to: str
    priority: str = "medium"
    frequency: str = "always"
    notes: Optional[str] = None

# ============== GAMIFICATION BADGES ==============

BADGES = {
    "first_login": {"name": "Primeiro Acesso", "description": "Fez login pela primeira vez", "icon": "🎉", "points": 10},
    "schedule_confirmed": {"name": "Compromissado", "description": "Confirmou presença em uma escala", "icon": "✅", "points": 20},
    "schedule_5": {"name": "Dedicado", "description": "Confirmou 5 escalas", "icon": "⭐", "points": 50},
    "schedule_10": {"name": "Fiel", "description": "Confirmou 10 escalas", "icon": "🌟", "points": 100},
    "schedule_25": {"name": "Pilar da Equipe", "description": "Confirmou 25 escalas", "icon": "🏆", "points": 250},
    "first_vote": {"name": "Voz Ativa", "description": "Votou pela primeira vez", "icon": "🗳️", "points": 15},
    "voter_10": {"name": "Participativo", "description": "Votou em 10 aprovações", "icon": "📊", "points": 75},
    "content_creator": {"name": "Criador", "description": "Enviou conteúdo para aprovação", "icon": "🎨", "points": 30},
    "content_approved": {"name": "Aprovado!", "description": "Teve conteúdo aprovado", "icon": "🎬", "points": 100},
    "content_5_approved": {"name": "Produtor", "description": "Teve 5 conteúdos aprovados", "icon": "🎥", "points": 250},
    "helper": {"name": "Ajudante", "description": "Substituiu alguém na escala", "icon": "🤝", "points": 40},
    "link_contributor": {"name": "Contribuidor", "description": "Adicionou um link útil", "icon": "🔗", "points": 15},
    "ai_explorer": {"name": "Explorador IA", "description": "Usou o assistente de IA", "icon": "🤖", "points": 20},
    "level_5": {"name": "Nível 5", "description": "Alcançou o nível 5", "icon": "🔥", "points": 0},
    "level_10": {"name": "Veterano", "description": "Alcançou o nível 10", "icon": "💎", "points": 0},
}

def calculate_level(points: int) -> int:
    if points < 50: return 1
    elif points < 150: return 2
    elif points < 300: return 3
    elif points < 500: return 4
    elif points < 750: return 5
    elif points < 1000: return 6
    elif points < 1500: return 7
    elif points < 2000: return 8
    elif points < 3000: return 9
    else: return 10

async def award_badge(user_id: str, badge_id: str, entity_id: str):
    if badge_id not in BADGES:
        return
    
    badge = BADGES[badge_id]
    member = await db.members.find_one({"user_id": user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        return
    
    if badge_id in member.get("badges", []):
        return
    
    new_points = member.get("points", 0) + badge["points"]
    new_level = calculate_level(new_points)
    
    await db.members.update_one(
        {"user_id": user_id, "entity_id": entity_id},
        {
            "$addToSet": {"badges": badge_id},
            "$set": {"points": new_points, "level": new_level}
        }
    )
    
    if new_level >= 5 and "level_5" not in member.get("badges", []):
        await db.members.update_one(
            {"user_id": user_id, "entity_id": entity_id},
            {"$addToSet": {"badges": "level_5"}}
        )
    if new_level >= 10 and "level_10" not in member.get("badges", []):
        await db.members.update_one(
            {"user_id": user_id, "entity_id": entity_id},
            {"$addToSet": {"badges": "level_10"}}
        )

async def add_points(user_id: str, points: int, entity_id: str):
    member = await db.members.find_one({"user_id": user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        return
    
    new_points = member.get("points", 0) + points
    new_level = calculate_level(new_points)
    
    await db.members.update_one(
        {"user_id": user_id, "entity_id": entity_id},
        {"$set": {"points": new_points, "level": new_level}}
    )

# ============== AUTH HELPERS ==============

async def get_current_user(request: Request) -> User:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

async def get_current_entity_id(user: User) -> str:
    """Retorna a entidade atual do usuário"""
    if user.current_entity:
        return user.current_entity
    if user.entities:
        return user.entities[0]
    # Se não tem entidade, cria uma padrão
    default_entity = await db.entities.find_one({"name": "Padrão"}, {"_id": 0})
    if not default_entity:
        entity = Entity(name="Padrão", description="Entidade padrão do sistema")
        doc = entity.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.entities.insert_one(doc)
        default_entity = doc
    return default_entity["entity_id"]

async def check_admin(user: User, entity_id: str):
    """Verifica se o usuário é admin da entidade"""
    member = await db.members.find_one(
        {"user_id": user.user_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not member or not member.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores podem realizar esta ação.")
    return True

# ============== AUTH ROUTES ==============

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as http_client:
        auth_response = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        auth_data = auth_response.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Buscar ou criar entidade padrão
    default_entity = await db.entities.find_one({"name": "Padrão"}, {"_id": 0})
    if not default_entity:
        entity = Entity(name="Padrão", description="Entidade padrão do sistema")
        doc = entity.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.entities.insert_one(doc)
        default_entity = await db.entities.find_one({"name": "Padrão"}, {"_id": 0})
    
    entity_id = default_entity["entity_id"]
    
    existing_user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data.get("picture")
            }}
        )
        # Verificar se já tem entidade
        if not existing_user.get("entities"):
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"entities": [entity_id], "current_entity": entity_id}}
            )
    else:
        # Verificar se é o primeiro usuário (será admin)
        user_count = await db.users.count_documents({})
        is_first_user = user_count == 0
        
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "role": "admin" if is_first_user else "member",
            "is_admin": is_first_user,
            "entities": [entity_id],
            "current_entity": entity_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
        
        # Criar membro na entidade
        member = {
            "member_id": f"member_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "entity_id": entity_id,
            "name": auth_data["name"],
            "email": auth_data["email"],
            "picture": auth_data.get("picture"),
            "role": "operator",
            "department": "production",
            "active": True,
            "is_admin": is_first_user,
            "can_vote": is_first_user,
            "points": 10,
            "badges": ["first_login"],
            "level": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.members.insert_one(member)
    
    session_token = auth_data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    # Adicionar info do membro
    member = await db.members.find_one(
        {"user_id": user_id, "entity_id": user.get("current_entity")},
        {"_id": 0}
    )
    if member:
        user["is_admin"] = member.get("is_admin", False)
    
    return user

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    member = await db.members.find_one(
        {"user_id": user.user_id, "entity_id": entity_id},
        {"_id": 0}
    )
    
    result = user.model_dump()
    if member:
        result["is_admin"] = member.get("is_admin", False)
        result["can_vote"] = member.get("can_vote", False)
        result["member_id"] = member.get("member_id")
    
    return result

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.post("/auth/switch-entity/{entity_id}")
async def switch_entity(entity_id: str, user: User = Depends(get_current_user)):
    """Trocar de entidade"""
    if entity_id not in user.entities:
        raise HTTPException(status_code=403, detail="Você não tem acesso a esta entidade")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"current_entity": entity_id}}
    )
    
    return {"message": "Entidade alterada com sucesso", "current_entity": entity_id}

# ============== ENTITY ROUTES ==============

@api_router.get("/entities")
async def get_entities(user: User = Depends(get_current_user)):
    """Lista entidades do usuário"""
    entities = await db.entities.find(
        {"entity_id": {"$in": user.entities}},
        {"_id": 0}
    ).to_list(100)
    return entities

@api_router.get("/entities/all")
async def get_all_entities(user: User = Depends(get_current_user)):
    """Lista todas as entidades (admin global)"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    entities = await db.entities.find({}, {"_id": 0}).to_list(1000)
    return entities

@api_router.post("/entities")
async def create_entity(entity_data: EntityCreate, user: User = Depends(get_current_user)):
    """Criar nova entidade (admin)"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    entity = Entity(**entity_data.model_dump())
    doc = entity.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.entities.insert_one(doc)
    
    return await db.entities.find_one({"entity_id": doc["entity_id"]}, {"_id": 0})

@api_router.put("/entities/{entity_id}")
async def update_entity(entity_id: str, entity_data: EntityCreate, user: User = Depends(get_current_user)):
    """Atualizar entidade (admin)"""
    current_entity = await get_current_entity_id(user)
    await check_admin(user, current_entity)
    
    result = await db.entities.update_one(
        {"entity_id": entity_id},
        {"$set": entity_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")
    
    return await db.entities.find_one({"entity_id": entity_id}, {"_id": 0})

# ============== MEMBERS ROUTES ==============

@api_router.get("/members")
async def get_members(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    members = await db.members.find(
        {"entity_id": entity_id, "active": True},
        {"_id": 0}
    ).to_list(1000)
    return members

@api_router.get("/members/{member_id}")
async def get_member(member_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    member = await db.members.find_one(
        {"member_id": member_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@api_router.post("/members")
async def create_member(member_data: MemberCreate, user: User = Depends(get_current_user)):
    entity_id = member_data.entity_id or await get_current_entity_id(user)
    
    member = Member(
        user_id=None,
        entity_id=entity_id,
        **{k: v for k, v in member_data.model_dump().items() if k != "entity_id"}
    )
    doc = member.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.members.insert_one(doc)
    
    return await db.members.find_one({"member_id": doc["member_id"]}, {"_id": 0})

@api_router.put("/members/{member_id}")
async def update_member(member_id: str, member_data: MemberCreate, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    
    update_data = {k: v for k, v in member_data.model_dump().items() if k != "entity_id"}
    result = await db.members.update_one(
        {"member_id": member_id, "entity_id": entity_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return await db.members.find_one({"member_id": member_id}, {"_id": 0})

@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    result = await db.members.update_one(
        {"member_id": member_id, "entity_id": entity_id},
        {"$set": {"active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted"}

# Admin: Mover membro para outra entidade
@api_router.post("/admin/members/{member_id}/move-entity")
async def move_member_entity(member_id: str, request: Request, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    data = await request.json()
    new_entity_id = data.get("entity_id")
    
    if not new_entity_id:
        raise HTTPException(status_code=400, detail="entity_id é obrigatório")
    
    # Verificar se entidade existe
    entity = await db.entities.find_one({"entity_id": new_entity_id}, {"_id": 0})
    if not entity:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")
    
    result = await db.members.update_one(
        {"member_id": member_id},
        {"$set": {"entity_id": new_entity_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    return {"message": "Membro movido com sucesso"}

# Admin: Adicionar membro a outra entidade
@api_router.post("/admin/members/{member_id}/add-entity")
async def add_member_entity(member_id: str, request: Request, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    data = await request.json()
    new_entity_id = data.get("entity_id")
    
    if not new_entity_id:
        raise HTTPException(status_code=400, detail="entity_id é obrigatório")
    
    # Buscar membro original
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    # Verificar se já existe nessa entidade
    existing = await db.members.find_one(
        {"user_id": member.get("user_id"), "entity_id": new_entity_id},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Membro já existe nesta entidade")
    
    # Criar cópia do membro na nova entidade
    new_member = {
        "member_id": f"member_{uuid.uuid4().hex[:12]}",
        "user_id": member.get("user_id"),
        "entity_id": new_entity_id,
        "name": member["name"],
        "email": member["email"],
        "phone": member.get("phone"),
        "picture": member.get("picture"),
        "role": member["role"],
        "department": member["department"],
        "active": True,
        "is_admin": False,
        "can_vote": False,
        "points": 0,
        "badges": [],
        "level": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.members.insert_one(new_member)
    
    # Atualizar usuário com nova entidade
    if member.get("user_id"):
        await db.users.update_one(
            {"user_id": member["user_id"]},
            {"$addToSet": {"entities": new_entity_id}}
        )
    
    return {"message": "Membro adicionado à entidade com sucesso"}

# ============== SCHEDULES ROUTES ==============

@api_router.get("/schedules")
async def get_schedules(
    schedule_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    entity_id = await get_current_entity_id(user)
    query = {"entity_id": entity_id}
    
    if schedule_type:
        query["schedule_type"] = schedule_type
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    schedules = await db.schedules.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    return schedules

@api_router.get("/schedules/{schedule_id}")
async def get_schedule(schedule_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    schedule = await db.schedules.find_one(
        {"schedule_id": schedule_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule

@api_router.post("/schedules")
async def create_schedule(schedule_data: ScheduleCreate, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    schedule_date = datetime.fromisoformat(schedule_data.date)
    deadline = schedule_date - timedelta(days=1)
    
    schedules_to_create = []
    
    main_schedule = Schedule(
        entity_id=entity_id,
        **schedule_data.model_dump(),
        confirmation_deadline=deadline.isoformat(),
        created_by=user.user_id
    )
    
    if schedule_data.repeat_type != "none" and schedule_data.repeat_until:
        repeat_until = datetime.fromisoformat(schedule_data.repeat_until)
        current_date = schedule_date
        parent_id = main_schedule.schedule_id
        
        day_map = {
            "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
            "friday": 4, "saturday": 5, "sunday": 6
        }
        
        while current_date <= repeat_until:
            should_create = False
            
            if schedule_data.repeat_type == "daily":
                should_create = True
            elif schedule_data.repeat_type == "weekly":
                day_name = list(day_map.keys())[current_date.weekday()]
                should_create = day_name in schedule_data.repeat_days
            elif schedule_data.repeat_type == "monthly":
                should_create = current_date.day == schedule_date.day
            
            if should_create:
                instance_deadline = current_date - timedelta(days=1)
                instance = Schedule(
                    entity_id=entity_id,
                    title=schedule_data.title,
                    description=schedule_data.description,
                    schedule_type=schedule_data.schedule_type,
                    date=current_date.isoformat()[:10],
                    start_time=schedule_data.start_time,
                    end_time=schedule_data.end_time,
                    assigned_members=schedule_data.assigned_members.copy(),
                    confirmation_deadline=instance_deadline.isoformat(),
                    repeat_type=schedule_data.repeat_type,
                    repeat_days=schedule_data.repeat_days,
                    repeat_until=schedule_data.repeat_until,
                    parent_schedule_id=parent_id if current_date != schedule_date else None,
                    created_by=user.user_id
                )
                doc = instance.model_dump()
                doc["created_at"] = doc["created_at"].isoformat()
                schedules_to_create.append(doc)
            
            if schedule_data.repeat_type == "daily":
                current_date += timedelta(days=1)
            elif schedule_data.repeat_type == "weekly":
                current_date += timedelta(days=1)
            elif schedule_data.repeat_type == "monthly":
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
    else:
        doc = main_schedule.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        schedules_to_create.append(doc)
    
    if schedules_to_create:
        await db.schedules.insert_many(schedules_to_create)
    
    result = await db.schedules.find_one({"schedule_id": schedules_to_create[0]["schedule_id"]}, {"_id": 0})
    return result

@api_router.put("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, schedule_data: ScheduleCreate, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    result = await db.schedules.update_one(
        {"schedule_id": schedule_id, "entity_id": entity_id},
        {"$set": schedule_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return await db.schedules.find_one({"schedule_id": schedule_id}, {"_id": 0})

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    result = await db.schedules.delete_one({"schedule_id": schedule_id, "entity_id": entity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted"}

@api_router.post("/schedules/{schedule_id}/attendance")
async def confirm_attendance(schedule_id: str, confirmation: AttendanceConfirmation, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    schedule = await db.schedules.find_one(
        {"schedule_id": schedule_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    member_id = confirmation.member_id
    
    if confirmation.status == "confirmed":
        await db.schedules.update_one(
            {"schedule_id": schedule_id},
            {
                "$addToSet": {"confirmed_members": member_id},
                "$pull": {"declined_members": member_id}
            }
        )
        
        await award_badge(user.user_id, "schedule_confirmed", entity_id)
        await add_points(user.user_id, 10, entity_id)
        
        member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
        confirm_count = await db.schedules.count_documents({
            "confirmed_members": member.get("member_id"),
            "entity_id": entity_id
        })
        
        if confirm_count >= 5:
            await award_badge(user.user_id, "schedule_5", entity_id)
        if confirm_count >= 10:
            await award_badge(user.user_id, "schedule_10", entity_id)
        if confirm_count >= 25:
            await award_badge(user.user_id, "schedule_25", entity_id)
            
    elif confirmation.status == "declined":
        update = {
            "$addToSet": {"declined_members": member_id},
            "$pull": {"confirmed_members": member_id}
        }
        if confirmation.substitute_id:
            update["$set"] = {f"substitutes.{member_id}": confirmation.substitute_id}
            sub_member = await db.members.find_one({"member_id": confirmation.substitute_id}, {"_id": 0})
            if sub_member and sub_member.get("user_id"):
                await award_badge(sub_member["user_id"], "helper", entity_id)
        
        await db.schedules.update_one({"schedule_id": schedule_id}, update)
    
    return await db.schedules.find_one({"schedule_id": schedule_id}, {"_id": 0})

@api_router.get("/my-schedules")
async def get_my_schedules(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        return []
    
    member_id = member["member_id"]
    schedules = await db.schedules.find(
        {"assigned_members": member_id, "entity_id": entity_id},
        {"_id": 0}
    ).sort("date", 1).to_list(100)
    
    return schedules

# ============== CONTENT APPROVAL ROUTES ==============

@api_router.get("/approvals")
async def get_approvals(status: Optional[str] = None, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    query = {"entity_id": entity_id}
    if status:
        query["status"] = status
    approvals = await db.content_approvals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return approvals

@api_router.post("/approvals")
async def create_approval(approval_data: ContentApprovalCreate, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    approval = ContentApproval(
        entity_id=entity_id,
        **approval_data.model_dump(),
        submitted_by=user.user_id
    )
    doc = approval.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.content_approvals.insert_one(doc)
    
    await award_badge(user.user_id, "content_creator", entity_id)
    await add_points(user.user_id, 15, entity_id)
    
    return await db.content_approvals.find_one({"approval_id": doc["approval_id"]}, {"_id": 0})

@api_router.post("/approvals/{approval_id}/vote")
async def vote_on_approval(approval_id: str, vote: Vote, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    approval = await db.content_approvals.find_one(
        {"approval_id": approval_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    if approval["status"] != "pending":
        raise HTTPException(status_code=400, detail="Voting is closed")
    
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=403, detail="Member not found")
    
    if not member.get("can_vote", False):
        raise HTTPException(status_code=403, detail="Você não tem permissão para votar")
    
    # Se for voto contra, exigir motivo
    if vote.vote == "against" and not vote.reason:
        raise HTTPException(status_code=400, detail="É obrigatório informar o motivo da rejeição")
    
    is_first_vote = "first_vote" not in member.get("badges", [])
    
    # Remover votos anteriores
    await db.content_approvals.update_one(
        {"approval_id": approval_id},
        {
            "$pull": {
                "votes_for": user.user_id,
                "votes_against": user.user_id,
                "rejection_reasons": {"user_id": user.user_id}
            }
        }
    )
    
    if vote.vote == "for":
        await db.content_approvals.update_one(
            {"approval_id": approval_id},
            {"$addToSet": {"votes_for": user.user_id}}
        )
    else:
        # Adicionar voto contra com motivo
        rejection_reason = {
            "user_id": user.user_id,
            "user_name": member.get("name", "Desconhecido"),
            "reason": vote.reason,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.content_approvals.update_one(
            {"approval_id": approval_id},
            {
                "$addToSet": {"votes_against": user.user_id},
                "$push": {"rejection_reasons": rejection_reason}
            }
        )
    
    if is_first_vote:
        await award_badge(user.user_id, "first_vote", entity_id)
    await add_points(user.user_id, 5, entity_id)
    
    total_votes = await db.content_approvals.count_documents({
        "$or": [
            {"votes_for": user.user_id},
            {"votes_against": user.user_id}
        ],
        "entity_id": entity_id
    })
    if total_votes >= 10:
        await award_badge(user.user_id, "voter_10", entity_id)
    
    updated = await db.content_approvals.find_one({"approval_id": approval_id}, {"_id": 0})
    total_voters = await db.members.count_documents({"active": True, "can_vote": True, "entity_id": entity_id})
    total_votes_count = len(updated["votes_for"]) + len(updated["votes_against"])
    
    if total_votes_count > 0 and total_voters > 0:
        approval_percentage = len(updated["votes_for"]) / total_votes_count * 100
        if approval_percentage > 50 and total_votes_count >= max(1, total_voters // 2):
            await db.content_approvals.update_one(
                {"approval_id": approval_id},
                {"$set": {"status": "approved"}}
            )
            creator_user_id = updated["submitted_by"]
            await award_badge(creator_user_id, "content_approved", entity_id)
            await add_points(creator_user_id, 50, entity_id)
            
            approved_count = await db.content_approvals.count_documents({
                "submitted_by": creator_user_id,
                "status": "approved",
                "entity_id": entity_id
            })
            if approved_count >= 5:
                await award_badge(creator_user_id, "content_5_approved", entity_id)
                
        elif approval_percentage < 50 and total_votes_count >= max(1, total_voters // 2):
            await db.content_approvals.update_one(
                {"approval_id": approval_id},
                {"$set": {"status": "rejected"}}
            )
    
    return await db.content_approvals.find_one({"approval_id": approval_id}, {"_id": 0})

@api_router.get("/approvals/voting-stats")
async def get_voting_stats(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    total_voters = await db.members.count_documents({"active": True, "can_vote": True, "entity_id": entity_id})
    
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    can_vote = member.get("can_vote", False) if member else False
    is_admin = member.get("is_admin", False) if member else False
    
    return {
        "total_voters": total_voters,
        "can_vote": can_vote,
        "is_admin": is_admin
    }

# Criador responde aos motivos de rejeição
@api_router.post("/approvals/{approval_id}/respond")
async def respond_to_rejection(
    approval_id: str,
    response_data: CreatorResponseRequest,
    user: User = Depends(get_current_user)
):
    entity_id = await get_current_entity_id(user)
    approval = await db.content_approvals.find_one(
        {"approval_id": approval_id, "entity_id": entity_id},
        {"_id": 0}
    )
    
    if not approval:
        raise HTTPException(status_code=404, detail="Aprovação não encontrada")
    
    # Apenas o criador pode responder
    if approval["submitted_by"] != user.user_id:
        raise HTTPException(status_code=403, detail="Apenas o criador pode responder aos motivos")
    
    # Só pode responder se estiver rejeitado
    if approval["status"] != "rejected":
        raise HTTPException(status_code=400, detail="Só é possível responder a conteúdos rejeitados")
    
    await db.content_approvals.update_one(
        {"approval_id": approval_id},
        {"$set": {"creator_response": response_data.response}}
    )
    
    return {"message": "Resposta registrada com sucesso"}

# Criador solicita reavaliação
@api_router.post("/approvals/{approval_id}/request-reevaluation")
async def request_reevaluation(approval_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    approval = await db.content_approvals.find_one(
        {"approval_id": approval_id, "entity_id": entity_id},
        {"_id": 0}
    )
    
    if not approval:
        raise HTTPException(status_code=404, detail="Aprovação não encontrada")
    
    # Apenas o criador pode solicitar reavaliação
    if approval["submitted_by"] != user.user_id:
        raise HTTPException(status_code=403, detail="Apenas o criador pode solicitar reavaliação")
    
    # Só pode solicitar se estiver rejeitado
    if approval["status"] != "rejected":
        raise HTTPException(status_code=400, detail="Só é possível solicitar reavaliação de conteúdos rejeitados")
    
    # Salvar histórico da revisão anterior
    revision_history_entry = {
        "revision_number": approval.get("revision_count", 1),
        "status": approval["status"],
        "votes_for": approval.get("votes_for", []),
        "votes_against": approval.get("votes_against", []),
        "rejection_reasons": approval.get("rejection_reasons", []),
        "creator_response": approval.get("creator_response"),
        "closed_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Resetar votação e status
    await db.content_approvals.update_one(
        {"approval_id": approval_id},
        {
            "$set": {
                "status": "pending",
                "votes_for": [],
                "votes_against": [],
                "rejection_reasons": [],
                "creator_response": None,
                "revision_count": approval.get("revision_count", 1) + 1
            },
            "$push": {
                "revision_history": revision_history_entry
            }
        }
    )
    
    return {"message": "Reavaliação solicitada! O conteúdo voltou para votação."}

# Admin: Estornar voto de um membro
@api_router.post("/admin/approvals/{approval_id}/revoke-vote")
async def revoke_vote(approval_id: str, request: Request, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    data = await request.json()
    member_user_id = data.get("user_id")
    
    if not member_user_id:
        raise HTTPException(status_code=400, detail="user_id é obrigatório")
    
    approval = await db.content_approvals.find_one(
        {"approval_id": approval_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not approval:
        raise HTTPException(status_code=404, detail="Aprovação não encontrada")
    
    # Remover voto do usuário
    await db.content_approvals.update_one(
        {"approval_id": approval_id},
        {
            "$pull": {
                "votes_for": member_user_id,
                "votes_against": member_user_id
            }
        }
    )
    
    return {"message": "Voto estornado com sucesso"}

# Admin: Reiniciar votação
@api_router.post("/admin/approvals/{approval_id}/reset-votes")
async def reset_votes(approval_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    result = await db.content_approvals.update_one(
        {"approval_id": approval_id, "entity_id": entity_id},
        {
            "$set": {
                "votes_for": [],
                "votes_against": [],
                "status": "pending"
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Aprovação não encontrada")
    
    return {"message": "Votação reiniciada com sucesso"}

# Admin: Excluir aprovação
@api_router.delete("/admin/approvals/{approval_id}")
async def delete_approval(approval_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    result = await db.content_approvals.delete_one(
        {"approval_id": approval_id, "entity_id": entity_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aprovação não encontrada")
    
    return {"message": "Aprovação excluída com sucesso"}

# ============== LINKS ROUTES ==============

@api_router.get("/links")
async def get_links(category: Optional[str] = None, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    query = {"entity_id": entity_id}
    if category:
        query["category"] = category
    links = await db.links.find(query, {"_id": 0}).to_list(1000)
    return links

@api_router.post("/links")
async def create_link(link_data: LinkCreate, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    link = Link(entity_id=entity_id, **link_data.model_dump(), created_by=user.user_id)
    doc = link.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.links.insert_one(doc)
    
    await award_badge(user.user_id, "link_contributor", entity_id)
    await add_points(user.user_id, 10, entity_id)
    
    return await db.links.find_one({"link_id": doc["link_id"]}, {"_id": 0})

@api_router.put("/links/{link_id}")
async def update_link(link_id: str, link_data: LinkCreate, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    result = await db.links.update_one(
        {"link_id": link_id, "entity_id": entity_id},
        {"$set": link_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    return await db.links.find_one({"link_id": link_id}, {"_id": 0})

@api_router.delete("/links/{link_id}")
async def delete_link(link_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    result = await db.links.delete_one({"link_id": link_id, "entity_id": entity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    return {"message": "Link deleted"}

# ============== DELEGATED RESPONSIBILITIES ROUTES ==============

@api_router.get("/responsibilities")
async def get_responsibilities(
    category: Optional[str] = None,
    active_only: bool = True,
    user: User = Depends(get_current_user)
):
    entity_id = await get_current_entity_id(user)
    query = {"entity_id": entity_id}
    if category:
        query["category"] = category
    if active_only:
        query["active"] = True
    
    responsibilities = await db.responsibilities.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return responsibilities

@api_router.get("/responsibilities/{responsibility_id}")
async def get_responsibility(responsibility_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    responsibility = await db.responsibilities.find_one(
        {"responsibility_id": responsibility_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not responsibility:
        raise HTTPException(status_code=404, detail="Responsabilidade não encontrada")
    return responsibility

@api_router.post("/responsibilities")
async def create_responsibility(
    resp_data: DelegatedResponsibilityCreate,
    user: User = Depends(get_current_user)
):
    entity_id = await get_current_entity_id(user)
    
    # Verify member exists
    member = await db.members.find_one(
        {"member_id": resp_data.assigned_to, "entity_id": entity_id},
        {"_id": 0}
    )
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    responsibility = DelegatedResponsibility(
        entity_id=entity_id,
        **resp_data.model_dump(),
        created_by=user.user_id
    )
    doc = responsibility.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.responsibilities.insert_one(doc)
    
    return await db.responsibilities.find_one({"responsibility_id": doc["responsibility_id"]}, {"_id": 0})

@api_router.put("/responsibilities/{responsibility_id}")
async def update_responsibility(
    responsibility_id: str,
    resp_data: DelegatedResponsibilityCreate,
    user: User = Depends(get_current_user)
):
    entity_id = await get_current_entity_id(user)
    
    # Verify member exists
    member = await db.members.find_one(
        {"member_id": resp_data.assigned_to, "entity_id": entity_id},
        {"_id": 0}
    )
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    result = await db.responsibilities.update_one(
        {"responsibility_id": responsibility_id, "entity_id": entity_id},
        {"$set": resp_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Responsabilidade não encontrada")
    
    return await db.responsibilities.find_one({"responsibility_id": responsibility_id}, {"_id": 0})

@api_router.patch("/responsibilities/{responsibility_id}/toggle")
async def toggle_responsibility(responsibility_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    
    responsibility = await db.responsibilities.find_one(
        {"responsibility_id": responsibility_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not responsibility:
        raise HTTPException(status_code=404, detail="Responsabilidade não encontrada")
    
    new_status = not responsibility.get("active", True)
    await db.responsibilities.update_one(
        {"responsibility_id": responsibility_id},
        {"$set": {"active": new_status}}
    )
    
    return {"message": "Status alterado", "active": new_status}

@api_router.delete("/responsibilities/{responsibility_id}")
async def delete_responsibility(responsibility_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    result = await db.responsibilities.delete_one(
        {"responsibility_id": responsibility_id, "entity_id": entity_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Responsabilidade não encontrada")
    return {"message": "Responsabilidade excluída"}

@api_router.get("/responsibilities/by-member/{member_id}")
async def get_responsibilities_by_member(member_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    responsibilities = await db.responsibilities.find(
        {"assigned_to": member_id, "entity_id": entity_id, "active": True},
        {"_id": 0}
    ).to_list(100)
    return responsibilities

# ============== GAMIFICATION ROUTES ==============

@api_router.get("/gamification/leaderboard")
async def get_leaderboard(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    members = await db.members.find(
        {"active": True, "entity_id": entity_id},
        {"_id": 0, "member_id": 1, "name": 1, "picture": 1, "points": 1, "level": 1, "badges": 1}
    ).sort("points", -1).limit(20).to_list(20)
    return members

@api_router.get("/gamification/badges")
async def get_all_badges(user: User = Depends(get_current_user)):
    return BADGES

@api_router.get("/gamification/my-stats")
async def get_my_stats(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        return {"points": 0, "level": 1, "badges": [], "rank": 0}
    
    higher_count = await db.members.count_documents({
        "active": True,
        "entity_id": entity_id,
        "points": {"$gt": member.get("points", 0)}
    })
    
    return {
        "points": member.get("points", 0),
        "level": member.get("level", 1),
        "badges": member.get("badges", []),
        "rank": higher_count + 1,
        "badges_info": {b: BADGES[b] for b in member.get("badges", []) if b in BADGES}
    }

# ============== DASHBOARD ROUTES ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    total_members = await db.members.count_documents({"active": True, "entity_id": entity_id})
    
    today = datetime.now(timezone.utc).date().isoformat()
    week_later = (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat()
    active_schedules = await db.schedules.count_documents({
        "date": {"$gte": today, "$lte": week_later},
        "entity_id": entity_id
    })
    
    pending_approvals = await db.content_approvals.count_documents({"status": "pending", "entity_id": entity_id})
    
    upcoming_schedules = await db.schedules.find(
        {"date": {"$gte": today}, "entity_id": entity_id},
        {"confirmed_members": 1, "_id": 0}
    ).to_list(100)
    confirmed_attendance = sum(len(s.get("confirmed_members", [])) for s in upcoming_schedules)
    
    this_month_start = datetime.now(timezone.utc).replace(day=1).isoformat()
    last_month = datetime.now(timezone.utc).replace(day=1) - timedelta(days=1)
    last_month_start = last_month.replace(day=1).isoformat()
    
    this_month_members = await db.members.count_documents({
        "created_at": {"$gte": this_month_start},
        "entity_id": entity_id
    })
    last_month_members = await db.members.count_documents({
        "created_at": {"$gte": last_month_start, "$lt": this_month_start},
        "entity_id": entity_id
    })
    
    growth = 0.0
    if last_month_members > 0:
        growth = ((this_month_members - last_month_members) / last_month_members) * 100
    
    return {
        "total_members": total_members,
        "active_schedules": active_schedules,
        "pending_approvals": pending_approvals,
        "confirmed_attendance": confirmed_attendance,
        "growth_percentage": round(growth, 1)
    }

@api_router.get("/dashboard/upcoming")
async def get_upcoming_events(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    today = datetime.now(timezone.utc).date().isoformat()
    schedules = await db.schedules.find(
        {"date": {"$gte": today}, "entity_id": entity_id},
        {"_id": 0}
    ).sort("date", 1).limit(5).to_list(5)
    return schedules

@api_router.get("/dashboard/pending-approvals")
async def get_pending_approvals_dashboard(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    approvals = await db.content_approvals.find(
        {"status": "pending", "entity_id": entity_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    return approvals

# ============== AI SUGGESTIONS ROUTE ==============

@api_router.post("/ai/suggest")
async def get_ai_suggestion(request: Request, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    data = await request.json()
    prompt = data.get("prompt", "")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"tomich_{user.user_id}_{uuid.uuid4().hex[:8]}",
            system_message="Você é um assistente criativo para uma equipe de mídia de igreja (Tomich Gestão de Mídia). Ajude com ideias de conteúdo, roteiros, legendas para redes sociais e estratégias de mídia. Seja criativo, relevante e alinhado com valores cristãos."
        )
        chat.with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        await award_badge(user.user_id, "ai_explorer", entity_id)
        await add_points(user.user_id, 5, entity_id)
        
        return {"suggestion": response}
    except ImportError:
        raise HTTPException(status_code=500, detail="AI service not available")
    except Exception as e:
        logger.error(f"AI suggestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "Tomich Gestão de Mídia API", "version": "2.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
