import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarDays,
  Video,
  GraduationCap
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ScheduleDetailCard = ({ schedule, members, onConfirm, currentUserMemberId }) => {
  const getMemberById = (id) => members.find((m) => m.member_id === id);
  const confirmed = schedule.confirmed_members?.length || 0;
  const total = schedule.assigned_members?.length || 1;
  const progress = (confirmed / total) * 100;

  const isAssigned = schedule.assigned_members?.includes(currentUserMemberId);
  const hasConfirmed = schedule.confirmed_members?.includes(currentUserMemberId);
  const hasDeclined = schedule.declined_members?.includes(currentUserMemberId);

  return (
    <Card className="schedule-card card-hover" data-testid={`schedule-detail-${schedule.schedule_id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {schedule.schedule_type === "class" ? (
                <GraduationCap className="w-5 h-5 text-primary" />
              ) : (
                <Video className="w-5 h-5 text-secondary" />
              )}
              <h3 className="font-semibold text-lg">{schedule.title}</h3>
            </div>
            <p className="text-muted-foreground">
              {format(parseISO(schedule.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Badge variant={schedule.schedule_type === "class" ? "default" : "secondary"}>
            {schedule.schedule_type === "class" ? "Aula" : "Conteúdo"}
          </Badge>
        </div>

        {schedule.description && (
          <p className="text-sm text-muted-foreground mb-4">{schedule.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{schedule.start_time} - {schedule.end_time}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{total} pessoas</span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confirmações</span>
            <span className="font-medium text-green-600">{confirmed}/{total}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Assigned Members */}
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium">Equipe Escalada:</p>
          <div className="flex flex-wrap gap-2">
            {schedule.assigned_members?.map((memberId) => {
              const member = getMemberById(memberId);
              const isConfirmed = schedule.confirmed_members?.includes(memberId);
              const isDeclined = schedule.declined_members?.includes(memberId);
              
              return (
                <div
                  key={memberId}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    isConfirmed
                      ? "bg-green-50 border-green-200"
                      : isDeclined
                      ? "bg-red-50 border-red-200"
                      : "bg-muted border-border"
                  }`}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={member?.picture} />
                    <AvatarFallback className="text-xs">
                      {member?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member?.name || "Desconhecido"}</span>
                  {isConfirmed && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {isDeclined && <XCircle className="w-4 h-4 text-red-500" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Confirmation Buttons */}
        {isAssigned && !hasConfirmed && !hasDeclined && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              className="flex-1 h-12"
              onClick={() => onConfirm(schedule.schedule_id, currentUserMemberId, "confirmed")}
              data-testid={`confirm-attendance-${schedule.schedule_id}`}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Confirmar Presença
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => onConfirm(schedule.schedule_id, currentUserMemberId, "declined")}
              data-testid={`decline-attendance-${schedule.schedule_id}`}
            >
              <XCircle className="w-5 h-5 mr-2" />
              Não Posso Ir
            </Button>
          </div>
        )}

        {hasConfirmed && (
          <div className="flex items-center gap-2 text-green-600 pt-4 border-t">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Presença Confirmada</span>
          </div>
        )}

        {hasDeclined && (
          <div className="flex items-center gap-2 text-red-500 pt-4 border-t">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Ausência Registrada</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentUserMember, setCurrentUserMember] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    schedule_type: "class",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "19:00",
    end_time: "21:00",
    assigned_members: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesRes, membersRes, userRes] = await Promise.all([
        axios.get(`${API}/schedules`, { withCredentials: true }),
        axios.get(`${API}/members`, { withCredentials: true }),
        axios.get(`${API}/auth/me`, { withCredentials: true })
      ]);

      setSchedules(schedulesRes.data);
      setMembers(membersRes.data);

      // Find current user's member record
      const userMember = membersRes.data.find(m => m.user_id === userRes.data.user_id);
      setCurrentUserMember(userMember);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      await axios.post(`${API}/schedules`, formData, { withCredentials: true });
      toast.success("Escala criada com sucesso!");
      setIsCreateOpen(false);
      setFormData({
        title: "",
        description: "",
        schedule_type: "class",
        date: format(new Date(), "yyyy-MM-dd"),
        start_time: "19:00",
        end_time: "21:00",
        assigned_members: []
      });
      fetchData();
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast.error("Erro ao criar escala");
    }
  };

  const handleConfirmAttendance = async (scheduleId, memberId, status) => {
    try {
      await axios.post(
        `${API}/schedules/${scheduleId}/attendance`,
        { schedule_id: scheduleId, member_id: memberId, status },
        { withCredentials: true }
      );
      toast.success(status === "confirmed" ? "Presença confirmada!" : "Ausência registrada");
      fetchData();
    } catch (error) {
      console.error("Error confirming attendance:", error);
      toast.error("Erro ao confirmar presença");
    }
  };

  const filteredSchedules = schedules.filter((schedule) => {
    if (activeTab === "class") return schedule.schedule_type === "class";
    if (activeTab === "content") return schedule.schedule_type === "content";
    return true;
  });

  const schedulesForSelectedDate = filteredSchedules.filter((schedule) =>
    isSameDay(parseISO(schedule.date), selectedDate)
  );

  // Get dates with schedules for calendar highlighting
  const datesWithSchedules = schedules.map((s) => parseISO(s.date));

  if (loading) {
    return (
      <div className="space-y-6" data-testid="schedules-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="schedules-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-foreground">Escalas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as escalas de aulas e produção de conteúdo
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-schedule-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nova Escala
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-outfit">Criar Nova Escala</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Ex: Aula de Segunda"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="schedule-title-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Detalhes da escala..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="schedule-description-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.schedule_type}
                    onValueChange={(value) => setFormData({ ...formData, schedule_type: value })}
                  >
                    <SelectTrigger data-testid="schedule-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class">Aula</SelectItem>
                      <SelectItem value="content">Conteúdo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    data-testid="schedule-date-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    data-testid="schedule-start-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Término</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    data-testid="schedule-end-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Membros Escalados</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (!formData.assigned_members.includes(value)) {
                      setFormData({
                        ...formData,
                        assigned_members: [...formData.assigned_members, value]
                      });
                    }
                  }}
                >
                  <SelectTrigger data-testid="schedule-members-select">
                    <SelectValue placeholder="Adicionar membro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.filter(m => !formData.assigned_members.includes(m.member_id)).map((member) => (
                      <SelectItem key={member.member_id} value={member.member_id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.assigned_members.map((memberId) => {
                    const member = members.find(m => m.member_id === memberId);
                    return (
                      <Badge
                        key={memberId}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => setFormData({
                          ...formData,
                          assigned_members: formData.assigned_members.filter(id => id !== memberId)
                        })}
                      >
                        {member?.name} ×
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleCreateSchedule} data-testid="save-schedule-btn">
                Criar Escala
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            <CalendarDays className="w-4 h-4 mr-2" />
            Todas
          </TabsTrigger>
          <TabsTrigger value="class" data-testid="tab-class">
            <GraduationCap className="w-4 h-4 mr-2" />
            Aulas (Seg/Qua/Sex)
          </TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content">
            <Video className="w-4 h-4 mr-2" />
            Conteúdo (Diário)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1" data-testid="schedule-calendar">
          <CardHeader>
            <CardTitle className="font-outfit text-lg">Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              modifiers={{
                hasSchedule: datesWithSchedules
              }}
              modifiersStyles={{
                hasSchedule: {
                  backgroundColor: "hsl(var(--primary) / 0.1)",
                  fontWeight: "bold"
                }
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Schedules List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-outfit text-xl font-semibold">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </h2>
            <Badge variant="outline">
              {schedulesForSelectedDate.length} escala(s)
            </Badge>
          </div>

          {schedulesForSelectedDate.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma escala para este dia</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {schedulesForSelectedDate.map((schedule) => (
                <ScheduleDetailCard
                  key={schedule.schedule_id}
                  schedule={schedule}
                  members={members}
                  onConfirm={handleConfirmAttendance}
                  currentUserMemberId={currentUserMember?.member_id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
