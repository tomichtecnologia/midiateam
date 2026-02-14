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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  CalendarDays,
  Video,
  GraduationCap,
  Repeat,
  Instagram,
  ClipboardList,
  Edit2,
  Trash2,
  User,
  AlertCircle,
  MoreVertical
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ScheduleDetailCard = ({ schedule, members, onConfirm, onDelete, currentUserMemberId, isAdmin }) => {
  const getMemberById = (id) => members.find((m) => m.member_id === id);
  const confirmed = schedule.confirmed_members?.length || 0;
  const total = schedule.assigned_members?.length || 1;
  const progress = (confirmed / total) * 100;

  const isAssigned = schedule.assigned_members?.includes(currentUserMemberId);
  const hasConfirmed = schedule.confirmed_members?.includes(currentUserMemberId);
  const hasDeclined = schedule.declined_members?.includes(currentUserMemberId);
  const isRecurring = schedule.repeat_type && schedule.repeat_type !== "none";

  const getScheduleTypeLabel = (type) => {
    switch(type) {
      case "class": return "Aula";
      case "content": return "Postagem";
      default: return type;
    }
  };

  const getScheduleTypeIcon = (type) => {
    switch(type) {
      case "class": return <GraduationCap className="w-5 h-5 text-primary" />;
      case "content": return <Instagram className="w-5 h-5 text-pink-500" />;
      default: return <CalendarDays className="w-5 h-5" />;
    }
  };

  return (
    <Card className="schedule-card card-hover" data-testid={`schedule-detail-${schedule.schedule_id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {getScheduleTypeIcon(schedule.schedule_type)}
              <h3 className="font-semibold text-lg">{schedule.title}</h3>
            </div>
            <p className="text-muted-foreground">
              {format(parseISO(schedule.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1 items-end">
              <Badge variant={schedule.schedule_type === "class" ? "default" : "secondary"}>
                {getScheduleTypeLabel(schedule.schedule_type)}
              </Badge>
              {isRecurring && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  {schedule.repeat_type === "weekly" ? "Semanal" : 
                   schedule.repeat_type === "daily" ? "Diário" : 
                   schedule.repeat_type === "monthly" ? "Mensal" : ""}
                </Badge>
              )}
            </div>
            {/* Admin Actions Menu */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`schedule-menu-${schedule.schedule_id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(schedule.schedule_id, false)}
                    data-testid={`delete-single-${schedule.schedule_id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir esta escala
                  </DropdownMenuItem>
                  {isRecurring && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(schedule.schedule_id, true)}
                        data-testid={`delete-all-${schedule.schedule_id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir todas as recorrências
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
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

// ============== RESPONSIBILITY CARD ==============

const categoryLabels = {
  social_media: { label: "Redes Sociais", color: "bg-pink-100 text-pink-700" },
  art: { label: "Arte/Design", color: "bg-purple-100 text-purple-700" },
  production: { label: "Produção", color: "bg-blue-100 text-blue-700" },
  content: { label: "Conteúdo", color: "bg-green-100 text-green-700" },
  admin: { label: "Administrativo", color: "bg-amber-100 text-amber-700" },
  other: { label: "Outros", color: "bg-gray-100 text-gray-700" }
};

const frequencyLabels = {
  always: "Sempre",
  weekly: "Semanal",
  monthly: "Mensal",
  as_needed: "Sob Demanda"
};

const priorityLabels = {
  low: { label: "Baixa", color: "text-green-600" },
  medium: { label: "Média", color: "text-amber-600" },
  high: { label: "Alta", color: "text-red-600" }
};

const ResponsibilityCard = ({ responsibility, members, onEdit, onDelete, onToggle }) => {
  const member = members.find(m => m.member_id === responsibility.assigned_to);
  const category = categoryLabels[responsibility.category] || categoryLabels.other;
  const priority = priorityLabels[responsibility.priority] || priorityLabels.medium;

  return (
    <Card className={`card-hover group ${!responsibility.active ? "opacity-60" : ""}`} data-testid={`responsibility-card-${responsibility.responsibility_id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={category.color}>{category.label}</Badge>
              <Badge variant="outline" className={priority.color}>
                {priority.label}
              </Badge>
              {!responsibility.active && (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-lg">{responsibility.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {responsibility.description}
            </p>

            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={member?.picture} />
                  <AvatarFallback className="text-xs">{member?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{member?.name || "Não atribuído"}</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{frequencyLabels[responsibility.frequency]}</span>
            </div>

            {responsibility.notes && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                "{responsibility.notes}"
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(responsibility)}
              data-testid={`edit-responsibility-${responsibility.responsibility_id}`}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggle(responsibility.responsibility_id)}
              data-testid={`toggle-responsibility-${responsibility.responsibility_id}`}
            >
              {responsibility.active ? <XCircle className="w-4 h-4 text-amber-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(responsibility.responsibility_id)}
              data-testid={`delete-responsibility-${responsibility.responsibility_id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [members, setMembers] = useState([]);
  const [responsibilities, setResponsibilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentUserMember, setCurrentUserMember] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    scheduleId: null,
    deleteAll: false,
    scheduleName: ""
  });
  
  // Responsibilities state
  const [isRespDialogOpen, setIsRespDialogOpen] = useState(false);
  const [editingResponsibility, setEditingResponsibility] = useState(null);
  const [respFormData, setRespFormData] = useState({
    title: "",
    description: "",
    category: "other",
    assigned_to: "",
    priority: "medium",
    frequency: "always",
    notes: ""
  });

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    schedule_type: "class",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "19:00",
    end_time: "21:00",
    assigned_members: [],
    repeat_enabled: false,
    repeat_type: "none", // none, daily, weekly, monthly
    repeat_days: [], // for weekly: ["monday", "wednesday", "friday"]
    repeat_until: ""
  });

  const weekDays = [
    { value: "monday", label: "Segunda" },
    { value: "tuesday", label: "Terça" },
    { value: "wednesday", label: "Quarta" },
    { value: "thursday", label: "Quinta" },
    { value: "friday", label: "Sexta" },
    { value: "saturday", label: "Sábado" },
    { value: "sunday", label: "Domingo" }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesRes, membersRes, userRes, respRes] = await Promise.all([
        axios.get(`${API}/schedules`, { withCredentials: true }),
        axios.get(`${API}/members`, { withCredentials: true }),
        axios.get(`${API}/auth/me`, { withCredentials: true }),
        axios.get(`${API}/responsibilities?active_only=false`, { withCredentials: true })
      ]);

      setSchedules(schedulesRes.data);
      setMembers(membersRes.data);
      setResponsibilities(respRes.data);

      const userMember = membersRes.data.find(m => m.user_id === userRes.data.user_id);
      setCurrentUserMember(userMember);
      setIsAdmin(userRes.data.is_admin || userMember?.is_admin || false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const scheduleData = {
        title: formData.title,
        description: formData.description,
        schedule_type: formData.schedule_type,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        assigned_members: formData.assigned_members,
        repeat_type: formData.repeat_enabled ? formData.repeat_type : "none",
        repeat_days: formData.repeat_days,
        repeat_until: formData.repeat_until
      };

      await axios.post(`${API}/schedules`, scheduleData, { withCredentials: true });
      toast.success("Escala criada com sucesso!");
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast.error("Erro ao criar escala");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      schedule_type: "class",
      date: format(new Date(), "yyyy-MM-dd"),
      start_time: "19:00",
      end_time: "21:00",
      assigned_members: [],
      repeat_enabled: false,
      repeat_type: "none",
      repeat_days: [],
      repeat_until: ""
    });
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

  // ============== DELETE SCHEDULE FUNCTIONS ==============

  const handleDeleteClick = (scheduleId, deleteAll) => {
    const schedule = schedules.find(s => s.schedule_id === scheduleId);
    setDeleteDialog({
      open: true,
      scheduleId,
      deleteAll,
      scheduleName: schedule?.title || "esta escala"
    });
  };

  const handleDeleteSchedule = async () => {
    const { scheduleId, deleteAll } = deleteDialog;
    
    try {
      const url = deleteAll 
        ? `${API}/schedules/${scheduleId}?delete_recurring=true`
        : `${API}/schedules/${scheduleId}`;
      
      await axios.delete(url, { withCredentials: true });
      
      if (deleteAll) {
        toast.success("Todas as escalas recorrentes foram excluídas!");
      } else {
        toast.success("Escala excluída com sucesso!");
      }
      
      fetchData();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      const message = error.response?.data?.detail || "Erro ao excluir escala";
      toast.error(message);
    } finally {
      setDeleteDialog({ open: false, scheduleId: null, deleteAll: false, scheduleName: "" });
    }
  };

  const toggleRepeatDay = (day) => {
    if (formData.repeat_days.includes(day)) {
      setFormData({
        ...formData,
        repeat_days: formData.repeat_days.filter(d => d !== day)
      });
    } else {
      setFormData({
        ...formData,
        repeat_days: [...formData.repeat_days, day]
      });
    }
  };

  // ============== RESPONSIBILITY FUNCTIONS ==============

  const resetRespForm = () => {
    setRespFormData({
      title: "",
      description: "",
      category: "other",
      assigned_to: "",
      priority: "medium",
      frequency: "always",
      notes: ""
    });
    setEditingResponsibility(null);
  };

  const handleCreateResponsibility = async () => {
    try {
      if (!respFormData.title || !respFormData.assigned_to) {
        toast.error("Preencha título e responsável");
        return;
      }

      if (editingResponsibility) {
        await axios.put(
          `${API}/responsibilities/${editingResponsibility.responsibility_id}`,
          respFormData,
          { withCredentials: true }
        );
        toast.success("Responsabilidade atualizada!");
      } else {
        await axios.post(`${API}/responsibilities`, respFormData, { withCredentials: true });
        toast.success("Responsabilidade criada!");
      }
      
      setIsRespDialogOpen(false);
      resetRespForm();
      fetchData();
    } catch (error) {
      console.error("Error saving responsibility:", error);
      toast.error("Erro ao salvar responsabilidade");
    }
  };

  const handleEditResponsibility = (responsibility) => {
    setEditingResponsibility(responsibility);
    setRespFormData({
      title: responsibility.title,
      description: responsibility.description,
      category: responsibility.category,
      assigned_to: responsibility.assigned_to,
      priority: responsibility.priority,
      frequency: responsibility.frequency,
      notes: responsibility.notes || ""
    });
    setIsRespDialogOpen(true);
  };

  const handleToggleResponsibility = async (responsibilityId) => {
    try {
      await axios.patch(
        `${API}/responsibilities/${responsibilityId}/toggle`,
        {},
        { withCredentials: true }
      );
      toast.success("Status alterado!");
      fetchData();
    } catch (error) {
      console.error("Error toggling responsibility:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const handleDeleteResponsibility = async (responsibilityId) => {
    if (!window.confirm("Tem certeza que deseja excluir esta responsabilidade?")) return;
    
    try {
      await axios.delete(
        `${API}/responsibilities/${responsibilityId}`,
        { withCredentials: true }
      );
      toast.success("Responsabilidade excluída!");
      fetchData();
    } catch (error) {
      console.error("Error deleting responsibility:", error);
      toast.error("Erro ao excluir");
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
            Gerencie as escalas de aulas e postagens
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-schedule-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nova Escala
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-outfit">Criar Nova Escala</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Tipo de Escala */}
              <div className="space-y-2">
                <Label>Tipo de Escala</Label>
                <Select
                  value={formData.schedule_type}
                  onValueChange={(value) => setFormData({ ...formData, schedule_type: value })}
                >
                  <SelectTrigger data-testid="schedule-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        Escala de Aulas
                      </div>
                    </SelectItem>
                    <SelectItem value="content">
                      <div className="flex items-center gap-2">
                        <Instagram className="w-4 h-4" />
                        Escala de Postagens
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder={formData.schedule_type === "class" ? "Ex: Aula de Segunda" : "Ex: Postagens de Segunda"}
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
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    data-testid="schedule-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    data-testid="schedule-start-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              {/* Repetição */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-primary" />
                    <Label className="font-medium">Repetir Escala</Label>
                  </div>
                  <Switch
                    checked={formData.repeat_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, repeat_enabled: checked })}
                    data-testid="repeat-switch"
                  />
                </div>

                {formData.repeat_enabled && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Select
                        value={formData.repeat_type}
                        onValueChange={(value) => setFormData({ ...formData, repeat_type: value })}
                      >
                        <SelectTrigger data-testid="repeat-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diariamente</SelectItem>
                          <SelectItem value="weekly">Semanalmente</SelectItem>
                          <SelectItem value="monthly">Mensalmente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.repeat_type === "weekly" && (
                      <div className="space-y-2">
                        <Label>Dias da Semana</Label>
                        <div className="flex flex-wrap gap-2">
                          {weekDays.map((day) => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={formData.repeat_days.includes(day.value) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleRepeatDay(day.value)}
                              data-testid={`repeat-day-${day.value}`}
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Repetir até</Label>
                      <Input
                        type="date"
                        value={formData.repeat_until}
                        onChange={(e) => setFormData({ ...formData, repeat_until: e.target.value })}
                        data-testid="repeat-until-input"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Membros */}
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
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
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

      {/* Tabs - Separadas por tipo */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            <CalendarDays className="w-4 h-4 mr-2" />
            Todas
          </TabsTrigger>
          <TabsTrigger value="class" data-testid="tab-class">
            <GraduationCap className="w-4 h-4 mr-2" />
            Aulas
          </TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content">
            <Instagram className="w-4 h-4 mr-2" />
            Postagens
          </TabsTrigger>
          <TabsTrigger value="responsibilities" data-testid="tab-responsibilities">
            <ClipboardList className="w-4 h-4 mr-2" />
            Responsabilidades
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Content - Schedules or Responsibilities */}
      {activeTab === "responsibilities" ? (
        // ============== RESPONSIBILITIES TAB ==============
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-outfit text-xl font-semibold">Funções Delegadas</h2>
              <p className="text-sm text-muted-foreground">
                Responsabilidades fixas atribuídas aos membros da equipe
              </p>
            </div>
            <Dialog open={isRespDialogOpen} onOpenChange={(open) => {
              setIsRespDialogOpen(open);
              if (!open) resetRespForm();
            }}>
              <DialogTrigger asChild>
                <Button data-testid="create-responsibility-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Responsabilidade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-outfit">
                    {editingResponsibility ? "Editar Responsabilidade" : "Nova Responsabilidade"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input
                      placeholder="Ex: Artes de aniversariantes do mês"
                      value={respFormData.title}
                      onChange={(e) => setRespFormData({ ...respFormData, title: e.target.value })}
                      data-testid="resp-title-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Textarea
                      placeholder="Descreva a responsabilidade em detalhes..."
                      value={respFormData.description}
                      onChange={(e) => setRespFormData({ ...respFormData, description: e.target.value })}
                      data-testid="resp-description-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select
                        value={respFormData.category}
                        onValueChange={(value) => setRespFormData({ ...respFormData, category: value })}
                      >
                        <SelectTrigger data-testid="resp-category-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="social_media">Redes Sociais</SelectItem>
                          <SelectItem value="art">Arte/Design</SelectItem>
                          <SelectItem value="production">Produção</SelectItem>
                          <SelectItem value="content">Conteúdo</SelectItem>
                          <SelectItem value="admin">Administrativo</SelectItem>
                          <SelectItem value="other">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select
                        value={respFormData.priority}
                        onValueChange={(value) => setRespFormData({ ...respFormData, priority: value })}
                      >
                        <SelectTrigger data-testid="resp-priority-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Responsável *</Label>
                    <Select
                      value={respFormData.assigned_to}
                      onValueChange={(value) => setRespFormData({ ...respFormData, assigned_to: value })}
                    >
                      <SelectTrigger data-testid="resp-member-select">
                        <SelectValue placeholder="Selecione um membro..." />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.member_id} value={member.member_id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={member.picture} />
                                <AvatarFallback className="text-xs">{member.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {member.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select
                      value={respFormData.frequency}
                      onValueChange={(value) => setRespFormData({ ...respFormData, frequency: value })}
                    >
                      <SelectTrigger data-testid="resp-frequency-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Sempre (contínuo)</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="as_needed">Sob Demanda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      placeholder="Notas adicionais sobre a responsabilidade..."
                      value={respFormData.notes}
                      onChange={(e) => setRespFormData({ ...respFormData, notes: e.target.value })}
                      data-testid="resp-notes-input"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button onClick={handleCreateResponsibility} data-testid="save-responsibility-btn">
                    {editingResponsibility ? "Salvar" : "Criar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Responsibilities List */}
          {responsibilities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma responsabilidade cadastrada</p>
                <p className="text-sm mt-1">Clique em "Nova Responsabilidade" para adicionar</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {responsibilities.map((resp) => (
                <ResponsibilityCard
                  key={resp.responsibility_id}
                  responsibility={resp}
                  members={members}
                  onEdit={handleEditResponsibility}
                  onDelete={handleDeleteResponsibility}
                  onToggle={handleToggleResponsibility}
                />
              ))}
            </div>
          )}

          {/* Stats */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
                <span>Total: <strong className="text-foreground">{responsibilities.length}</strong></span>
                <span>•</span>
                <span>Ativas: <strong className="text-green-600">{responsibilities.filter(r => r.active).length}</strong></span>
                <span>•</span>
                <span>Inativas: <strong className="text-amber-600">{responsibilities.filter(r => !r.active).length}</strong></span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // ============== SCHEDULES TAB ==============
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

            {/* Legend */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Legenda:</p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <span>Escala de Aulas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  <span>Escala de Postagens</span>
                </div>
              </div>
            </div>
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
      )}
    </div>
  );
}
