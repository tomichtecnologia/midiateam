import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Calendar,
  CheckSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  ArrowRightLeft,
  Bell,
  BookOpen,
  Plus,
  Trash2,
  GripVertical,
  Pencil,
  StickyNote,
  Megaphone,
  Eye,
  Check,
  ClipboardCheck,
  ListChecks
} from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { format, parseISO, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getAvatarUrl } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
  <Card className="card-hover" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 font-outfit">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className={`w-4 h-4 ${trend >= 0 ? "text-green-500" : "text-red-500"}`} />
              <span className={`text-sm ${trend >= 0 ? "text-green-500" : "text-red-500"}`}>
                {trend >= 0 ? "+" : ""}{trend}%
              </span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ScheduleCard = ({ schedule, members }) => {
  const getMemberById = (id) => members.find((m) => m.member_id === id);
  const confirmed = schedule.confirmed_members?.length || 0;
  const total = schedule.assigned_members?.length || 1;
  const progress = (confirmed / total) * 100;

  return (
    <Card className="schedule-card card-hover" data-testid={`schedule-${schedule.schedule_id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-foreground">{schedule.title}</h4>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(schedule.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Badge variant={schedule.schedule_type === "class" ? "default" : "secondary"}>
            {schedule.schedule_type === "class" ? "Aula" : "Conteúdo"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Clock className="w-4 h-4" />
          <span>{schedule.start_time} - {schedule.end_time}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confirmações</span>
            <span className="font-medium">{confirmed}/{total}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <div className="flex -space-x-2 mt-3">
          {schedule.assigned_members?.slice(0, 4).map((memberId) => {
            const member = getMemberById(memberId);
            const isConfirmed = schedule.confirmed_members?.includes(memberId);
            return (
              <Avatar key={memberId} className={`w-8 h-8 border-2 ${isConfirmed ? "border-green-500" : "border-background"}`}>
                <AvatarImage src={getAvatarUrl(member?.picture)} />
                <AvatarFallback className="text-xs bg-muted">
                  {member?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            );
          })}
          {(schedule.assigned_members?.length || 0) > 4 && (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
              +{schedule.assigned_members.length - 4}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ApprovalCard = ({ approval, totalMembers }) => {
  const votesFor = approval.votes_for?.length || 0;
  const votesAgainst = approval.votes_against?.length || 0;
  const totalVotes = votesFor + votesAgainst;
  const approvalPercentage = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;

  return (
    <Card className="card-hover" data-testid={`approval-${approval.approval_id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {approval.thumbnail_url ? (
            <img
              src={approval.thumbnail_url}
              alt={approval.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{approval.title}</h4>
            <Badge variant="outline" className="mt-1">
              {approval.content_type}
            </Badge>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aprovação</span>
                <span className="font-medium">{Math.round(approvalPercentage)}%</span>
              </div>
              <Progress
                value={approvalPercentage}
                className={`h-2 ${approvalPercentage >= 50 ? "[&>div]:bg-green-500" : "[&>div]:bg-yellow-500"}`}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                {votesFor}
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="w-4 h-4" />
                {votesAgainst}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============== MY SCHEDULE CARD ==============
const MyScheduleCard = ({ schedule, currentMemberId, onConfirm, onDecline, onRequestSwap }) => {
  const isConfirmed = schedule.confirmed_members?.includes(currentMemberId);
  const isDeclined = schedule.declined_members?.includes(currentMemberId);
  const scheduleDate = parseISO(schedule.date);
  const isSchedulePast = isPast(scheduleDate) && !isToday(scheduleDate);
  const isScheduleToday = isToday(scheduleDate);
  const isScheduleTomorrow = isTomorrow(scheduleDate);

  const getStatusBadge = () => {
    if (isConfirmed) return <Badge className="bg-green-100 text-green-700">Confirmado</Badge>;
    if (isDeclined) return <Badge className="bg-red-100 text-red-700">Não vai</Badge>;
    if (isSchedulePast) return <Badge variant="secondary">Passada</Badge>;
    return <Badge className="bg-amber-100 text-amber-700">Pendente</Badge>;
  };

  const getDateBadge = () => {
    if (isScheduleToday) return <Badge className="bg-red-500 text-white">HOJE</Badge>;
    if (isScheduleTomorrow) return <Badge className="bg-orange-500 text-white">AMANHÃ</Badge>;
    return null;
  };

  return (
    <Card className={`card-hover ${isSchedulePast ? "opacity-60" : ""}`} data-testid={`my-schedule-${schedule.schedule_id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {getDateBadge()}
              {getStatusBadge()}
              <Badge variant={schedule.schedule_type === "class" ? "default" : "secondary"}>
                {schedule.schedule_type === "class" ? "Aula" : "Conteúdo"}
              </Badge>
            </div>
            <h4 className="font-semibold text-foreground">{schedule.title}</h4>
            <p className="text-sm text-muted-foreground">
              {format(scheduleDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Clock className="w-4 h-4" />
          <span>{schedule.start_time} - {schedule.end_time}</span>
        </div>

        {/* Action Buttons - Only show if not past and not already responded */}
        {!isSchedulePast && !isConfirmed && !isDeclined && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onConfirm(schedule.schedule_id, currentMemberId)}
              data-testid={`confirm-btn-${schedule.schedule_id}`}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Confirmar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => onDecline(schedule.schedule_id, currentMemberId)}
              data-testid={`decline-btn-${schedule.schedule_id}`}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Não Posso
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRequestSwap(schedule)}
              data-testid={`swap-btn-${schedule.schedule_id}`}
            >
              <ArrowRightLeft className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Show change option if already confirmed */}
        {!isSchedulePast && (isConfirmed || isDeclined) && (
          <div className="flex gap-2 mt-3">
            {isConfirmed && (
              <Button
                size="sm"
                variant="ghost"
                className="text-amber-600 hover:text-amber-700"
                onClick={() => onRequestSwap(schedule)}
                data-testid={`change-swap-${schedule.schedule_id}`}
              >
                <ArrowRightLeft className="w-4 h-4 mr-1" />
                Solicitar Troca
              </Button>
            )}
            {isDeclined && (
              <Button
                size="sm"
                variant="ghost"
                className="text-green-600 hover:text-green-700"
                onClick={() => onConfirm(schedule.schedule_id, currentMemberId)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Mudei de ideia - Vou!
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============== SWAP REQUEST CARD ==============
const SwapRequestCard = ({ request, onAccept, onCancel }) => {
  return (
    <Card className="border-amber-200 bg-amber-50" data-testid={`swap-request-${request.swap_id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={getAvatarUrl(request.requester_picture)} />
            <AvatarFallback>{request.requester_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-sm">{request.requester_name}</p>
            <p className="text-xs text-muted-foreground">
              precisa de alguém para {request.schedule_title}
            </p>
            <p className="text-xs text-muted-foreground">
              {request.schedule_date && format(parseISO(request.schedule_date), "dd/MM - EEEE", { locale: ptBR })}
            </p>
            <p className="text-sm text-amber-700 mt-1 italic">"{request.reason}"</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {request.can_accept && (
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onAccept(request.swap_id)}
              data-testid={`accept-swap-${request.swap_id}`}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Eu vou!
            </Button>
          )}
          {request.is_mine && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onCancel(request.swap_id)}
              data-testid={`cancel-swap-${request.swap_id}`}
            >
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New states for my schedules and swaps
  const [mySchedules, setMySchedules] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);

  // Swap dialog state
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [selectedScheduleForSwap, setSelectedScheduleForSwap] = useState(null);
  const [swapReason, setSwapReason] = useState("");
  const [swapTargetMember, setSwapTargetMember] = useState("");

  // Rules state
  const [rules, setRules] = useState([]);
  const [rulesUpdatedBy, setRulesUpdatedBy] = useState(null);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [editingRules, setEditingRules] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "", content: "", type: "general", target_sector: "", priority: "normal"
  });
  const [departments, setDepartments] = useState([]);

  // Checklists state
  const [myChecklists, setMyChecklists] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, schedulesRes, approvalsRes, membersRes, mySchedulesRes, swapRes, userRes, rulesRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { withCredentials: true }),
        axios.get(`${API}/dashboard/upcoming`, { withCredentials: true }),
        axios.get(`${API}/dashboard/pending-approvals`, { withCredentials: true }),
        axios.get(`${API}/members`, { withCredentials: true }),
        axios.get(`${API}/my-schedules`, { withCredentials: true }),
        axios.get(`${API}/schedules/swap-requests?status=pending`, { withCredentials: true }),
        axios.get(`${API}/auth/me`, { withCredentials: true }),
        axios.get(`${API}/rules`, { withCredentials: true })
      ]);

      setStats(statsRes.data);
      setUpcomingSchedules(schedulesRes.data);
      setPendingApprovals(approvalsRes.data);
      setMembers(membersRes.data);
      setMySchedules(mySchedulesRes.data);
      setSwapRequests(swapRes.data);

      // Rules
      const rulesData = rulesRes.data;
      setRules(rulesData.rules || []);
      if (rulesData.updated_by) {
        const updater = membersRes.data.find(m => m.user_id === rulesData.updated_by);
        setRulesUpdatedBy(updater?.name || "Admin");
      }

      // Find current member
      const member = membersRes.data.find(m => m.user_id === userRes.data.user_id);
      setCurrentMember(member);
      setIsAdmin(userRes.data.is_admin || userRes.data.role === "superadmin" || member?.is_admin || false);

      // Fetch announcements
      try {
        const annRes = await axios.get(`${API}/announcements`, { withCredentials: true });
        setAnnouncements(annRes.data);
      } catch (e) { console.error("Error fetching announcements:", e); }

      // Fetch my checklists
      try {
        const chkRes = await axios.get(`${API}/checklist-assignments/my`, { withCredentials: true });
        setMyChecklists(chkRes.data);
      } catch (e) { console.error("Error fetching checklists:", e); }

      // Fetch departments for announcement form
      try {
        const configRes = await axios.get(`${API}/entities/current/config`, { withCredentials: true });
        setDepartments(configRes.data.custom_departments || []);
      } catch (e) { console.error("Error fetching config:", e); }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAttendance = async (scheduleId, memberId) => {
    try {
      await axios.post(
        `${API}/schedules/${scheduleId}/attendance`,
        { schedule_id: scheduleId, member_id: memberId, status: "confirmed" },
        { withCredentials: true }
      );
      toast.success("Presença confirmada!");
      fetchDashboardData();
    } catch (error) {
      console.error("Error confirming:", error);
      toast.error("Erro ao confirmar presença");
    }
  };

  const handleDeclineAttendance = async (scheduleId, memberId) => {
    try {
      await axios.post(
        `${API}/schedules/${scheduleId}/attendance`,
        { schedule_id: scheduleId, member_id: memberId, status: "declined" },
        { withCredentials: true }
      );
      toast.success("Resposta registrada");
      fetchDashboardData();
    } catch (error) {
      console.error("Error declining:", error);
      toast.error("Erro ao registrar resposta");
    }
  };

  const handleOpenSwapDialog = (schedule) => {
    setSelectedScheduleForSwap(schedule);
    setSwapReason("");
    setSwapTargetMember("");
    setSwapDialogOpen(true);
  };

  const handleCreateSwapRequest = async () => {
    if (!swapReason.trim()) {
      toast.error("Informe o motivo da troca");
      return;
    }

    try {
      await axios.post(
        `${API}/schedules/swap-request`,
        {
          schedule_id: selectedScheduleForSwap.schedule_id,
          target_member_id: swapTargetMember && swapTargetMember !== "any" ? swapTargetMember : null,
          reason: swapReason.trim()
        },
        { withCredentials: true }
      );
      toast.success("Solicitação de troca enviada! Aguarde alguém aceitar.");
      setSwapDialogOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error("Error creating swap:", error);
      toast.error(error.response?.data?.detail || "Erro ao solicitar troca");
    }
  };

  const handleAcceptSwap = async (swapId) => {
    try {
      await axios.post(
        `${API}/schedules/swap-requests/${swapId}/respond`,
        { swap_id: swapId, accept: true },
        { withCredentials: true }
      );
      toast.success("Troca aceita! Você foi adicionado à escala.");
      fetchDashboardData();
    } catch (error) {
      console.error("Error accepting swap:", error);
      toast.error(error.response?.data?.detail || "Erro ao aceitar troca");
    }
  };

  const handleCancelSwap = async (swapId) => {
    try {
      await axios.delete(`${API}/schedules/swap-requests/${swapId}`, { withCredentials: true });
      toast.success("Solicitação cancelada");
      fetchDashboardData();
    } catch (error) {
      console.error("Error cancelling swap:", error);
      toast.error("Erro ao cancelar");
    }
  };

  // Filter swap requests - show those I can accept or my own pending
  const relevantSwapRequests = swapRequests.filter(r =>
    r.can_accept || (r.is_mine && r.status === "pending")
  );

  // ============== RULES HANDLERS ==============
  const handleOpenRulesDialog = () => {
    setEditingRules(rules.length > 0 ? [...rules] : [{ title: "", content: "", order: 0, active: true }]);
    setRulesDialogOpen(true);
  };

  const handleAddRule = () => {
    setEditingRules([...editingRules, { title: "", content: "", order: editingRules.length, active: true }]);
  };

  const handleRemoveRule = (index) => {
    setEditingRules(editingRules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index, field, value) => {
    const updated = [...editingRules];
    updated[index] = { ...updated[index], [field]: value };
    setEditingRules(updated);
  };

  const handleSaveRules = async () => {
    const validRules = editingRules.filter(r => r.title.trim());
    try {
      await axios.put(`${API}/rules`, { rules: validRules }, { withCredentials: true });
      toast.success("Regras atualizadas com sucesso!");
      setRulesDialogOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error("Error saving rules:", error);
      toast.error("Erro ao salvar regras");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema de mídia
          </p>
        </div>
        <Button asChild data-testid="new-schedule-btn">
          <Link to="/schedules">
            <Calendar className="w-4 h-4 mr-2" />
            Nova Escala
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Membros Ativos"
          value={stats?.total_members || 0}
          icon={Users}
          color="bg-primary"
        />
        <StatCard
          title="Escalas Ativas"
          value={stats?.active_schedules || 0}
          icon={Calendar}
          color="bg-secondary"
        />
        <StatCard
          title="Aprovações Pendentes"
          value={stats?.pending_approvals || 0}
          icon={CheckSquare}
          color="bg-amber-500"
        />
        <StatCard
          title="Confirmações"
          value={stats?.confirmed_attendance || 0}
          icon={CheckCircle}
          trend={stats?.growth_percentage}
          color="bg-green-500"
        />
      </div>

      {/* Swap Requests Alert */}
      {relevantSwapRequests.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <Bell className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>{relevantSwapRequests.filter(r => r.can_accept).length}</strong> solicitação(ões) de troca aguardando resposta
          </AlertDescription>
        </Alert>
      )}

      {/* MY SCHEDULES Section */}
      {mySchedules.length > 0 && (
        <Card data-testid="my-schedules-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="font-outfit text-lg">Minhas Escalas</CardTitle>
                <Badge variant="secondary">{mySchedules.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/schedules">
                  Ver todas
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySchedules.slice(0, 6).map((schedule) => (
                <MyScheduleCard
                  key={schedule.schedule_id}
                  schedule={schedule}
                  currentMemberId={currentMember?.member_id}
                  onConfirm={handleConfirmAttendance}
                  onDecline={handleDeclineAttendance}
                  onRequestSwap={handleOpenSwapDialog}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Swap Requests Section */}
      {relevantSwapRequests.length > 0 && (
        <Card data-testid="swap-requests-card" className="border-amber-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-600" />
              <CardTitle className="font-outfit text-lg">Solicitações de Troca</CardTitle>
              <Badge className="bg-amber-500">{relevantSwapRequests.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relevantSwapRequests.map((request) => (
                <SwapRequestCard
                  key={request.swap_id}
                  request={request}
                  onAccept={handleAcceptSwap}
                  onCancel={handleCancelSwap}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Checklists Section */}
      {myChecklists.length > 0 && (
        <Card data-testid="my-checklists-card" className="border-teal-200 bg-gradient-to-br from-teal-50/30 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-teal-600" />
                <CardTitle className="font-outfit text-lg">Minhas Checklists</CardTitle>
                <Badge className="bg-teal-500">{myChecklists.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/checklists">
                  Ver todas
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myChecklists.slice(0, 6).map((checklist) => {
                const totalItems = checklist.items?.length || 0;
                const doneItems = checklist.items?.filter(i => i.done).length || 0;
                const progress = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;
                return (
                  <Card key={checklist.assignment_id} className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{checklist.checklist_title}</h4>
                        <Badge variant={progress === 100 ? "default" : "outline"} className="text-xs">
                          {doneItems}/{totalItems}
                        </Badge>
                      </div>
                      {checklist.schedule_title && (
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {checklist.schedule_title}
                          {checklist.schedule_date && ` — ${format(parseISO(checklist.schedule_date), "dd/MM", { locale: ptBR })}`}
                        </p>
                      )}
                      <Progress value={progress} className={`h-2 mb-3 ${progress === 100 ? "[&>div]:bg-green-500" : ""}`} />
                      <div className="space-y-1.5">
                        {checklist.items?.map((item) => (
                          <button
                            key={item.item_id}
                            className={`w-full flex items-center gap-2 p-1.5 rounded text-xs text-left transition-all ${item.done
                                ? "text-green-600 line-through opacity-60"
                                : "text-foreground hover:bg-muted"
                              }`}
                            onClick={async () => {
                              try {
                                const res = await axios.put(
                                  `${API}/checklist-assignments/${checklist.assignment_id}/toggle-item`,
                                  { item_id: item.item_id, done: !item.done },
                                  { withCredentials: true }
                                );
                                if (res.data.just_completed) {
                                  toast.success("🎉 Checklist concluída! +10 pontos!", { duration: 5000 });
                                }
                                fetchDashboardData();
                              } catch (err) {
                                toast.error(err.response?.data?.detail || "Erro");
                              }
                            }}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${item.done ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30"
                              }`}>
                              {item.done && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Schedules */}
        <Card data-testid="upcoming-schedules-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-outfit text-lg">Próximas Escalas</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/schedules" data-testid="view-all-schedules">
                  Ver todas
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingSchedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma escala programada</p>
              </div>
            ) : (
              upcomingSchedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.schedule_id}
                  schedule={schedule}
                  members={members}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card data-testid="pending-approvals-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-outfit text-lg">Aprovações Pendentes</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/approvals" data-testid="view-all-approvals">
                  Ver todas
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma aprovação pendente</p>
              </div>
            ) : (
              pendingApprovals.map((approval) => (
                <ApprovalCard
                  key={approval.approval_id}
                  approval={approval}
                  totalMembers={stats?.total_members || 1}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements / Avisos */}
      <Card data-testid="announcements-card" className="border-orange-200/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <CardTitle className="font-outfit text-lg">Avisos</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Comunicados da organização</p>
              </div>
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewAnnouncement({ title: "", content: "", type: "general", target_sector: "", priority: "normal" });
                  setAnnouncementDialogOpen(true);
                }}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo Aviso
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum aviso no momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((ann) => {
                const hasRead = ann.read_by?.some(r => r.user_id === currentMember?.user_id);
                const readCount = ann.read_by?.length || 0;
                const totalMembers = members.length;
                return (
                  <div
                    key={ann.announcement_id}
                    className={`p-4 rounded-lg border ${ann.priority === 'urgent' ? 'border-red-300 bg-red-50/80' :
                      ann.priority === 'important' ? 'border-amber-300 bg-amber-50/80' :
                        'border-gray-200 bg-gray-50/50'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{ann.title}</h4>
                          {ann.type === 'sector' && (
                            <Badge variant="outline" className="text-xs">{ann.target_sector}</Badge>
                          )}
                          {ann.priority === 'urgent' && (
                            <Badge variant="destructive" className="text-xs">Urgente</Badge>
                          )}
                          {ann.priority === 'important' && (
                            <Badge className="bg-amber-500 text-xs">Importante</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {ann.created_by_name} • {readCount}/{totalMembers} leram
                          </span>
                          <div className="flex-1 max-w-[120px]">
                            <Progress value={(readCount / Math.max(totalMembers, 1)) * 100} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {hasRead ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Lido
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                            onClick={async () => {
                              try {
                                await axios.post(`${API}/announcements/${ann.announcement_id}/read`, {}, { withCredentials: true });
                                toast.success("Leitura confirmada!");
                                fetchDashboardData();
                              } catch (e) {
                                toast.error("Erro ao confirmar");
                              }
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Li e estou de acordo
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:text-red-600"
                            onClick={async () => {
                              try {
                                await axios.delete(`${API}/announcements/${ann.announcement_id}`, { withCredentials: true });
                                toast.success("Aviso excluído!");
                                fetchDashboardData();
                              } catch (e) {
                                toast.error("Erro ao excluir");
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules Board */}
      <Card data-testid="rules-board-card" className="border-blue-200/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="font-outfit text-lg">Regras da Organização</CardTitle>
                {rulesUpdatedBy && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Atualizado por {rulesUpdatedBy}
                  </p>
                )}
              </div>
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenRulesDialog}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                data-testid="edit-rules-btn"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rules.filter(r => r.active !== false).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma regra definida</p>
              {isAdmin && (
                <p className="text-sm mt-1">Clique em "Editar" para adicionar regras</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {rules.filter(r => r.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0)).map((rule, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-100/60"
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground">{rule.title}</h4>
                    {rule.content && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{rule.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Swap Request Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-600" />
              Solicitar Troca de Escala
            </DialogTitle>
          </DialogHeader>
          {selectedScheduleForSwap && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedScheduleForSwap.title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(selectedScheduleForSwap.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedScheduleForSwap.start_time} - {selectedScheduleForSwap.end_time}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Motivo da troca *</Label>
                <Textarea
                  placeholder="Ex: Tenho um compromisso médico nesse horário..."
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  data-testid="swap-reason-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Pedir para alguém específico? (opcional)</Label>
                <Select value={swapTargetMember} onValueChange={setSwapTargetMember}>
                  <SelectTrigger data-testid="swap-target-select">
                    <SelectValue placeholder="Qualquer pessoa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer pessoa</SelectItem>
                    {members
                      .filter(m => m.member_id !== currentMember?.member_id && m.active)
                      .map((member) => (
                        <SelectItem key={member.member_id} value={member.member_id}>
                          {member.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se não selecionar, qualquer membro pode aceitar sua troca
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={handleCreateSwapRequest}
              disabled={!swapReason.trim()}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="submit-swap-btn"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Solicitar Troca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rules Edit Dialog */}
      <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Editar Regras da Organização
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Defina as regras e diretrizes para os membros da sua organização.
            </p>
            {editingRules.map((rule, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Regra {index + 1}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveRule(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Título da regra (ex: Horário de chegada)"
                  value={rule.title}
                  onChange={(e) => handleRuleChange(index, "title", e.target.value)}
                  className="font-medium"
                />
                <Textarea
                  placeholder="Descrição detalhada (opcional)"
                  value={rule.content || ""}
                  onChange={(e) => handleRuleChange(index, "content", e.target.value)}
                  rows={2}
                />
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
              onClick={handleAddRule}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Regra
            </Button>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={handleSaveRules}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="save-rules-btn"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Salvar Regras
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-500" />
              Novo Aviso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Reunião geral na sexta"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                placeholder="Descreva o aviso..."
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newAnnouncement.type}
                  onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral (todos)</SelectItem>
                    <SelectItem value="sector">Por Setor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={newAnnouncement.priority}
                  onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, priority: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Importante</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newAnnouncement.type === "sector" && (
              <div className="space-y-2">
                <Label>Setor de destino</Label>
                <Select
                  value={newAnnouncement.target_sector}
                  onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, target_sector: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              disabled={!newAnnouncement.title.trim() || !newAnnouncement.content.trim() || (newAnnouncement.type === 'sector' && !newAnnouncement.target_sector)}
              className="bg-orange-600 hover:bg-orange-700"
              onClick={async () => {
                try {
                  await axios.post(`${API}/announcements`, newAnnouncement, { withCredentials: true });
                  toast.success("Aviso criado!");
                  setAnnouncementDialogOpen(false);
                  fetchDashboardData();
                } catch (e) {
                  toast.error("Erro ao criar aviso");
                }
              }}
            >
              <Megaphone className="w-4 h-4 mr-2" />
              Publicar Aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
