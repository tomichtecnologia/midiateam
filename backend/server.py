from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import hashlib
import secrets
import math
from fastapi import UploadFile, File
from fastapi.staticfiles import StaticFiles
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Detect if running in production (HTTPS)
IS_PRODUCTION = os.environ.get('IS_PRODUCTION', '').lower() in ('true', '1', 'yes')
if not IS_PRODUCTION:
    # Auto-detect from CORS_ORIGINS
    cors_origins = os.environ.get('CORS_ORIGINS', '')
    IS_PRODUCTION = 'https://' in cors_origins


# Ensure uploads directory exists
uploads_dir = ROOT_DIR / "uploads"
uploads_dir.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Mount uploads directory to serve static files
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

@app.on_event("startup")
async def startup_check():
    logger.info("Iniciando Mídia Team API...")
    max_retries = 10
    retry_delay = 3
    
    for attempt in range(max_retries):
        try:
            # Test MongoDB connection
            await client.admin.command('ping')
            logger.info("Conexão com MongoDB estabelecida com sucesso!")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Tentativa {attempt + 1}/{max_retries} falhou. Aguardando {retry_delay}s... Erro: {e}")
                await asyncio.sleep(retry_delay)
            else:
                logger.error(f"ERRO CRÍTICO: Não foi possível conectar ao MongoDB após {max_retries} tentativas: {e}")
    
    # Check if monthly points need a reset
    try:
        await reset_monthly_points()
    except Exception as e:
        logger.warning(f"Erro ao verificar reset mensal de pontos: {e}")


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
    custom_roles: List[str] = Field(default_factory=lambda: ["Operador", "Editor", "Câmera", "Sonoplastia", "Mídias Sociais"])
    custom_departments: List[str] = Field(default_factory=lambda: ["Produção", "Conteúdo", "Desenvolvimento"])
    custom_schedule_types: List[dict] = Field(default_factory=lambda: [
        {"value": "class", "label": "Aula", "icon": "graduation-cap", "color": "primary"},
        {"value": "content", "label": "Postagem", "icon": "instagram", "color": "pink"}
    ])
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EntityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    custom_roles: Optional[List[str]] = None
    custom_departments: Optional[List[str]] = None

class EntityConfigUpdate(BaseModel):
    custom_roles: Optional[List[str]] = None
    custom_departments: Optional[List[str]] = None
    custom_schedule_types: Optional[List[dict]] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    phone: Optional[str] = None
    role: str = "member"  # "superadmin" | "admin" | "member"
    is_admin: bool = False
    entities: List[str] = []  # Lista de entity_ids
    current_entity: Optional[str] = None  # Entidade atual selecionada
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @property
    def is_superadmin(self) -> bool:
        return self.role == "superadmin"

# ============== REGISTRATION/SIGNUP ==============

class PendingRegistration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    registration_id: str = Field(default_factory=lambda: f"reg_{uuid.uuid4().hex[:12]}")
    name: str
    email: str
    phone: Optional[str] = None
    password_hash: str
    roles: List[str] = Field(default_factory=lambda: ["Operador"])
    department: str = "Produção"
    institution: Optional[str] = None  # Instituição/empresa do membro
    requested_entities: List[str] = Field(default_factory=list)  # Lista de entity_ids que o usuário quer entrar
    status: str = "pending"  # pending, approved, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None

class RegistrationRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str
    roles: List[str] = Field(default_factory=lambda: ["Operador"])
    department: str = "Produção"
    institution: Optional[str] = None  # Instituição/empresa
    requested_entities: List[str] = Field(default_factory=list)  # entity_ids escolhidos no cadastro

class LoginRequest(BaseModel):
    email: str
    password: str

class SelectEntityRequest(BaseModel):
    entity_id: str

class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None  # Admin não precisa
    new_password: str

class ResetPasswordRequest(BaseModel):
    email: str

class RegisteredUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    name: str
    email: str
    phone: Optional[str] = None
    password_hash: str
    picture: Optional[str] = None
    is_admin: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reset_token: Optional[str] = None
    reset_token_expires: Optional[str] = None

class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    member_id: str = Field(default_factory=lambda: f"member_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    entity_id: str  # Entidade a qual pertence
    name: str
    email: str
    phone: Optional[str] = None
    picture: Optional[str] = None
    roles: List[str] = Field(default_factory=lambda: ["Operador"])
    department: str = "Produção"
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
    roles: List[str] = Field(default_factory=lambda: ["Operador"])
    department: str = "Produção"
    institution: Optional[str] = None
    is_admin: bool = False
    can_vote: bool = False
    entity_id: Optional[str] = None
    password: Optional[str] = None  # Se fornecido, cria conta de login

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
    assigned_members: List[str] = Field(default_factory=list)
    member_roles: Dict[str, str] = Field(default_factory=dict)  # member_id -> role
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
    member_roles: Dict[str, str] = Field(default_factory=dict)
    repeat_type: str = "none"
    repeat_days: List[str] = []
    repeat_until: Optional[str] = None

class AttendanceConfirmation(BaseModel):
    schedule_id: str
    member_id: str
    status: str
    substitute_id: Optional[str] = None

# ============== SCHEDULE SWAP/SUBSTITUTION ==============

class ScheduleSwapRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    swap_id: str = Field(default_factory=lambda: f"swap_{uuid.uuid4().hex[:12]}")
    entity_id: str
    schedule_id: str
    requester_member_id: str  # Quem está pedindo a troca
    target_member_id: Optional[str] = None  # Para quem está pedindo (None = qualquer um)
    reason: str
    status: str = "pending"  # pending, accepted, rejected, cancelled
    accepted_by: Optional[str] = None  # Quem aceitou a troca
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[str] = None

class SwapRequestCreate(BaseModel):
    schedule_id: str
    target_member_id: Optional[str] = None  # Se None, fica aberto para qualquer um
    requester_member_id: Optional[str] = None  # Admin pode pedir para outro
    reason: str

class SwapResponse(BaseModel):
    swap_id: str
    accept: bool

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

# ============== ORGANIZATION RULES ==============

class RuleItem(BaseModel):
    title: str
    content: str
    order: int = 0
    active: bool = True

class EntityRules(BaseModel):
    model_config = ConfigDict(extra="ignore")
    entity_id: str
    rules: List[dict] = Field(default_factory=list)
    updated_by: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EntityRulesUpdate(BaseModel):
    rules: List[dict]  # [{title, content, order, active}]

# ============== CALENDAR NOTES ==============

class CalendarNote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    note_id: str = Field(default_factory=lambda: f"note_{uuid.uuid4().hex[:12]}")
    user_id: str
    entity_id: str
    date: str  # YYYY-MM-DD
    title: str
    content: Optional[str] = ""
    color: str = "blue"  # blue, red, green, amber, purple, pink
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CalendarNoteCreate(BaseModel):
    date: str  # YYYY-MM-DD
    title: str
    content: Optional[str] = ""
    color: str = "blue"

class CalendarNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None

# ============== ANNOUNCEMENTS / AVISOS ==============

class Announcement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    announcement_id: str = Field(default_factory=lambda: f"ann_{uuid.uuid4().hex[:12]}")
    entity_id: str
    title: str
    content: str
    type: str = "general"  # general, sector
    target_sector: Optional[str] = None  # only for type=sector
    priority: str = "normal"  # normal, important, urgent
    created_by: str  # user_id
    created_by_name: Optional[str] = None
    active: bool = True
    read_by: List[dict] = Field(default_factory=list)  # [{user_id, name, read_at}]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    type: str = "general"
    target_sector: Optional[str] = None
    priority: str = "normal"

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    target_sector: Optional[str] = None
    priority: Optional[str] = None
    active: Optional[bool] = None

# ============== CHECKLISTS ==============

class ChecklistItem(BaseModel):
    item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:8]}")
    label: str
    order: int = 0

class ChecklistTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    template_id: str = Field(default_factory=lambda: f"tmpl_{uuid.uuid4().hex[:12]}")
    entity_id: str
    title: str
    description: Optional[str] = None
    icon: str = "clipboard-check"  # lucide icon name
    color: str = "blue"  # blue, red, green, amber, purple, pink
    items: List[dict] = Field(default_factory=list)  # [{item_id, label, order}]
    active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChecklistTemplateCreate(BaseModel):
    title: str
    description: Optional[str] = None
    icon: str = "clipboard-check"
    color: str = "blue"
    items: List[dict] = Field(default_factory=list)

class ChecklistTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    items: Optional[List[dict]] = None
    active: Optional[bool] = None

class ChecklistAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    assignment_id: str = Field(default_factory=lambda: f"chk_{uuid.uuid4().hex[:12]}")
    entity_id: str
    template_id: str
    checklist_title: str
    schedule_id: str  # Linked to the schedule
    assigned_to: str  # member_id
    assigned_by: str  # user_id
    due_date: Optional[str] = None  # same as schedule date
    status: str = "pending"  # pending, in_progress, completed
    items: List[dict] = Field(default_factory=list)  # [{item_id, label, done, done_at}]
    completed_at: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChecklistAssignmentCreate(BaseModel):
    template_id: str
    assigned_to: str  # member_id

class ChecklistItemToggle(BaseModel):
    item_id: str
    done: bool

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
    "checklist_completed": {"name": "Verificador", "description": "Completou uma checklist", "icon": "✅", "points": 20},
    "checklist_10": {"name": "Organizado", "description": "Completou 10 checklists", "icon": "📋", "points": 100},
    "checklist_streak_5": {"name": "Consistente", "description": "Completou 5 checklists seguidas", "icon": "🔥", "points": 150},
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
    new_monthly_points = member.get("monthly_points", 0) + badge["points"]
    new_level = calculate_level(new_points)
    
    await db.members.update_one(
        {"user_id": user_id, "entity_id": entity_id},
        {
            "$addToSet": {"badges": badge_id},
            "$set": {"points": new_points, "monthly_points": new_monthly_points, "level": new_level}
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
    new_monthly_points = member.get("monthly_points", 0) + points
    new_level = calculate_level(new_points)
    
    await db.members.update_one(
        {"user_id": user_id, "entity_id": entity_id},
        {"$set": {"points": new_points, "monthly_points": new_monthly_points, "level": new_level}}
    )

async def reset_monthly_points():
    """Reset monthly_points for all members. Should be called at the start of each month."""
    now = datetime.now(timezone.utc)
    # Check if we already reset this month
    last_reset = await db.system_config.find_one({"key": "monthly_points_last_reset"})
    if last_reset:
        last_month = last_reset.get("month")
        last_year = last_reset.get("year")
        if last_month == now.month and last_year == now.year:
            return  # Already reset this month
    
    # Reset all members' monthly_points to 0
    await db.members.update_many(
        {},
        {"$set": {"monthly_points": 0}}
    )
    
    # Record that we did the reset
    await db.system_config.update_one(
        {"key": "monthly_points_last_reset"},
        {"$set": {"key": "monthly_points_last_reset", "month": now.month, "year": now.year, "reset_at": now.isoformat()}},
        upsert=True
    )
    print(f"[Gamification] Monthly points reset for {now.strftime('%B %Y')}")

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
    
    # Primeiro tenta buscar em registered_users (novo sistema de auth)
    user = await db.registered_users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    # Se não encontrar, busca em users (legado/Google Auth)
    if not user:
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
    
    # SuperAdmin sem entidade selecionada: pegar a primeira disponível
    if user.is_superadmin:
        first_entity = await db.entities.find_one({}, {"_id": 0})
        if first_entity:
            return first_entity["entity_id"]
    
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
    # SuperAdmin tem acesso total a tudo
    if user.is_superadmin:
        return True
    
    member = await db.members.find_one(
        {"user_id": user.user_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not member or not member.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores podem realizar esta ação.")
    return True

async def check_member_access(user: User, entity_id: str):
    """Verifica se o usuário tem acesso à entidade (é membro ou superadmin)"""
    if user.is_superadmin:
        return True
    
    member = await db.members.find_one(
        {"user_id": user.user_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not member:
        raise HTTPException(status_code=403, detail="Você não tem acesso a esta organização.")
    return True

# ============== PASSWORD HELPERS ==============

def hash_password(password: str) -> str:
    """Hash password using SHA256 with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${hashed}"

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    try:
        salt, hashed = password_hash.split("$")
        return hashlib.sha256((password + salt).encode()).hexdigest() == hashed
    except:
        return False

# ============== REGISTRATION ROUTES ==============

@api_router.get("/auth/registration-options")
async def get_registration_options():
    """Retorna opções de cargo e setor para o formulário de cadastro (público)"""
    # Buscar da entidade padrão, ou qualquer entidade disponível
    entity = await db.entities.find_one({"name": "Padrão"}, {"_id": 0})
    if not entity:
        entity = await db.entities.find_one({}, {"_id": 0})
    
    default_roles = ["Operador", "Editor", "Câmera", "Sonoplastia", "Mídias Sociais"]
    default_departments = ["Produção", "Conteúdo", "Desenvolvimento"]
    
    if entity:
        roles_list = entity.get("custom_roles", default_roles)
        departments_list = entity.get("custom_departments", default_departments)
    else:
        roles_list = default_roles
        departments_list = default_departments
    
    return {"roles": roles_list, "departments": departments_list}

@api_router.get("/auth/available-entities")
async def get_available_entities():
    """Retorna lista de entidades disponíveis para seleção no cadastro (público, sem autenticação)"""
    entities = await db.entities.find(
        {"active": {"$ne": False}},
        {"_id": 0, "entity_id": 1, "name": 1, "description": 1}
    ).to_list(100)
    return entities

@api_router.post("/auth/register")
async def register_user(data: RegistrationRequest):
    """Cadastro de novo usuário (aguarda aprovação) - primeiro usuário vira admin automaticamente"""
    logger.info(f"Recebida solicitação de cadastro para: {data.email}")
    try:
        # Verificar se email já existe
        existing = await db.registered_users.find_one({"email": data.email})
        if existing:
            logger.warning(f"Cadastro negado: Email {data.email} já existe em registered_users")
            raise HTTPException(status_code=400, detail="Este email já está cadastrado")
        
        existing_pending = await db.pending_registrations.find_one({"email": data.email, "status": "pending"})
        if existing_pending:
            logger.warning(f"Cadastro negado: Email {data.email} já possui solicitação pendente")
            raise HTTPException(status_code=400, detail="Já existe um cadastro pendente para este email")
        
        # Verificar se é o primeiro usuário no sistema
        user_count = await db.registered_users.count_documents({})
        is_first_user = user_count == 0
        logger.info(f"Contagem de usuários: {user_count}. Primeiro usuário? {is_first_user}")
    
        if is_first_user:
            # Primeiro usuário: auto-aprovar como admin
            # Buscar ou criar entidade padrão
            default_entity = await db.entities.find_one({"name": "Padrão"}, {"_id": 0})
            if not default_entity:
                entity = Entity(name="Padrão", description="Entidade padrão do sistema")
                doc = entity.model_dump()
                doc["created_at"] = doc["created_at"].isoformat()
                await db.entities.insert_one(doc)
                default_entity = await db.entities.find_one({"name": "Padrão"}, {"_id": 0})
            
            entity_id = default_entity["entity_id"]
            new_user_id = f"user_{uuid.uuid4().hex[:12]}"
            
            # Criar usuário diretamente
            new_user = {
                "user_id": new_user_id,
                "name": data.name,
                "email": data.email,
                "phone": data.phone,
                "password_hash": hash_password(data.password),
                "role": "superadmin",
                "is_admin": True,
                "is_active": True,
                "entities": [entity_id],
                "current_entity": entity_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.registered_users.insert_one(new_user)
            
            # Criar membro admin
            new_member = Member(
                user_id=new_user_id,
                entity_id=entity_id,
                name=data.name,
                email=data.email,
                phone=data.phone,
                roles=data.roles,
                department=data.department,
                is_admin=True,
                can_vote=True
            )
            member_doc = new_member.model_dump()
            member_doc["created_at"] = member_doc["created_at"].isoformat()
            if data.institution:
                member_doc["institution"] = data.institution
            await db.members.insert_one(member_doc)
            
            logger.info(f"Primeiro usuário admin criado com sucesso: {data.email}")
            return {
                "message": "Você é o primeiro usuário! Sua conta foi criada como administrador. Faça login para continuar.",
                "auto_approved": True
            }
        
        # Demais usuários: criar registro pendente
        # Se nenhuma entidade foi selecionada, usar todas as entidades disponíveis
        requested = data.requested_entities
        if not requested:
            all_entities = await db.entities.find({"active": {"$ne": False}}, {"_id": 0, "entity_id": 1}).to_list(100)
            requested = [e["entity_id"] for e in all_entities]
        
        registration = PendingRegistration(
            name=data.name,
            email=data.email,
            phone=data.phone,
            password_hash=hash_password(data.password),
            roles=data.roles,
            department=data.department,
            institution=data.institution,
            requested_entities=requested
        )
        doc = registration.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.pending_registrations.insert_one(doc)
        
        logger.info(f"Cadastro pendente criado com sucesso para: {data.email}")
        return {"message": "Cadastro enviado! Aguarde a aprovação do administrador.", "registration_id": doc["registration_id"]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro inesperado no cadastro de {data.email}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro no servidor: {str(e)}")

@api_router.post("/auth/login")
async def login_user(data: LoginRequest, response: Response):
    """Login com email e senha"""
    # Buscar primeiro em registered_users (novo sistema de auth com email/senha)
    user = await db.registered_users.find_one({"email": data.email}, {"_id": 0})
    
    # Se não encontrar, buscar em users (legado/Google Auth)
    from_legacy = False
    if not user:
        user = await db.users.find_one({"email": data.email}, {"_id": 0})
        from_legacy = True
    
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Sua conta está desativada. Entre em contato com o administrador.")
    
    # Verificar se o usuário tem password_hash (Google Auth users não têm)
    if not user.get("password_hash"):
        raise HTTPException(
            status_code=401, 
            detail="Esta conta foi criada via Google. Use o botão 'Entrar com Google' para fazer login."
        )
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    # Criar sessão
    session_token = f"session_{secrets.token_hex(32)}"
    session_doc = {
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        domain=None,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Buscar informação completa do membro para incluir role e entity
    member = await db.members.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    # Computar role
    role = user.get("role", "member")
    is_admin = user.get("is_admin", False)
    if role == "superadmin":
        is_admin = True
    elif member and member.get("is_admin", False):
        is_admin = True
        if role != "superadmin":
            role = "admin"
    
    return {
        "message": "Login realizado com sucesso!",
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "picture": user.get("picture"),
            "role": role,
            "is_admin": is_admin,
            "entities": user.get("entities", []),
            "current_entity": user.get("current_entity")
        }
    }

@api_router.get("/auth/pending-registrations")
async def get_pending_registrations(user: User = Depends(get_current_user)):
    """Listar cadastros pendentes (apenas admin). Filtra por entidade do admin, superadmin vê todos."""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    is_superadmin = getattr(user, 'role', '') == 'superadmin' or getattr(user, 'is_superadmin', False)
    
    if is_superadmin:
        # Superadmin vê TODOS os cadastros pendentes
        query = {"status": "pending"}
    else:
        # Admin normal só vê cadastros que solicitaram sua entidade
        # E que ainda não foram aprovados para esta entidade
        query = {
            "status": "pending",
            "$or": [
                {"requested_entities": entity_id},
                {"requested_entities": {"$exists": False}},  # backward compat: registros antigos sem o campo
                {"requested_entities": []},  # registros sem entidade selecionada
            ],
            # Excluir registros já aprovados para esta entidade
            "approved_entities": {"$nin": [entity_id]}
        }
    
    registrations = await db.pending_registrations.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).to_list(100)
    
    return registrations

@api_router.post("/auth/approve-registration/{registration_id}")
async def approve_registration(registration_id: str, request: Request, user: User = Depends(get_current_user)):
    """Aprovar cadastro (apenas admin) - suporta multi-org: cada org aprova independentemente"""
    admin_entity_id = await get_current_entity_id(user)
    await check_admin(user, admin_entity_id)
    
    registration = await db.pending_registrations.find_one(
        {"registration_id": registration_id, "status": "pending"},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Cadastro não encontrado ou já processado")
    
    # Ler dados de override do body (se houver)
    try:
        body = await request.json()
    except Exception:
        body = {}
    
    # Usar dados editados pelo admin ou os originais do cadastro
    target_entity_id = body.get("entity_id", admin_entity_id)
    final_name = body.get("name", registration["name"])
    final_roles = body.get("roles", registration.get("roles", ["Operador"]))
    final_department = body.get("department", registration.get("department", "Produção"))
    final_is_admin = body.get("is_admin", False)
    
    # Verificar se a entidade de destino existe
    target_entity = await db.entities.find_one({"entity_id": target_entity_id}, {"_id": 0})
    if not target_entity:
        raise HTTPException(status_code=400, detail="Organização de destino não encontrada")
    
    # Verificar se o usuário já foi criado por outra org (multi-org approval)
    existing_user = await db.registered_users.find_one({"email": registration["email"]}, {"_id": 0})
    
    if existing_user:
        # Usuário já existe (aprovado por outra org antes) — apenas adicionar a nova entidade
        new_user_id = existing_user["user_id"]
        existing_entities = existing_user.get("entities", [])
        if target_entity_id not in existing_entities:
            await db.registered_users.update_one(
                {"user_id": new_user_id},
                {"$addToSet": {"entities": target_entity_id}}
            )
        
        # Verificar se já existe membro nessa entidade
        existing_member = await db.members.find_one(
            {"user_id": new_user_id, "entity_id": target_entity_id},
            {"_id": 0}
        )
        if not existing_member:
            new_member = Member(
                user_id=new_user_id,
                entity_id=target_entity_id,
                name=final_name,
                email=registration["email"],
                phone=registration.get("phone"),
                roles=final_roles,
                department=final_department,
                is_admin=final_is_admin
            )
            member_doc = new_member.model_dump()
            member_doc["created_at"] = member_doc["created_at"].isoformat()
            if registration.get("institution"):
                member_doc["institution"] = registration["institution"]
            await db.members.insert_one(member_doc)
    else:
        # Primeiro admin a aprovar — criar usuário e membro
        new_user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": new_user_id,
            "name": final_name,
            "email": registration["email"],
            "phone": registration.get("phone"),
            "password_hash": registration["password_hash"],
            "role": "admin" if final_is_admin else "member",
            "is_admin": final_is_admin,
            "is_active": True,
            "entities": [target_entity_id],
            "current_entity": target_entity_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.registered_users.insert_one(new_user)
        
        # Criar membro associado
        new_member = Member(
            user_id=new_user_id,
            entity_id=target_entity_id,
            name=final_name,
            email=registration["email"],
            phone=registration.get("phone"),
            roles=final_roles,
            department=final_department,
            is_admin=final_is_admin
        )
        member_doc = new_member.model_dump()
        member_doc["created_at"] = member_doc["created_at"].isoformat()
        if registration.get("institution"):
            member_doc["institution"] = registration["institution"]
        await db.members.insert_one(member_doc)
    
    # Remover esta entidade das requested_entities (aprovada)
    requested = registration.get("requested_entities", [])
    approved_entities = registration.get("approved_entities", [])
    approved_entities.append(target_entity_id)
    remaining = [eid for eid in requested if eid not in approved_entities]
    
    if len(remaining) == 0:
        # Todas as orgs aprovaram — remover registro pendente
        await db.pending_registrations.delete_one({"registration_id": registration_id})
    else:
        # Ainda há orgs pendentes — atualizar o registro
        await db.pending_registrations.update_one(
            {"registration_id": registration_id},
            {"$set": {"approved_entities": approved_entities}}
        )
    
    return {"message": f"Cadastro de {final_name} aprovado com sucesso!"}

@api_router.post("/auth/reject-registration/{registration_id}")
async def reject_registration(registration_id: str, user: User = Depends(get_current_user)):
    """Rejeitar e excluir cadastro pendente (apenas admin)"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    result = await db.pending_registrations.delete_one(
        {"registration_id": registration_id, "status": "pending"}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cadastro não encontrado")
    
    return {"message": "Cadastro rejeitado e removido"}

@api_router.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, user: User = Depends(get_current_user)):
    """Mudar própria senha"""
    reg_user = await db.registered_users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not reg_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar senha atual (exceto se admin mudando a própria)
    if data.current_password:
        if not verify_password(data.current_password, reg_user["password_hash"]):
            raise HTTPException(status_code=400, detail="Senha atual incorreta")
    
    # Atualizar senha
    await db.registered_users.update_one(
        {"user_id": user.user_id},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    
    return {"message": "Senha alterada com sucesso!"}

@api_router.post("/auth/admin-change-password/{target_user_id}")
async def admin_change_password(target_user_id: str, data: ChangePasswordRequest, user: User = Depends(get_current_user)):
    """Admin muda senha de outro usuário. Se não existir conta, cria uma automaticamente."""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    # Tentar atualizar em registered_users
    result = await db.registered_users.update_one(
        {"user_id": target_user_id},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    
    if result.matched_count > 0:
        return {"message": "Senha alterada com sucesso!"}
    
    # Se não encontrou em registered_users, verificar se existe como membro
    member = await db.members.find_one({"user_id": target_user_id}, {"_id": 0})
    if not member:
        # Tentar buscar membro pelo ID passado como member_id
        member = await db.members.find_one({"member_id": target_user_id}, {"_id": 0})
    
    if not member:
        raise HTTPException(status_code=404, detail="Usuário ou membro não encontrado")
    
    # Membro existe mas não tem conta em registered_users -> criar uma
    user_id = member.get("user_id") or f"user_{uuid.uuid4().hex[:12]}"
    
    # Verificar se já existe na coleção users (legado/Google)
    legacy_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    new_user = {
        "user_id": user_id,
        "name": member.get("name", ""),
        "email": member.get("email", ""),
        "phone": member.get("phone"),
        "password_hash": hash_password(data.new_password),
        "role": "admin" if member.get("is_admin") else "member",
        "is_admin": member.get("is_admin", False),
        "is_active": True,
        "entities": [member.get("entity_id")] if member.get("entity_id") else [],
        "current_entity": member.get("entity_id"),
        "picture": member.get("picture") or (legacy_user.get("picture") if legacy_user else None),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.registered_users.insert_one(new_user)
    
    # Atualizar o membro com user_id se não tinha
    if not member.get("user_id"):
        await db.members.update_one(
            {"member_id": member["member_id"]},
            {"$set": {"user_id": user_id}}
        )
    
    return {"message": f"Conta de login criada e senha definida para {member.get('name', 'membro')}!"}

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ResetPasswordRequest):
    """Solicitar recuperação de senha"""
    user = await db.registered_users.find_one({"email": data.email})
    
    if not user:
        # Não revelar se o email existe
        return {"message": "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."}
    
    # Gerar token de reset
    reset_token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    
    await db.registered_users.update_one(
        {"email": data.email},
        {"$set": {"reset_token": reset_token, "reset_token_expires": expires}}
    )
    
    # Em produção, enviar email com o link
    # Por enquanto, retornamos o token (em dev)
    return {
        "message": "Token de recuperação gerado. Em produção, seria enviado por email.",
        "reset_token": reset_token  # Remover em produção
    }

@api_router.post("/auth/reset-password/{token}")
async def reset_password(token: str, data: ChangePasswordRequest):
    """Resetar senha com token"""
    user = await db.registered_users.find_one({"reset_token": token})
    
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    
    # Verificar expiração
    if user.get("reset_token_expires"):
        expires = datetime.fromisoformat(user["reset_token_expires"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Token expirado. Solicite novamente.")
    
    # Atualizar senha e limpar token
    await db.registered_users.update_one(
        {"reset_token": token},
        {"$set": {
            "password_hash": hash_password(data.new_password),
            "reset_token": None,
            "reset_token_expires": None
        }}
    )
    
    return {"message": "Senha redefinida com sucesso! Você já pode fazer login."}

# ============== GOOGLE AUTH ROUTES (existing) ==============

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
            "roles": ["Operador"],
            "department": "Produção",
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
        domain=None,  # Não especificar domínio para funcionar em qualquer host
        httponly=True,
        secure=IS_PRODUCTION,  # True para HTTPS em produção
        samesite="lax",
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
    result["is_superadmin"] = user.is_superadmin
    
    # Computar role baseado na hierarquia
    if user.is_superadmin:
        result["role"] = "superadmin"
        result["is_admin"] = True
    elif member and member.get("is_admin", False):
        result["role"] = "admin"
        result["is_admin"] = True
    else:
        result["role"] = "member"
        result["is_admin"] = member.get("is_admin", False) if member else False
    
    if member:
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
    """Criar nova entidade/organização - Apenas SuperAdmin"""
    if not user.is_superadmin:
        raise HTTPException(status_code=403, detail="Apenas SuperAdmin pode criar novas organizações")
    try:
        # Filtrar valores None do entity_data
        data = {k: v for k, v in entity_data.model_dump().items() if v is not None}
        
        # 1. Criar a Entidade
        entity = Entity(**data)
        doc = entity.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.entities.insert_one(doc)
        
        # 2. Adicionar o criador como Membro Admin da nova entidade
        member = Member(
            user_id=user.user_id,
            entity_id=entity.entity_id,
            name=user.name,
            email=user.email,
            roles=["Admin", "Operador", "Editor"],
            department="Gestão",
            active=True,
            is_admin=True,
            can_vote=True
        )
        member_doc = member.model_dump()
        member_doc["created_at"] = member_doc["created_at"].isoformat()
        await db.members.insert_one(member_doc)
        
        # 3. Atualizar lista de entidades do usuário
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$addToSet": {"entities": entity.entity_id}, "$set": {"current_entity": entity.entity_id}}
        )
        await db.registered_users.update_one(
            {"user_id": user.user_id},
            {"$addToSet": {"entities": entity.entity_id}, "$set": {"current_entity": entity.entity_id}}
        )

        # Remover _id do MongoDB antes de retornar
        doc.pop("_id", None)
        return doc
    except Exception as e:
        logger.error(f"Erro ao criar entidade: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao criar entidade: {str(e)}")

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

@api_router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: str, user: User = Depends(get_current_user)):
    """Remover entidade por completo - Apenas SuperAdmin"""
    if not user.is_superadmin:
        raise HTTPException(status_code=403, detail="Apenas SuperAdmin pode remover organizações")
    
    # Verificar se entidade existe
    entity = await db.entities.find_one({"entity_id": entity_id}, {"_id": 0})
    if not entity:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")
    
    entity_name = entity.get("name", entity_id)
    
    # 1. Remover todos os membros desta entidade
    members_result = await db.members.delete_many({"entity_id": entity_id})
    
    # 2. Remover todas as escalas desta entidade
    schedules_result = await db.schedules.delete_many({"entity_id": entity_id})
    
    # 3. Remover todos os conteúdos desta entidade
    content_result = await db.content_items.delete_many({"entity_id": entity_id})
    
    # 4. Remover aprovações desta entidade
    approvals_result = await db.approval_requests.delete_many({"entity_id": entity_id})
    
    # 5. Remover links desta entidade
    links_result = await db.links.delete_many({"entity_id": entity_id})
    
    # 6. Remover entity_id da lista de entidades de todos os usuários
    await db.users.update_many(
        {"entities": entity_id},
        {"$pull": {"entities": entity_id}}
    )
    await db.registered_users.update_many(
        {"entities": entity_id},
        {"$pull": {"entities": entity_id}}
    )
    
    # 7. Resetar current_entity de quem estava nesta entidade
    await db.users.update_many(
        {"current_entity": entity_id},
        {"$set": {"current_entity": None}}
    )
    await db.registered_users.update_many(
        {"current_entity": entity_id},
        {"$set": {"current_entity": None}}
    )
    
    # 8. Finalmente, remover a entidade
    await db.entities.delete_one({"entity_id": entity_id})
    
    logger.info(f"Entidade '{entity_name}' ({entity_id}) removida por {user.email}")
    
    return {
        "message": f"Organização '{entity_name}' removida com sucesso",
        "removed": {
            "members": members_result.deleted_count,
            "schedules": schedules_result.deleted_count,
            "content": content_result.deleted_count,
            "approvals": approvals_result.deleted_count,
            "links": links_result.deleted_count
        }
    }

@api_router.get("/entities/current/config")
async def get_entity_config(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    entity = await db.entities.find_one({"entity_id": entity_id}, {"_id": 0})
    
    default_roles = ["Operador", "Editor", "Câmera", "Sonoplastia", "Mídias Sociais"]
    default_depts = ["Produção", "Conteúdo", "Desenvolvimento"]
    
    configured_roles = entity.get("custom_roles", default_roles)
    configured_depts = entity.get("custom_departments", default_depts)
    
    # Incluir roles e departamentos já usados por membros existentes
    existing_roles = await db.members.distinct("roles")
    existing_depts = await db.members.distinct("department")
    
    all_roles = list(dict.fromkeys(configured_roles + [r for r in existing_roles if r]))
    all_depts = list(dict.fromkeys(configured_depts + [d for d in existing_depts if d]))
    
    default_schedule_types = [
        {"value": "class", "label": "Aula", "icon": "graduation-cap", "color": "primary"},
        {"value": "content", "label": "Postagem", "icon": "instagram", "color": "pink"}
    ]
    configured_schedule_types = entity.get("custom_schedule_types", default_schedule_types)
    
    return {
        "custom_roles": all_roles,
        "custom_departments": all_depts,
        "custom_schedule_types": configured_schedule_types
    }

@api_router.put("/entities/current/config")
async def update_entity_config(config: EntityConfigUpdate, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    update_data = {k: v for k, v in config.model_dump().items() if v is not None}
    
    result = await db.entities.update_one(
        {"entity_id": entity_id},
        {"$set": update_data}
    )
    return await db.entities.find_one({"entity_id": entity_id}, {"_id": 0})

# ============== MIGRAÇÃO DE LABELS ==============

@api_router.post("/admin/migrate-labels")
async def migrate_labels_to_portuguese(user: User = Depends(get_current_user)):
    """Migra nomes de cargos e setores de inglês para português (apenas admin)"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    # Mapeamento de valores antigos para novos
    role_map = {
        "operator": "Operador",
        "editor": "Editor",
        "camera": "Câmera",
        "sound": "Sonoplastia",
        "social_media": "Mídias Sociais",
        "presenter": "Apresentador",
        "director": "Diretor",
        "photographer": "Fotógrafo",
        "admin_global": "Admin",
        "management": "Gestão",
    }
    
    dept_map = {
        "production": "Produção",
        "content": "Conteúdo",
        "development": "Desenvolvimento",
        "communication": "Comunicação",
        "design": "Design",
        "management": "Gestão",
    }
    
    migrated = {"entities": 0, "members": 0, "registrations": 0}
    
    # 1. Migrar entidades - custom_roles e custom_departments
    async for entity in db.entities.find({}):
        updated = False
        new_roles = []
        for r in entity.get("custom_roles", []):
            new_roles.append(role_map.get(r, r))
            if r in role_map:
                updated = True
        
        new_depts = []
        for d in entity.get("custom_departments", []):
            new_depts.append(dept_map.get(d, d))
            if d in dept_map:
                updated = True
        
        if updated:
            await db.entities.update_one(
                {"entity_id": entity["entity_id"]},
                {"$set": {"custom_roles": new_roles, "custom_departments": new_depts}}
            )
            migrated["entities"] += 1
    
    # 2. Migrar membros - roles e department
    async for member in db.members.find({}):
        updated = False
        new_roles = []
        for r in member.get("roles", []):
            new_roles.append(role_map.get(r, r))
            if r in role_map:
                updated = True
        
        new_dept = dept_map.get(member.get("department", ""), member.get("department", ""))
        if member.get("department", "") in dept_map:
            updated = True
        
        if updated:
            await db.members.update_one(
                {"member_id": member["member_id"]},
                {"$set": {"roles": new_roles, "department": new_dept}}
            )
            migrated["members"] += 1
    
    # 3. Migrar pending registrations
    async for reg in db.pending_registrations.find({"status": "pending"}):
        updated = False
        new_roles = []
        for r in reg.get("roles", []):
            new_roles.append(role_map.get(r, r))
            if r in role_map:
                updated = True
        
        new_dept = dept_map.get(reg.get("department", ""), reg.get("department", ""))
        if reg.get("department", "") in dept_map:
            updated = True
        
        if updated:
            await db.pending_registrations.update_one(
                {"registration_id": reg["registration_id"]},
                {"$set": {"roles": new_roles, "department": new_dept}}
            )
            migrated["registrations"] += 1
    
    return {
        "message": "Migração concluída com sucesso!",
        "migrated": migrated
    }

# Admin: Promover/rebaixar usuário a SuperAdmin
@api_router.put("/admin/members/{member_id}/superadmin")
async def toggle_superadmin(member_id: str, request: Request, user: User = Depends(get_current_user)):
    """Apenas SuperAdmin pode promover outros a SuperAdmin"""
    if not user.is_superadmin:
        raise HTTPException(status_code=403, detail="Apenas SuperAdmin pode alterar este privilégio")
    
    data = await request.json()
    is_superadmin = data.get("is_superadmin", False)
    
    # Buscar membro para obter user_id
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    target_user_id = member.get("user_id")
    if not target_user_id:
        raise HTTPException(status_code=400, detail="Este membro não possui conta de usuário vinculada")
    
    # Impedir que remova o próprio superadmin
    if target_user_id == user.user_id and not is_superadmin:
        raise HTTPException(status_code=400, detail="Você não pode remover seu próprio privilégio de SuperAdmin")
    
    new_role = "superadmin" if is_superadmin else "member"
    
    # Atualizar em users e registered_users
    await db.users.update_one(
        {"user_id": target_user_id},
        {"$set": {"role": new_role}}
    )
    await db.registered_users.update_one(
        {"user_id": target_user_id},
        {"$set": {"role": new_role}}
    )
    
    action = "promovido a" if is_superadmin else "removido de"
    logger.info(f"Usuário {target_user_id} {action} SuperAdmin por {user.email}")
    
    return {"message": f"Usuário {action} SuperAdmin com sucesso"}

# Admin: Verificar se um membro é superadmin
@api_router.get("/admin/members/{member_id}/role")
async def get_member_role(member_id: str, user: User = Depends(get_current_user)):
    """Retorna o role do usuário vinculado a este membro"""
    if not user.is_superadmin:
        raise HTTPException(status_code=403, detail="Apenas SuperAdmin")
    
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member or not member.get("user_id"):
        return {"role": "member", "is_superadmin": False}
    
    # Buscar user
    target_user = await db.registered_users.find_one({"user_id": member["user_id"]}, {"_id": 0})
    if not target_user:
        target_user = await db.users.find_one({"user_id": member["user_id"]}, {"_id": 0})
    
    role = target_user.get("role", "member") if target_user else "member"
    return {"role": role, "is_superadmin": role == "superadmin"}

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
    await check_admin(user, entity_id)
    
    # Verificar se email já existe
    existing_member = await db.members.find_one({"email": member_data.email, "entity_id": entity_id})
    if existing_member:
        raise HTTPException(status_code=400, detail="Já existe um membro com este email nesta organização")
    
    # Se password fornecido, criar conta de login
    user_id = None
    if member_data.password:
        existing_user = await db.registered_users.find_one({"email": member_data.email})
        if existing_user:
            user_id = existing_user["user_id"]
            # Adicionar entity_id ao usuário existente
            await db.registered_users.update_one(
                {"user_id": user_id},
                {"$addToSet": {"entities": entity_id, "entity_ids": entity_id}}
            )
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            hashed_pw = hash_password(member_data.password)
            new_user = {
                "user_id": user_id,
                "name": member_data.name,
                "email": member_data.email,
                "password_hash": hashed_pw,
                "role": "member",
                "status": "approved",
                "entities": [entity_id],
                "entity_ids": [entity_id],
                "current_entity": entity_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.registered_users.insert_one(new_user)
            logger.info(f"Admin {user.email} criou conta de login para {member_data.email}")
    
    member = Member(
        user_id=user_id,
        entity_id=entity_id,
        name=member_data.name,
        email=member_data.email,
        phone=member_data.phone,
        roles=member_data.roles,
        department=member_data.department,
        institution=member_data.institution,
        is_admin=member_data.is_admin,
        can_vote=member_data.can_vote,
    )
    doc = member.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.members.insert_one(doc)
    
    return await db.members.find_one({"member_id": doc["member_id"]}, {"_id": 0})

@api_router.get("/admin/members/all")
async def get_all_members(user: User = Depends(get_current_user)):
    """Lista TODOS os membros de TODAS as organizações (apenas superadmin)"""
    if not user.is_superadmin:
        raise HTTPException(status_code=403, detail="Apenas superadmin pode acessar todos os membros")
    
    members = await db.members.find({"active": True}, {"_id": 0}).sort("name", 1).to_list(1000)
    
    # Enriquecer com nome da entidade
    entity_ids = list(set(m.get("entity_id") for m in members if m.get("entity_id")))
    entities = {}
    if entity_ids:
        entity_docs = await db.entities.find(
            {"entity_id": {"$in": entity_ids}},
            {"_id": 0, "entity_id": 1, "name": 1}
        ).to_list(100)
        entities = {e["entity_id"]: e["name"] for e in entity_docs}
    
    for m in members:
        m["entity_name"] = entities.get(m.get("entity_id"), "Sem organização")
    
    return members

@api_router.put("/members/{member_id}")
async def update_member(member_id: str, request: Request, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    
    # Apenas admin pode editar membros
    await check_admin(user, entity_id)
    
    data = await request.json()
    
    # Campos editáveis
    update_data = {}
    for field in ["name", "email", "phone", "roles", "department", "is_admin", "can_vote", "institution", "picture"]:
        if field in data:
            update_data[field] = data[field]
    
    # SuperAdmin pode mover para outra entidade
    if user.is_superadmin and "entity_id" in data:
        update_data["entity_id"] = data["entity_id"]
    
    # SuperAdmin pode editar de qualquer org
    if user.is_superadmin:
        query = {"member_id": member_id}
    else:
        query = {"member_id": member_id, "entity_id": entity_id}
    
    result = await db.members.update_one(query, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    # Sincronizar nome com registered_users se mudou
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if member and member.get("user_id") and "name" in update_data:
        await db.registered_users.update_one(
            {"user_id": member["user_id"]},
            {"$set": {"name": update_data["name"]}}
        )
    
    return member

@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    
    # Apenas admin pode excluir membros
    await check_admin(user, entity_id)
    
    # SuperAdmin pode deletar de qualquer org
    if user.is_superadmin:
        query = {"member_id": member_id}
    else:
        query = {"member_id": member_id, "entity_id": entity_id}
    
    # Buscar o membro antes de deletar para limpar registros relacionados
    member = await db.members.find_one(query, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    member_email = member.get("email")
    member_user_id = member.get("user_id")
    
    # Deletar o membro (hard delete)
    await db.members.delete_one(query)
    
    # Limpar registros relacionados pelo email
    if member_email:
        # Verificar se ainda existem outros membros com o mesmo user_id
        other_members = 0
        if member_user_id:
            other_members = await db.members.count_documents({"user_id": member_user_id})
        
        # Se não há mais membros associados a esse user_id, limpar o usuário completamente
        if other_members == 0:
            # Remover de registered_users
            await db.registered_users.delete_many({"email": member_email})
            
            # Remover pending registrations (rejeitados ou cancelados)
            await db.pending_registrations.delete_many({"email": member_email})
            
            # Remover sessões ativas
            if member_user_id:
                await db.user_sessions.delete_many({"user_id": member_user_id})
    
    logger.info(f"Membro {member_id} ({member_email}) removido completamente por {user.email}")
    return {"message": "Membro removido com sucesso"}

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
        "roles": member.get("roles", ["Operador"]),
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
        await db.registered_users.update_one(
            {"user_id": member["user_id"]},
            {"$addToSet": {"entities": new_entity_id}}
        )
    
    return {"message": "Membro adicionado à entidade com sucesso"}

# Admin: Listar organizações de um membro (via user_id ou email)
@api_router.get("/admin/members/{member_id}/entities")
async def get_member_entities(member_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    # Buscar o membro para obter user_id/email
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    # Buscar todos os membros com mesmo user_id ou email em qualquer entidade
    query = {}
    if member.get("user_id"):
        query = {"user_id": member["user_id"]}
    else:
        query = {"email": member["email"]}
    
    member_entities = []
    async for m in db.members.find(query, {"_id": 0}):
        entity = await db.entities.find_one({"entity_id": m["entity_id"]}, {"_id": 0})
        if entity:
            member_entities.append({
                "entity_id": entity["entity_id"],
                "entity_name": entity["name"],
                "member_id": m["member_id"],
                "is_admin": m.get("is_admin", False),
                "roles": m.get("roles", [])
            })
    
    return member_entities

# Admin: Remover membro de uma entidade
@api_router.delete("/admin/members/{member_id}/remove-entity/{target_entity_id}")
async def remove_member_from_entity(member_id: str, target_entity_id: str, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    # Buscar membro original para obter user_id
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    user_id = member.get("user_id")
    email = member.get("email")
    
    # Encontrar e remover o membro na entidade alvo
    query = {"entity_id": target_entity_id}
    if user_id:
        query["user_id"] = user_id
    else:
        query["email"] = email
    
    result = await db.members.delete_one(query)
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Membro não encontrado nesta entidade")
    
    # Atualizar a lista de entidades do usuário
    if user_id:
        await db.users.update_one(
            {"user_id": user_id},
            {"$pull": {"entities": target_entity_id}}
        )
        await db.registered_users.update_one(
            {"user_id": user_id},
            {"$pull": {"entities": target_entity_id}}
        )
    
    return {"message": "Membro removido da entidade com sucesso"}

# Admin: Definir todas as organizações de um membro de uma vez
@api_router.put("/admin/members/{member_id}/entities")
async def set_member_entities(member_id: str, request: Request, user: User = Depends(get_current_user)):
    """Define a lista completa de organizações de um membro"""
    current_entity_id = await get_current_entity_id(user)
    await check_admin(user, current_entity_id)
    
    data = await request.json()
    target_entity_ids = data.get("entity_ids", [])
    
    # Buscar membro
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    user_id_member = member.get("user_id")
    email = member.get("email")
    
    # Buscar entidades atuais desse membro
    query = {"user_id": user_id_member} if user_id_member else {"email": email}
    current_member_entities = set()
    async for m in db.members.find(query, {"_id": 0, "entity_id": 1}):
        current_member_entities.add(m["entity_id"])
    
    target_set = set(target_entity_ids)
    
    # Entidades a ADICIONAR (estão no target mas não no current)
    to_add = target_set - current_member_entities
    for eid in to_add:
        entity = await db.entities.find_one({"entity_id": eid})
        if not entity:
            continue
        new_member_doc = {
            "member_id": f"member_{uuid.uuid4().hex[:12]}",
            "user_id": user_id_member,
            "entity_id": eid,
            "name": member["name"],
            "email": member["email"],
            "phone": member.get("phone"),
            "picture": member.get("picture"),
            "roles": ["Operador"],
            "department": member.get("department", "Produção"),
            "active": True,
            "is_admin": False,
            "can_vote": False,
            "points": 0,
            "badges": [],
            "level": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.members.insert_one(new_member_doc)
    
    # Entidades a REMOVER (estão no current mas não no target)
    to_remove = current_member_entities - target_set
    for eid in to_remove:
        remove_query = {"entity_id": eid}
        if user_id_member:
            remove_query["user_id"] = user_id_member
        else:
            remove_query["email"] = email
        await db.members.delete_one(remove_query)
    
    # Atualizar user.entities
    if user_id_member:
        final_entities = list(target_set)
        await db.users.update_one(
            {"user_id": user_id_member},
            {"$set": {"entities": final_entities}}
        )
        await db.registered_users.update_one(
            {"user_id": user_id_member},
            {"$set": {"entities": final_entities}}
        )
    
    return {"message": f"Organizações atualizadas: +{len(to_add)} adicionadas, -{len(to_remove)} removidas"}

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

# ============== SWAP ROUTES (must be before /schedules/{schedule_id}) ==============

@api_router.post("/schedules/swap-request")
async def create_swap_request(swap_data: SwapRequestCreate, user: User = Depends(get_current_user)):
    """Criar solicitação de troca de escala"""
    entity_id = await get_current_entity_id(user)
    
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    # Por padrão, quem pede é o próprio usuário
    final_requester_id = member["member_id"]
    
    # Se for informado um requester_member_id diferente, validar se é admin
    if swap_data.requester_member_id and swap_data.requester_member_id != final_requester_id:
        await check_admin(user, entity_id)
        final_requester_id = swap_data.requester_member_id
    
    schedule = await db.schedules.find_one(
        {"schedule_id": swap_data.schedule_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    
    if final_requester_id not in schedule.get("assigned_members", []):
        raise HTTPException(status_code=400, detail="O membro não está escalado para esta data")
    
    existing = await db.swap_requests.find_one({
        "schedule_id": swap_data.schedule_id,
        "requester_member_id": member["member_id"],
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Você já tem uma solicitação pendente para esta escala")
    
    swap_request = ScheduleSwapRequest(
        entity_id=entity_id,
        schedule_id=swap_data.schedule_id,
        requester_member_id=final_requester_id,
        target_member_id=swap_data.target_member_id,
        reason=swap_data.reason
    )
    doc = swap_request.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.swap_requests.insert_one(doc)
    
    return await db.swap_requests.find_one({"swap_id": doc["swap_id"]}, {"_id": 0})

@api_router.get("/schedules/swap-requests")
async def get_swap_requests(status: Optional[str] = "pending", user: User = Depends(get_current_user)):
    """Listar solicitações de troca"""
    entity_id = await get_current_entity_id(user)
    
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        return []
    
    query = {"entity_id": entity_id}
    if status:
        query["status"] = status
    
    swap_requests = await db.swap_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    enriched = []
    for req in swap_requests:
        requester = await db.members.find_one({"member_id": req["requester_member_id"]}, {"_id": 0})
        req["requester_name"] = requester.get("name", "Desconhecido") if requester else "Desconhecido"
        req["requester_picture"] = requester.get("picture") if requester else None
        
        schedule = await db.schedules.find_one({"schedule_id": req["schedule_id"]}, {"_id": 0})
        if schedule:
            req["schedule_title"] = schedule.get("title", "")
            req["schedule_date"] = schedule.get("date", "")
            req["schedule_type"] = schedule.get("schedule_type", "")
        
        can_accept = False
        if req["status"] == "pending" and req["requester_member_id"] != member["member_id"]:
            if req["target_member_id"]:
                can_accept = req["target_member_id"] == member["member_id"]
            else:
                can_accept = True
        
        req["can_accept"] = can_accept
        req["is_mine"] = req["requester_member_id"] == member["member_id"]
        
        enriched.append(req)
    
    return enriched

@api_router.get("/schedules/my-swap-requests")
async def get_my_swap_requests(user: User = Depends(get_current_user)):
    """Listar minhas solicitações de troca"""
    entity_id = await get_current_entity_id(user)
    
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        return []
    
    swap_requests = await db.swap_requests.find(
        {"requester_member_id": member["member_id"], "entity_id": entity_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    for req in swap_requests:
        schedule = await db.schedules.find_one({"schedule_id": req["schedule_id"]}, {"_id": 0})
        if schedule:
            req["schedule_title"] = schedule.get("title", "")
            req["schedule_date"] = schedule.get("date", "")
        if req.get("accepted_by"):
            accepter = await db.members.find_one({"member_id": req["accepted_by"]}, {"_id": 0})
            req["accepted_by_name"] = accepter.get("name", "") if accepter else ""
    
    return swap_requests

@api_router.post("/schedules/swap-requests/{swap_id}/respond")
async def respond_to_swap_request(swap_id: str, response: SwapResponse, user: User = Depends(get_current_user)):
    """Aceitar ou recusar solicitação de troca"""
    entity_id = await get_current_entity_id(user)
    
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    swap_request = await db.swap_requests.find_one(
        {"swap_id": swap_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not swap_request:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    
    if swap_request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Esta solicitação já foi respondida")
    
    if swap_request["target_member_id"] and swap_request["target_member_id"] != member["member_id"]:
        raise HTTPException(status_code=403, detail="Esta solicitação não é para você")
    
    if swap_request["requester_member_id"] == member["member_id"]:
        raise HTTPException(status_code=400, detail="Você não pode responder à sua própria solicitação")
    
    if response.accept:
        schedule = await db.schedules.find_one({"schedule_id": swap_request["schedule_id"]}, {"_id": 0})
        if not schedule:
            raise HTTPException(status_code=404, detail="Escala não encontrada")
        
        requester_id = swap_request["requester_member_id"]
        accepter_id = member["member_id"]
        
        new_assigned = [m for m in schedule.get("assigned_members", []) if m != requester_id]
        if accepter_id not in new_assigned:
            new_assigned.append(accepter_id)
        
        new_confirmed = [m for m in schedule.get("confirmed_members", []) if m != requester_id]
        new_declined = [m for m in schedule.get("declined_members", []) if m != requester_id]
        
        await db.schedules.update_one(
            {"schedule_id": swap_request["schedule_id"]},
            {"$set": {
                "assigned_members": new_assigned,
                "confirmed_members": new_confirmed,
                "declined_members": new_declined,
                f"substitutes.{requester_id}": accepter_id
            }}
        )
        
        await db.swap_requests.update_one(
            {"swap_id": swap_id},
            {"$set": {
                "status": "accepted",
                "accepted_by": accepter_id,
                "resolved_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await award_badge(user.user_id, "helper", entity_id)
        await add_points(user.user_id, 20, entity_id)
        
        return {"message": "Troca aceita! Você foi adicionado à escala.", "status": "accepted"}
    else:
        if swap_request["target_member_id"] == member["member_id"]:
            await db.swap_requests.update_one(
                {"swap_id": swap_id},
                {"$set": {
                    "status": "rejected",
                    "resolved_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"message": "Solicitação recusada.", "status": "rejected"}
        else:
            raise HTTPException(status_code=400, detail="Apenas o membro alvo pode recusar diretamente")

@api_router.delete("/schedules/swap-requests/{swap_id}")
async def cancel_swap_request(swap_id: str, user: User = Depends(get_current_user)):
    """Cancelar minha solicitação de troca"""
    entity_id = await get_current_entity_id(user)
    
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    
    swap_request = await db.swap_requests.find_one(
        {"swap_id": swap_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not swap_request:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    
    if swap_request["requester_member_id"] != member["member_id"]:
        raise HTTPException(status_code=403, detail="Você só pode cancelar suas próprias solicitações")
    
    if swap_request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Só é possível cancelar solicitações pendentes")
    
    await db.swap_requests.update_one(
        {"swap_id": swap_id},
        {"$set": {"status": "cancelled", "resolved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Solicitação cancelada"}

# ============== END SWAP ROUTES ==============

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
    
    # Apenas admin pode criar escala
    await check_admin(user, entity_id)
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
                    member_roles=schedule_data.member_roles.copy(),
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
async def update_schedule(schedule_id: str, schedule_data: ScheduleCreate, update_all: bool = False, user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    
    # Apenas admin pode mudar escala
    await check_admin(user, entity_id)
    
    update_fields = schedule_data.model_dump()
    
    if update_all:
        # Buscar a escala para encontrar o parent
        schedule = await db.schedules.find_one({"schedule_id": schedule_id, "entity_id": entity_id}, {"_id": 0})
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        parent_id = schedule.get("parent_schedule_id") or schedule_id
        
        # Campos que devem ser atualizados em TODAS as recorrentes
        shared_fields = {
            "title": update_fields["title"],
            "description": update_fields.get("description"),
            "schedule_type": update_fields["schedule_type"],
            "start_time": update_fields["start_time"],
            "end_time": update_fields["end_time"],
            "assigned_members": update_fields.get("assigned_members", []),
            "member_roles": update_fields.get("member_roles", {}),
        }
        
        # Estratégia: buscar por parent_schedule_id OU por ser irmão com mesmo parent
        # Também buscar escalas que tenham o mesmo parent_schedule_id que qualquer irmão
        sibling_parents = set()
        sibling_parents.add(parent_id)
        
        # Buscar todos os parents que apontam para o mesmo grupo
        siblings = await db.schedules.find({
            "entity_id": entity_id,
            "$or": [
                {"schedule_id": parent_id},
                {"parent_schedule_id": parent_id},
                {"schedule_id": schedule_id}
            ]
        }, {"_id": 0, "parent_schedule_id": 1, "schedule_id": 1}).to_list(500)
        
        for s in siblings:
            if s.get("parent_schedule_id"):
                sibling_parents.add(s["parent_schedule_id"])
            sibling_parents.add(s["schedule_id"])
        
        # Agora buscar TODAS as escalas que pertencem a qualquer um desses parent groups
        or_conditions = [{"schedule_id": {"$in": list(sibling_parents)}}]
        for pid in sibling_parents:
            or_conditions.append({"parent_schedule_id": pid})
        
        result = await db.schedules.update_many(
            {
                "entity_id": entity_id,
                "$or": or_conditions
            },
            {"$set": shared_fields}
        )
        
        # Também atualizar a data/hora da escala específica editada
        await db.schedules.update_one(
            {"schedule_id": schedule_id, "entity_id": entity_id},
            {"$set": {"date": update_fields["date"]}}
        )
        
        logger.info(f"Updated {result.modified_count} recurring schedules (parents: {sibling_parents})")
        return await db.schedules.find_one({"schedule_id": schedule_id}, {"_id": 0})
    else:
        # Atualizar apenas esta escala
        result = await db.schedules.update_one(
            {"schedule_id": schedule_id, "entity_id": entity_id},
            {"$set": update_fields}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return await db.schedules.find_one({"schedule_id": schedule_id}, {"_id": 0})

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: str, 
    delete_recurring: bool = False,
    user: User = Depends(get_current_user)
):
    """Excluir escala - Admin pode excluir individual ou todas recorrentes"""
    entity_id = await get_current_entity_id(user)
    
    # Verificar se é admin
    await check_admin(user, entity_id)
    
    # Buscar a escala
    schedule = await db.schedules.find_one(
        {"schedule_id": schedule_id, "entity_id": entity_id},
        {"_id": 0}
    )
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    
    if delete_recurring and schedule.get("repeat_type") != "none":
        # Excluir todas as escalas com o mesmo parent ou que são parent desta
        parent_id = schedule.get("parent_schedule_id") or schedule_id
        
        # Excluir escalas filhas e a própria escala pai
        result = await db.schedules.delete_many({
            "entity_id": entity_id,
            "$or": [
                {"schedule_id": parent_id},
                {"parent_schedule_id": parent_id}
            ]
        })
        
        return {"message": f"{result.deleted_count} escalas excluídas com sucesso"}
    else:
        # Excluir apenas esta escala
        result = await db.schedules.delete_one({"schedule_id": schedule_id, "entity_id": entity_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Escala não encontrada")
        return {"message": "Escala excluída com sucesso"}

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
    
    # Buscar o membro para saber o user_id (para dar pontos)
    target_member = await db.members.find_one({"member_id": member_id, "entity_id": entity_id}, {"_id": 0})
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Verificar se o usuário é o próprio membro OU se é admin
    if target_member.get("user_id") != user.user_id:
        await check_admin(user, entity_id)
    
    target_user_id = target_member.get("user_id")
    
    if confirmation.status == "confirmed":
        await db.schedules.update_one(
            {"schedule_id": schedule_id},
            {
                "$addToSet": {"confirmed_members": member_id},
                "$pull": {"declined_members": member_id}
            }
        )
        
        # Dar pontos ao membro (se ele tiver um user_id associado)
        if target_user_id:
            await award_badge(target_user_id, "schedule_confirmed", entity_id)
            await add_points(target_user_id, 10, entity_id)
            
            confirm_count = await db.schedules.count_documents({
                "confirmed_members": member_id,
                "entity_id": entity_id
            })
            
            if confirm_count >= 5:
                await award_badge(target_user_id, "schedule_5", entity_id)
            if confirm_count >= 10:
                await award_badge(target_user_id, "schedule_10", entity_id)
            if confirm_count >= 25:
                await award_badge(target_user_id, "schedule_25", entity_id)
            
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
    votes_for = len(updated.get("votes_for", []))
    votes_against = len(updated.get("votes_against", []))
    total_votes_cast = votes_for + votes_against
    
    # Quorum: more than 50% of eligible voters must have voted
    # ceil((n+1)/2): 1 voter→1, 2→2, 3→2, 4→3, 5→3, 6→4
    quorum = max(1, math.ceil((total_voters + 1) / 2))
    
    if total_votes_cast >= quorum and total_voters > 0:
        if votes_for > votes_against:
            # Majority voted for approval
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
                
        elif votes_against > votes_for:
            # Majority voted against
            await db.content_approvals.update_one(
                {"approval_id": approval_id},
                {"$set": {"status": "rejected"}}
            )
        # If tied (votes_for == votes_against), stays pending until more votes break the tie
    
    return await db.content_approvals.find_one({"approval_id": approval_id}, {"_id": 0})

@api_router.get("/approvals/voting-stats")
async def get_voting_stats(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    total_voters = await db.members.count_documents({"active": True, "can_vote": True, "entity_id": entity_id})
    
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    can_vote = member.get("can_vote", False) if member else False
    is_admin = member.get("is_admin", False) if member else False
    
    quorum = max(1, math.ceil((total_voters + 1) / 2))
    
    return {
        "total_voters": total_voters,
        "quorum": quorum,
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
        {"_id": 0, "member_id": 1, "name": 1, "picture": 1, "points": 1, "monthly_points": 1, "level": 1, "badges": 1}
    ).sort("points", -1).limit(20).to_list(20)
    return members

@api_router.get("/gamification/leaderboard/monthly")
async def get_monthly_leaderboard(user: User = Depends(get_current_user)):
    entity_id = await get_current_entity_id(user)
    members = await db.members.find(
        {"active": True, "entity_id": entity_id, "monthly_points": {"$gt": 0}},
        {"_id": 0, "member_id": 1, "name": 1, "picture": 1, "points": 1, "monthly_points": 1, "level": 1, "badges": 1}
    ).sort("monthly_points", -1).limit(20).to_list(20)
    return members

@api_router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/users/me/select-entity")
async def select_entity(request: SelectEntityRequest, user: User = Depends(get_current_user)):
    """Selecionar empresa ativa"""
    entity = await db.entities.find_one({"entity_id": request.entity_id}, {"_id": 0})
    if not entity:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # SuperAdmin pode acessar qualquer entidade
    if not user.is_superadmin:
        # Verificar se usuário é membro
        member = await db.members.find_one({"user_id": user.user_id, "entity_id": request.entity_id})
        if not member:
            raise HTTPException(status_code=403, detail="Você não pertence a esta empresa")
        
    # Atualizar current_entity
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"current_entity": request.entity_id}})
    await db.registered_users.update_one({"user_id": user.user_id}, {"$set": {"current_entity": request.entity_id}})
    
    return {"message": "Empresa selecionada", "entity": entity}

@api_router.get("/users/me/entities")
async def list_my_entities(user: User = Depends(get_current_user)):
    """Listar empresas que participo"""
    
    # SuperAdmin vê TODAS as organizações
    if user.is_superadmin:
        entities = []
        async for e in db.entities.find({}, {"_id": 0}):
            entities.append(e)
        return entities
    
    # Coletar entity_ids de TODAS as fontes
    entity_ids = set()
    
    # Fonte 1: entities do campo do user (registered_users ou users)
    if user.entities:
        entity_ids.update(user.entities)
    
    # Fonte 2: Buscar diretamente no documento do usuário (pode ter sido atualizado)
    reg_user = await db.registered_users.find_one({"user_id": user.user_id}, {"_id": 0, "entities": 1, "entity_ids": 1})
    if reg_user:
        entity_ids.update(reg_user.get("entities", []))
        entity_ids.update(reg_user.get("entity_ids", []))
    
    legacy_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "entities": 1, "entity_ids": 1})
    if legacy_user:
        entity_ids.update(legacy_user.get("entities", []))
        entity_ids.update(legacy_user.get("entity_ids", []))
    
    # Fonte 3: Buscar via members (todas as entities onde é membro)
    cursor = db.members.find({"user_id": user.user_id})
    async for doc in cursor:
        if doc.get("entity_id"):
            entity_ids.add(doc["entity_id"])
    
    # Se não encontrou nenhuma entity, usar a padrão
    if not entity_ids:
        default = await db.entities.find_one({"name": "Padrão"})
        if default:
            entity_ids.add(default["entity_id"])

    entities = []
    async for e in db.entities.find({"entity_id": {"$in": list(entity_ids)}}, {"_id": 0}):
        entities.append(e)
        
    return entities

@api_router.post("/users/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload de foto de perfil"""
    # Validar extensão
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Use JPG, PNG ou WEBP.")
    
    # Gerar nome único
    file_name = f"{user.user_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = uploads_dir / file_name
    
    # Salvar arquivo
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Construir URL (assumindo que o servidor serve em /uploads)
    # Em produção, idealmente seria um domínio completo ou CDN
    avatar_url = f"/uploads/{file_name}"
    
    # Atualizar usuário (Legacy)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"picture": avatar_url}}
    )
    
    # Atualizar novo modelo de usuário (Auth novo)
    await db.registered_users.update_one(
        {"user_id": user.user_id},
        {"$set": {"picture": avatar_url}}
    )
    
    # Atualizar também na collection de membros se existir
    await db.members.update_many(
        {"user_id": user.user_id},
        {"$set": {"picture": avatar_url}}
    )
    
    return {"avatar_url": avatar_url}

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
        "monthly_points": member.get("monthly_points", 0),
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

# ============== ORGANIZATION RULES ROUTES ==============

@api_router.get("/rules")
async def get_rules(user: User = Depends(get_current_user)):
    """Retorna as regras da organização atual"""
    entity_id = await get_current_entity_id(user)
    rules_doc = await db.entity_rules.find_one({"entity_id": entity_id}, {"_id": 0})
    if not rules_doc:
        return {"entity_id": entity_id, "rules": [], "updated_by": None, "updated_at": None}
    return rules_doc

@api_router.put("/rules")
async def update_rules(data: EntityRulesUpdate, user: User = Depends(get_current_user)):
    """Admin atualiza as regras da organização"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    # Garantir que cada regra tem um order
    rules = []
    for i, rule in enumerate(data.rules):
        r = dict(rule)
        r["order"] = r.get("order", i)
        if "active" not in r:
            r["active"] = True
        rules.append(r)
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.entity_rules.update_one(
        {"entity_id": entity_id},
        {"$set": {
            "entity_id": entity_id,
            "rules": rules,
            "updated_by": user.user_id,
            "updated_at": now
        }},
        upsert=True
    )
    
    # Buscar nome do admin que editou
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    admin_name = member.get("name", user.name) if member else user.name
    
    return {
        "entity_id": entity_id,
        "rules": rules,
        "updated_by": user.user_id,
        "updated_by_name": admin_name,
        "updated_at": now
    }

# ============== CALENDAR NOTES ROUTES ==============

@api_router.get("/calendar-notes")
async def get_calendar_notes(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Retorna as anotações pessoais do calendário do usuário"""
    entity_id = await get_current_entity_id(user)
    query = {"user_id": user.user_id, "entity_id": entity_id}
    
    if start_date:
        query["date"] = query.get("date", {})
        query["date"]["$gte"] = start_date
    if end_date:
        if "date" not in query:
            query["date"] = {}
        query["date"]["$lte"] = end_date
    
    notes = await db.calendar_notes.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return notes

@api_router.post("/calendar-notes")
async def create_calendar_note(data: CalendarNoteCreate, user: User = Depends(get_current_user)):
    """Cria uma anotação pessoal no calendário"""
    entity_id = await get_current_entity_id(user)
    
    note = CalendarNote(
        user_id=user.user_id,
        entity_id=entity_id,
        date=data.date,
        title=data.title,
        content=data.content or "",
        color=data.color
    )
    doc = note.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.calendar_notes.insert_one(doc)
    
    return {"message": "Anotação criada!", "note": {k: v for k, v in doc.items() if k != "_id"}}

@api_router.put("/calendar-notes/{note_id}")
async def update_calendar_note(note_id: str, data: CalendarNoteUpdate, user: User = Depends(get_current_user)):
    """Edita uma anotação pessoal do calendário"""
    note = await db.calendar_notes.find_one({"note_id": note_id, "user_id": user.user_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Anotação não encontrada")
    
    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title
    if data.content is not None:
        update_data["content"] = data.content
    if data.color is not None:
        update_data["color"] = data.color
    
    if update_data:
        await db.calendar_notes.update_one({"note_id": note_id}, {"$set": update_data})
    
    updated = await db.calendar_notes.find_one({"note_id": note_id}, {"_id": 0})
    return updated

@api_router.delete("/calendar-notes/{note_id}")
async def delete_calendar_note(note_id: str, user: User = Depends(get_current_user)):
    """Exclui uma anotação pessoal do calendário"""
    note = await db.calendar_notes.find_one({"note_id": note_id, "user_id": user.user_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Anotação não encontrada")
    
    await db.calendar_notes.delete_one({"note_id": note_id})
    return {"message": "Anotação excluída!"}

# ============== ADMIN: EDIT USER EMAIL ==============

@api_router.put("/admin/users/{user_id}/email")
async def admin_update_user_email(user_id: str, request: Request, user: User = Depends(get_current_user)):
    """SuperAdmin pode alterar o email de login de um usuário"""
    if not user.is_superadmin:
        raise HTTPException(status_code=403, detail="Apenas superadmin pode alterar emails")
    
    data = await request.json()
    new_email = data.get("email", "").strip().lower()
    
    if not new_email or "@" not in new_email:
        raise HTTPException(status_code=400, detail="Email inválido")
    
    # Verificar se o email já está em uso por outro usuário
    existing = await db.registered_users.find_one({"email": new_email, "user_id": {"$ne": user_id}})
    if existing:
        raise HTTPException(status_code=400, detail="Este email já está em uso por outro usuário")
    
    # Buscar email antigo para atualizar membros
    target_user = await db.registered_users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    old_email = target_user.get("email", "")
    
    # Atualizar em registered_users
    await db.registered_users.update_one(
        {"user_id": user_id},
        {"$set": {"email": new_email}}
    )
    
    # Atualizar em members (sincronizar email)
    await db.members.update_many(
        {"user_id": user_id},
        {"$set": {"email": new_email}}
    )
    
    # Atualizar em users (se existir)
    await db.users.update_many(
        {"user_id": user_id},
        {"$set": {"email": new_email}}
    )
    
    logger.info(f"SuperAdmin {user.email} alterou email de {old_email} para {new_email} (user_id: {user_id})")
    
    return {"message": f"Email alterado de {old_email} para {new_email}", "old_email": old_email, "new_email": new_email}

# ============== ANNOUNCEMENTS / AVISOS ROUTES ==============

@api_router.get("/announcements")
async def get_announcements(user: User = Depends(get_current_user)):
    """Busca avisos da organização (gerais + do setor do usuário)"""
    entity_id = await get_current_entity_id(user)
    
    # Buscar o membro para saber o setor
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    user_department = member.get("department", "") if member else ""
    
    # Buscar avisos gerais + avisos do setor do usuário
    query = {
        "entity_id": entity_id,
        "active": True,
        "$or": [
            {"type": "general"},
            {"type": "sector", "target_sector": user_department}
        ]
    }
    
    announcements = await db.announcements.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return announcements

@api_router.get("/announcements/all")
async def get_all_announcements(user: User = Depends(get_current_user)):
    """Admin: busca TODOS os avisos da organização (incluindo inativos)"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    announcements = await db.announcements.find({"entity_id": entity_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return announcements

@api_router.post("/announcements")
async def create_announcement(data: AnnouncementCreate, user: User = Depends(get_current_user)):
    """Admin cria um aviso (geral ou por setor)"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    announcement = Announcement(
        entity_id=entity_id,
        title=data.title,
        content=data.content,
        type=data.type,
        target_sector=data.target_sector if data.type == "sector" else None,
        priority=data.priority,
        created_by=user.user_id,
        created_by_name=user.name
    )
    
    await db.announcements.insert_one(announcement.model_dump())
    return announcement.model_dump()

@api_router.put("/announcements/{announcement_id}")
async def update_announcement(announcement_id: str, data: AnnouncementUpdate, user: User = Depends(get_current_user)):
    """Admin edita um aviso"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    ann = await db.announcements.find_one({"announcement_id": announcement_id, "entity_id": entity_id})
    if not ann:
        raise HTTPException(status_code=404, detail="Aviso não encontrado")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.announcements.update_one({"announcement_id": announcement_id}, {"$set": update_data})
    
    return await db.announcements.find_one({"announcement_id": announcement_id}, {"_id": 0})

@api_router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, user: User = Depends(get_current_user)):
    """Admin exclui um aviso"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    result = await db.announcements.delete_one({"announcement_id": announcement_id, "entity_id": entity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aviso não encontrado")
    
    return {"message": "Aviso excluído!"}

@api_router.post("/announcements/{announcement_id}/read")
async def confirm_read_announcement(announcement_id: str, user: User = Depends(get_current_user)):
    """Usuário confirma que leu o aviso"""
    entity_id = await get_current_entity_id(user)
    
    ann = await db.announcements.find_one({"announcement_id": announcement_id, "entity_id": entity_id})
    if not ann:
        raise HTTPException(status_code=404, detail="Aviso não encontrado")
    
    # Verificar se já leu
    read_by = ann.get("read_by", [])
    already_read = any(r.get("user_id") == user.user_id for r in read_by)
    
    if already_read:
        return {"message": "Já confirmado anteriormente"}
    
    # Adicionar confirmação
    read_entry = {
        "user_id": user.user_id,
        "name": user.name,
        "read_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.announcements.update_one(
        {"announcement_id": announcement_id},
        {"$push": {"read_by": read_entry}}
    )
    
    return {"message": "Leitura confirmada!"}


# ============== CHECKLIST TEMPLATE ROUTES ==============

@api_router.get("/checklist-templates")
async def get_checklist_templates(user: User = Depends(get_current_user)):
    """Lista templates de checklist da entidade"""
    entity_id = await get_current_entity_id(user)
    templates = await db.checklist_templates.find(
        {"entity_id": entity_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return templates

@api_router.post("/checklist-templates")
async def create_checklist_template(data: ChecklistTemplateCreate, user: User = Depends(get_current_user)):
    """Admin cria um template de checklist"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    # Generate item_ids if not present
    items = []
    for i, item in enumerate(data.items):
        items.append({
            "item_id": item.get("item_id", f"item_{uuid.uuid4().hex[:8]}"),
            "label": item["label"],
            "order": item.get("order", i)
        })
    
    template = ChecklistTemplate(
        entity_id=entity_id,
        title=data.title,
        description=data.description,
        icon=data.icon,
        color=data.color,
        items=items,
        created_by=user.user_id
    )
    doc = template.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.checklist_templates.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/checklist-templates/{template_id}")
async def update_checklist_template(template_id: str, data: ChecklistTemplateUpdate, user: User = Depends(get_current_user)):
    """Admin edita um template de checklist"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "items" in update_fields:
        items = []
        for i, item in enumerate(update_fields["items"]):
            items.append({
                "item_id": item.get("item_id", f"item_{uuid.uuid4().hex[:8]}"),
                "label": item["label"],
                "order": item.get("order", i)
            })
        update_fields["items"] = items
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    result = await db.checklist_templates.update_one(
        {"template_id": template_id, "entity_id": entity_id},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    updated = await db.checklist_templates.find_one({"template_id": template_id}, {"_id": 0})
    return updated

@api_router.delete("/checklist-templates/{template_id}")
async def delete_checklist_template(template_id: str, user: User = Depends(get_current_user)):
    """Admin exclui um template de checklist"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    result = await db.checklist_templates.delete_one({"template_id": template_id, "entity_id": entity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return {"message": "Template excluído"}


# ============== CHECKLIST ASSIGNMENT ROUTES ==============

@api_router.get("/checklist-assignments")
async def get_checklist_assignments(
    status: Optional[str] = None,
    member_id: Optional[str] = None,
    schedule_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Lista atribuições de checklists (filtros opcionais)"""
    entity_id = await get_current_entity_id(user)
    query = {"entity_id": entity_id}
    if status:
        query["status"] = status
    if member_id:
        query["assigned_to"] = member_id
    if schedule_id:
        query["schedule_id"] = schedule_id
    
    assignments = await db.checklist_assignments.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Enrich with member names
    for a in assignments:
        member = await db.members.find_one({"member_id": a["assigned_to"], "entity_id": entity_id}, {"_id": 0})
        a["assigned_to_name"] = member["name"] if member else "Desconhecido"
        a["assigned_to_picture"] = member.get("picture") if member else None
    
    return assignments

@api_router.get("/checklist-assignments/my")
async def get_my_checklists(user: User = Depends(get_current_user)):
    """Retorna checklists pendentes/em andamento do usuário logado"""
    entity_id = await get_current_entity_id(user)
    
    # Find user's member_id
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    if not member:
        return []
    
    assignments = await db.checklist_assignments.find(
        {
            "entity_id": entity_id,
            "assigned_to": member["member_id"],
            "status": {"$in": ["pending", "in_progress"]}
        },
        {"_id": 0}
    ).sort("due_date", 1).to_list(50)
    
    # Enrich with schedule info
    for a in assignments:
        schedule = await db.schedules.find_one({"schedule_id": a["schedule_id"]}, {"_id": 0})
        if schedule:
            a["schedule_title"] = schedule.get("title", "")
            a["schedule_date"] = schedule.get("date", "")
            a["schedule_time"] = f"{schedule.get('start_time', '')} - {schedule.get('end_time', '')}"
    
    return assignments

@api_router.post("/checklist-assignments")
async def create_checklist_assignment(data: ChecklistAssignmentCreate, schedule_id: str, user: User = Depends(get_current_user)):
    """Admin atribui um checklist a um membro em uma escala"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    # Validate template
    template = await db.checklist_templates.find_one({"template_id": data.template_id, "entity_id": entity_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template de checklist não encontrado")
    
    # Validate schedule
    schedule = await db.schedules.find_one({"schedule_id": schedule_id, "entity_id": entity_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    
    # Validate member is assigned to the schedule
    if data.assigned_to not in schedule.get("assigned_members", []):
        raise HTTPException(status_code=400, detail="Membro não está nesta escala")
    
    # Check if already has this checklist in this schedule
    existing = await db.checklist_assignments.find_one({
        "template_id": data.template_id,
        "schedule_id": schedule_id,
        "assigned_to": data.assigned_to
    })
    if existing:
        raise HTTPException(status_code=400, detail="Este membro já possui esta checklist nesta escala")
    
    # Create assignment with items from template
    items = []
    for item in template.get("items", []):
        items.append({
            "item_id": item["item_id"],
            "label": item["label"],
            "done": False,
            "done_at": None
        })
    
    assignment = ChecklistAssignment(
        entity_id=entity_id,
        template_id=data.template_id,
        checklist_title=template["title"],
        schedule_id=schedule_id,
        assigned_to=data.assigned_to,
        assigned_by=user.user_id,
        due_date=schedule.get("date"),
        items=items
    )
    doc = assignment.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.checklist_assignments.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.post("/schedules/{schedule_id}/checklists")
async def assign_checklist_to_schedule(schedule_id: str, data: ChecklistAssignmentCreate, user: User = Depends(get_current_user)):
    """Alias: atribui checklist via rota de escala"""
    return await create_checklist_assignment(data, schedule_id, user)

@api_router.get("/schedules/{schedule_id}/checklists")
async def get_schedule_checklists(schedule_id: str, user: User = Depends(get_current_user)):
    """Lista checklists de uma escala"""
    entity_id = await get_current_entity_id(user)
    
    assignments = await db.checklist_assignments.find(
        {"schedule_id": schedule_id, "entity_id": entity_id},
        {"_id": 0}
    ).to_list(50)
    
    for a in assignments:
        member = await db.members.find_one({"member_id": a["assigned_to"], "entity_id": entity_id}, {"_id": 0})
        a["assigned_to_name"] = member["name"] if member else "Desconhecido"
        a["assigned_to_picture"] = member.get("picture") if member else None
    
    return assignments

@api_router.put("/checklist-assignments/{assignment_id}/toggle-item")
async def toggle_checklist_item(assignment_id: str, data: ChecklistItemToggle, user: User = Depends(get_current_user)):
    """Membro marca/desmarca um item do checklist"""
    entity_id = await get_current_entity_id(user)
    
    assignment = await db.checklist_assignments.find_one(
        {"assignment_id": assignment_id, "entity_id": entity_id},
        {"_id": 0}
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Checklist não encontrado")
    
    # Verify user is the assigned member
    member = await db.members.find_one({"user_id": user.user_id, "entity_id": entity_id}, {"_id": 0})
    if not member or member["member_id"] != assignment["assigned_to"]:
        # Allow admin too
        is_admin = False
        try:
            await check_admin(user, entity_id)
            is_admin = True
        except:
            pass
        if not is_admin:
            raise HTTPException(status_code=403, detail="Apenas o responsável pode marcar itens")
    
    # Update the specific item
    items = assignment.get("items", [])
    item_found = False
    for item in items:
        if item["item_id"] == data.item_id:
            item["done"] = data.done
            item["done_at"] = datetime.now(timezone.utc).isoformat() if data.done else None
            item_found = True
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    # Check completion status
    total = len(items)
    done_count = sum(1 for it in items if it.get("done"))
    
    if done_count == total:
        new_status = "completed"
        completed_at = datetime.now(timezone.utc).isoformat()
    elif done_count > 0:
        new_status = "in_progress"
        completed_at = None
    else:
        new_status = "pending"
        completed_at = None
    
    await db.checklist_assignments.update_one(
        {"assignment_id": assignment_id},
        {"$set": {"items": items, "status": new_status, "completed_at": completed_at}}
    )
    
    # Award badge if completed
    if new_status == "completed" and member:
        await award_badge(user.user_id, "checklist_completed", entity_id)
        await add_points(user.user_id, 10, entity_id)
        
        # Check for checklist_10 badge
        completed_count = await db.checklist_assignments.count_documents({
            "assigned_to": member["member_id"],
            "entity_id": entity_id,
            "status": "completed"
        })
        if completed_count >= 10:
            await award_badge(user.user_id, "checklist_10", entity_id)
    
    updated = await db.checklist_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    updated["just_completed"] = new_status == "completed" and assignment.get("status") != "completed"
    return updated

@api_router.delete("/checklist-assignments/{assignment_id}")
async def delete_checklist_assignment(assignment_id: str, user: User = Depends(get_current_user)):
    """Admin remove uma atribuição de checklist"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    result = await db.checklist_assignments.delete_one({"assignment_id": assignment_id, "entity_id": entity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada")
    return {"message": "Checklist removido"}

@api_router.get("/reports/checklists")
async def get_checklist_report_data(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Retorna dados para o relatório de checklists"""
    entity_id = await get_current_entity_id(user)
    await check_admin(user, entity_id)
    
    query = {"entity_id": entity_id}
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = date_from
        if date_to:
            date_filter["$lte"] = date_to
        query["due_date"] = date_filter
    
    assignments = await db.checklist_assignments.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    
    # Enrich with names
    for a in assignments:
        member = await db.members.find_one({"member_id": a["assigned_to"], "entity_id": entity_id}, {"_id": 0})
        a["assigned_to_name"] = member["name"] if member else "Desconhecido"
        
        schedule = await db.schedules.find_one({"schedule_id": a["schedule_id"]}, {"_id": 0})
        a["schedule_title"] = schedule.get("title", "") if schedule else ""
    
    # Summary stats
    total = len(assignments)
    completed = sum(1 for a in assignments if a["status"] == "completed")
    in_progress = sum(1 for a in assignments if a["status"] == "in_progress")
    pending = sum(1 for a in assignments if a["status"] == "pending")
    
    # Per-member stats
    member_stats = {}
    for a in assignments:
        mid = a["assigned_to"]
        if mid not in member_stats:
            member_stats[mid] = {
                "name": a["assigned_to_name"],
                "total": 0, "completed": 0, "pending": 0, "in_progress": 0,
                "total_items": 0, "done_items": 0
            }
        member_stats[mid]["total"] += 1
        member_stats[mid][a["status"]] += 1
        member_stats[mid]["total_items"] += len(a.get("items", []))
        member_stats[mid]["done_items"] += sum(1 for it in a.get("items", []) if it.get("done"))
    
    return {
        "assignments": assignments,
        "summary": {
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "pending": pending
        },
        "member_stats": list(member_stats.values())
    }


@api_router.get("/")
async def root():
    return {"message": "Tomich Gestão de Mídia API", "version": "2.0.0"}

# Include the router in the main app
app.include_router(api_router)

# CORS Configuration
origins = os.environ.get('CORS_ORIGINS', '*').split(',')
allow_all = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_credentials=not allow_all, # credentials cannot be used with "*"
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
