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

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    phone: Optional[str] = None
    role: str = "member"  # member, leader, admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    picture: Optional[str] = None

class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    member_id: str = Field(default_factory=lambda: f"member_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    email: str
    phone: Optional[str] = None
    picture: Optional[str] = None
    role: str = "operator"  # operator, editor, camera, sound, social_media
    department: str = "production"  # production, content, development
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemberCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    picture: Optional[str] = None
    role: str = "operator"
    department: str = "production"

class Schedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    schedule_id: str = Field(default_factory=lambda: f"schedule_{uuid.uuid4().hex[:12]}")
    title: str
    description: Optional[str] = None
    schedule_type: str  # class (aulas seg/qua/sex) or content (diário)
    date: str  # ISO date string
    start_time: str
    end_time: str
    assigned_members: List[str] = []  # List of member_ids
    confirmed_members: List[str] = []  # List of member_ids who confirmed
    declined_members: List[str] = []  # List of member_ids who declined
    substitutes: dict = {}  # {original_member_id: substitute_member_id}
    confirmation_deadline: str  # ISO datetime string - 1 day before
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

class AttendanceConfirmation(BaseModel):
    schedule_id: str
    member_id: str
    status: str  # confirmed, declined
    substitute_id: Optional[str] = None

class ContentApproval(BaseModel):
    model_config = ConfigDict(extra="ignore")
    approval_id: str = Field(default_factory=lambda: f"approval_{uuid.uuid4().hex[:12]}")
    title: str
    description: str
    content_type: str  # video, image, post, story
    content_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    submitted_by: str
    votes_for: List[str] = []  # List of user_ids
    votes_against: List[str] = []  # List of user_ids
    status: str = "pending"  # pending, approved, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContentApprovalCreate(BaseModel):
    title: str
    description: str
    content_type: str
    content_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

class Vote(BaseModel):
    approval_id: str
    vote: str  # for, against

class Link(BaseModel):
    model_config = ConfigDict(extra="ignore")
    link_id: str = Field(default_factory=lambda: f"link_{uuid.uuid4().hex[:12]}")
    title: str
    url: str
    category: str  # tools, social, resources, passwords
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

class DashboardStats(BaseModel):
    total_members: int
    active_schedules: int
    pending_approvals: int
    confirmed_attendance: int
    growth_percentage: float

# ============== AUTH HELPERS ==============

async def get_current_user(request: Request) -> User:
    """Get current user from session token"""
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
    
    # Check expiry
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

# ============== AUTH ROUTES ==============

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id with Emergent Auth
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        auth_data = auth_response.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data.get("picture")
            }}
        )
    else:
        # Create new user
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "role": "member",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
        
        # Also create a member entry
        member = {
            "member_id": f"member_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "name": auth_data["name"],
            "email": auth_data["email"],
            "picture": auth_data.get("picture"),
            "role": "operator",
            "department": "production",
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.members.insert_one(member)
    
    # Create session
    session_token = auth_data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
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
    return user

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============== MEMBERS ROUTES ==============

@api_router.get("/members", response_model=List[dict])
async def get_members(user: User = Depends(get_current_user)):
    """Get all members"""
    members = await db.members.find({"active": True}, {"_id": 0}).to_list(1000)
    return members

@api_router.get("/members/{member_id}")
async def get_member(member_id: str, user: User = Depends(get_current_user)):
    """Get a specific member"""
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@api_router.post("/members")
async def create_member(member_data: MemberCreate, user: User = Depends(get_current_user)):
    """Create a new member"""
    member = Member(
        user_id=user.user_id,
        **member_data.model_dump()
    )
    doc = member.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.members.insert_one(doc)
    return doc

@api_router.put("/members/{member_id}")
async def update_member(member_id: str, member_data: MemberCreate, user: User = Depends(get_current_user)):
    """Update a member"""
    result = await db.members.update_one(
        {"member_id": member_id},
        {"$set": member_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return await db.members.find_one({"member_id": member_id}, {"_id": 0})

@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str, user: User = Depends(get_current_user)):
    """Soft delete a member"""
    result = await db.members.update_one(
        {"member_id": member_id},
        {"$set": {"active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted"}

# ============== SCHEDULES ROUTES ==============

@api_router.get("/schedules", response_model=List[dict])
async def get_schedules(
    schedule_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get schedules with optional filters"""
    query = {}
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
    """Get a specific schedule"""
    schedule = await db.schedules.find_one({"schedule_id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule

@api_router.post("/schedules")
async def create_schedule(schedule_data: ScheduleCreate, user: User = Depends(get_current_user)):
    """Create a new schedule"""
    # Calculate confirmation deadline (1 day before)
    schedule_date = datetime.fromisoformat(schedule_data.date)
    deadline = schedule_date - timedelta(days=1)
    
    schedule = Schedule(
        **schedule_data.model_dump(),
        confirmation_deadline=deadline.isoformat(),
        created_by=user.user_id
    )
    doc = schedule.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.schedules.insert_one(doc)
    return doc

@api_router.put("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, schedule_data: ScheduleCreate, user: User = Depends(get_current_user)):
    """Update a schedule"""
    result = await db.schedules.update_one(
        {"schedule_id": schedule_id},
        {"$set": schedule_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return await db.schedules.find_one({"schedule_id": schedule_id}, {"_id": 0})

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, user: User = Depends(get_current_user)):
    """Delete a schedule"""
    result = await db.schedules.delete_one({"schedule_id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted"}

# ============== ATTENDANCE ROUTES ==============

@api_router.post("/schedules/{schedule_id}/attendance")
async def confirm_attendance(schedule_id: str, confirmation: AttendanceConfirmation, user: User = Depends(get_current_user)):
    """Confirm or decline attendance"""
    schedule = await db.schedules.find_one({"schedule_id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    member_id = confirmation.member_id
    
    if confirmation.status == "confirmed":
        # Add to confirmed, remove from declined
        await db.schedules.update_one(
            {"schedule_id": schedule_id},
            {
                "$addToSet": {"confirmed_members": member_id},
                "$pull": {"declined_members": member_id}
            }
        )
    elif confirmation.status == "declined":
        # Add to declined, remove from confirmed, add substitute if provided
        update = {
            "$addToSet": {"declined_members": member_id},
            "$pull": {"confirmed_members": member_id}
        }
        if confirmation.substitute_id:
            update["$set"] = {f"substitutes.{member_id}": confirmation.substitute_id}
        
        await db.schedules.update_one({"schedule_id": schedule_id}, update)
    
    return await db.schedules.find_one({"schedule_id": schedule_id}, {"_id": 0})

@api_router.get("/my-schedules")
async def get_my_schedules(user: User = Depends(get_current_user)):
    """Get schedules for current user"""
    # Find member by user_id
    member = await db.members.find_one({"user_id": user.user_id}, {"_id": 0})
    if not member:
        return []
    
    member_id = member["member_id"]
    schedules = await db.schedules.find(
        {"assigned_members": member_id},
        {"_id": 0}
    ).sort("date", 1).to_list(100)
    
    return schedules

# ============== CONTENT APPROVAL ROUTES ==============

@api_router.get("/approvals", response_model=List[dict])
async def get_approvals(status: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get content approvals"""
    query = {}
    if status:
        query["status"] = status
    approvals = await db.content_approvals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return approvals

@api_router.post("/approvals")
async def create_approval(approval_data: ContentApprovalCreate, user: User = Depends(get_current_user)):
    """Submit content for approval"""
    approval = ContentApproval(
        **approval_data.model_dump(),
        submitted_by=user.user_id
    )
    doc = approval.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.content_approvals.insert_one(doc)
    return doc

@api_router.post("/approvals/{approval_id}/vote")
async def vote_on_approval(approval_id: str, vote: Vote, user: User = Depends(get_current_user)):
    """Vote on content approval"""
    approval = await db.content_approvals.find_one({"approval_id": approval_id}, {"_id": 0})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    if approval["status"] != "pending":
        raise HTTPException(status_code=400, detail="Voting is closed")
    
    # Remove previous vote
    await db.content_approvals.update_one(
        {"approval_id": approval_id},
        {
            "$pull": {
                "votes_for": user.user_id,
                "votes_against": user.user_id
            }
        }
    )
    
    # Add new vote
    if vote.vote == "for":
        await db.content_approvals.update_one(
            {"approval_id": approval_id},
            {"$addToSet": {"votes_for": user.user_id}}
        )
    else:
        await db.content_approvals.update_one(
            {"approval_id": approval_id},
            {"$addToSet": {"votes_against": user.user_id}}
        )
    
    # Check if approval threshold reached (50%+)
    updated = await db.content_approvals.find_one({"approval_id": approval_id}, {"_id": 0})
    total_members = await db.members.count_documents({"active": True})
    total_votes = len(updated["votes_for"]) + len(updated["votes_against"])
    
    if total_votes > 0 and total_members > 0:
        approval_percentage = len(updated["votes_for"]) / total_votes * 100
        if approval_percentage > 50 and total_votes >= max(1, total_members // 2):
            await db.content_approvals.update_one(
                {"approval_id": approval_id},
                {"$set": {"status": "approved"}}
            )
        elif approval_percentage < 50 and total_votes >= max(1, total_members // 2):
            await db.content_approvals.update_one(
                {"approval_id": approval_id},
                {"$set": {"status": "rejected"}}
            )
    
    return await db.content_approvals.find_one({"approval_id": approval_id}, {"_id": 0})

# ============== LINKS ROUTES ==============

@api_router.get("/links", response_model=List[dict])
async def get_links(category: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get links and resources"""
    query = {}
    if category:
        query["category"] = category
    links = await db.links.find(query, {"_id": 0}).to_list(1000)
    return links

@api_router.post("/links")
async def create_link(link_data: LinkCreate, user: User = Depends(get_current_user)):
    """Create a new link"""
    link = Link(**link_data.model_dump(), created_by=user.user_id)
    doc = link.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.links.insert_one(doc)
    return doc

@api_router.put("/links/{link_id}")
async def update_link(link_id: str, link_data: LinkCreate, user: User = Depends(get_current_user)):
    """Update a link"""
    result = await db.links.update_one(
        {"link_id": link_id},
        {"$set": link_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    return await db.links.find_one({"link_id": link_id}, {"_id": 0})

@api_router.delete("/links/{link_id}")
async def delete_link(link_id: str, user: User = Depends(get_current_user)):
    """Delete a link"""
    result = await db.links.delete_one({"link_id": link_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    return {"message": "Link deleted"}

# ============== DASHBOARD ROUTES ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    total_members = await db.members.count_documents({"active": True})
    
    # Get schedules for next 7 days
    today = datetime.now(timezone.utc).date().isoformat()
    week_later = (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat()
    active_schedules = await db.schedules.count_documents({
        "date": {"$gte": today, "$lte": week_later}
    })
    
    pending_approvals = await db.content_approvals.count_documents({"status": "pending"})
    
    # Count confirmed attendance for upcoming schedules
    upcoming_schedules = await db.schedules.find(
        {"date": {"$gte": today}},
        {"confirmed_members": 1, "_id": 0}
    ).to_list(100)
    confirmed_attendance = sum(len(s.get("confirmed_members", [])) for s in upcoming_schedules)
    
    # Calculate growth (comparing this month to last month members)
    this_month_start = datetime.now(timezone.utc).replace(day=1).isoformat()
    last_month = datetime.now(timezone.utc).replace(day=1) - timedelta(days=1)
    last_month_start = last_month.replace(day=1).isoformat()
    
    this_month_members = await db.members.count_documents({
        "created_at": {"$gte": this_month_start}
    })
    last_month_members = await db.members.count_documents({
        "created_at": {"$gte": last_month_start, "$lt": this_month_start}
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
    """Get upcoming schedules for dashboard"""
    today = datetime.now(timezone.utc).date().isoformat()
    schedules = await db.schedules.find(
        {"date": {"$gte": today}},
        {"_id": 0}
    ).sort("date", 1).limit(5).to_list(5)
    return schedules

@api_router.get("/dashboard/pending-approvals")
async def get_pending_approvals_dashboard(user: User = Depends(get_current_user)):
    """Get pending approvals for dashboard"""
    approvals = await db.content_approvals.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    return approvals

# ============== AI SUGGESTIONS ROUTE ==============

@api_router.post("/ai/suggest")
async def get_ai_suggestion(request: Request, user: User = Depends(get_current_user)):
    """Get AI-powered content suggestions"""
    data = await request.json()
    prompt = data.get("prompt", "")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"rhema_{user.user_id}_{uuid.uuid4().hex[:8]}",
            system_message="Você é um assistente criativo para uma equipe de mídia de igreja. Ajude com ideias de conteúdo, roteiros, legendas para redes sociais e estratégias de mídia. Seja criativo, relevante e alinhado com valores cristãos."
        )
        chat.with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"suggestion": response}
    except ImportError:
        raise HTTPException(status_code=500, detail="AI service not available")
    except Exception as e:
        logger.error(f"AI suggestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "Rhema Media System API", "version": "1.0.0"}

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
