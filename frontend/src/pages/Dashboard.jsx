import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  CheckSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
                <AvatarImage src={member?.picture} />
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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, schedulesRes, approvalsRes, membersRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`, { withCredentials: true }),
          axios.get(`${API}/dashboard/upcoming`, { withCredentials: true }),
          axios.get(`${API}/dashboard/pending-approvals`, { withCredentials: true }),
          axios.get(`${API}/members`, { withCredentials: true })
        ]);

        setStats(statsRes.data);
        setUpcomingSchedules(schedulesRes.data);
        setPendingApprovals(approvalsRes.data);
        setMembers(membersRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
    </div>
  );
}
