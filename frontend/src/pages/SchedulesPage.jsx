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
  MoreVertical,
  ArrowRightLeft,
  UserPlus,
  CalendarPlus,
  StickyNote,
  Pencil,
  ClipboardCheck,
  ListChecks
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getAvatarUrl } from "@/lib/utils";
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

// ============== GOOGLE CALENDAR URL HELPER ==============

const generateGoogleCalendarUrl = (schedule) => {
  const title = encodeURIComponent(schedule.title || "Escala");

  // Parse date and times
  const dateStr = schedule.date; // "2026-02-16"
  const startTime = schedule.start_time || "08:00"; // "HH:mm"
  const endTime = schedule.end_time || "09:00";

  // Build ISO date strings without timezone (Google will use user's local tz)
  const startDate = dateStr.replace(/-/g, "") + "T" + startTime.replace(/:/g, "") + "00";
  const endDate = dateStr.replace(/-/g, "") + "T" + endTime.replace(/:/g, "") + "00";

  const description = encodeURIComponent(
    `${schedule.description || ""}\n\nEscala gerada pelo Mídia Team (midiateam.com.br)`
  );

  const location = encodeURIComponent(schedule.location || "");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${description}&location=${location}`;
};

// ============== SCHEDULE DETAIL CARD ==============
const ScheduleDetailCard = ({ schedule, members, onConfirm, onEdit, onDelete, onRequestSwap, currentUserMemberId, isAdmin, scheduleTypes }) => {
  const getMemberById = (id) => members.find((m) => m.member_id === id);
  const confirmed = schedule.confirmed_members?.length || 0;
  const total = schedule.assigned_members?.length || 1;
  const progress = (confirmed / total) * 100;

  const isAssigned = schedule.assigned_members?.includes(currentUserMemberId);
  const hasConfirmed = schedule.confirmed_members?.includes(currentUserMemberId);
  const hasDeclined = schedule.declined_members?.includes(currentUserMemberId);
  const isRecurring = schedule.repeat_type && schedule.repeat_type !== "none";

  const getScheduleTypeLabel = (type) => {
    const found = scheduleTypes?.find(t => t.value === type);
    if (found) return found.label;
    switch (type) {
      case "class": return "Aula";
      case "content": return "Postagem";
      default: return type;
    }
  };

  const getScheduleTypeIcon = (type) => {
    const found = scheduleTypes?.find(t => t.value === type);
    const colorClass = found?.color === 'pink' ? 'text-pink-500' :
      found?.color === 'green' ? 'text-green-500' :
        found?.color === 'amber' ? 'text-amber-500' :
          found?.color === 'purple' ? 'text-purple-500' :
            found?.color === 'red' ? 'text-red-500' :
              found?.color === 'blue' ? 'text-blue-500' :
                'text-primary';
    switch (type) {
      case "class": return <GraduationCap className={`w-5 h-5 ${colorClass}`} />;
      case "content": return <Instagram className={`w-5 h-5 ${colorClass}`} />;
      default: return <CalendarDays className={`w-5 h-5 ${colorClass}`} />;
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
                    onClick={() => {
                      if (typeof onEdit === "function") {
                        onEdit(schedule);
                      }
                    }}
                    data-testid={`edit-schedule-${schedule.schedule_id}`}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar escala
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${isConfirmed
                    ? "bg-green-50 border-green-200"
                    : isDeclined
                      ? "bg-red-50 border-red-200"
                      : "bg-muted border-border"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={getAvatarUrl(member?.picture)} />
                      <AvatarFallback className="text-xs">
                        {member?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{member?.name || "Desconhecido"}</span>
                      {schedule.member_roles?.[memberId] && (
                        <span className="text-xs text-muted-foreground">{schedule.member_roles[memberId]}</span>
                      )}
                    </div>
                    {isConfirmed && <CheckCircle className="w-4 h-4 text-green-600 mt-1" />}
                    {isDeclined && <XCircle className="w-4 h-4 text-red-500 mt-1" />}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Swap Button: For self or Admin for anyone */}
                    {(memberId === currentUserMemberId || isAdmin) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => onRequestSwap(schedule, memberId)}
                        title="Solicitar Troca"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        {!isConfirmed && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:bg-green-50"
                            onClick={() => onConfirm(schedule.schedule_id, memberId, "confirmed")}
                            title="Confirmar Presença"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {!isDeclined && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:bg-red-50"
                            onClick={() => onConfirm(schedule.schedule_id, memberId, "declined")}
                            title="Recusar Presença"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
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
              Não Posso
            </Button>
            <Button
              variant="outline"
              className="h-12 w-12 p-0"
              onClick={() => onRequestSwap(schedule)}
              data-testid={`request-swap-${schedule.schedule_id}`}
              title="Solicitar Troca"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </Button>
          </div>
        )}

        {hasConfirmed && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Presença Confirmada</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-8 gap-1"
                onClick={() => window.open(generateGoogleCalendarUrl(schedule), "_blank")}
                title="Adicionar ao Google Calendar"
              >
                <CalendarPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Google Calendar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-600 hover:text-amber-700 h-8"
                onClick={() => onRequestSwap(schedule)}
              >
                <ArrowRightLeft className="w-4 h-4 mr-1" />
                Trocar
              </Button>
            </div>
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
                  <AvatarImage src={getAvatarUrl(member?.picture)} />
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
  const [swapRequests, setSwapRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentUserMember, setCurrentUserMember] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleTypes, setScheduleTypes] = useState([
    { value: "class", label: "Aula", icon: "graduation-cap", color: "primary" },
    { value: "content", label: "Postagem", icon: "instagram", color: "pink" }
  ]);

  // Swap states
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [selectedScheduleForSwap, setSelectedScheduleForSwap] = useState(null);
  const [swapRequesterMemberId, setSwapRequesterMemberId] = useState(null);
  const [swapReason, setSwapReason] = useState("");
  const [swapTargetMember, setSwapTargetMember] = useState("");

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

  // Calendar Notes state
  const [calendarNotes, setCalendarNotes] = useState([]);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteFormData, setNoteFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    title: "",
    content: "",
    color: "blue"
  });

  // Checklist state
  const [checklistTemplates, setChecklistTemplates] = useState([]);
  const [selectedChecklist, setSelectedChecklist] = useState("");
  const [checklistAssignee, setChecklistAssignee] = useState("");

  const noteColors = [
    { value: "blue", label: "Azul", bg: "bg-blue-500", light: "bg-blue-50 border-blue-200 text-blue-800" },
    { value: "red", label: "Vermelho", bg: "bg-red-500", light: "bg-red-50 border-red-200 text-red-800" },
    { value: "green", label: "Verde", bg: "bg-green-500", light: "bg-green-50 border-green-200 text-green-800" },
    { value: "amber", label: "Amarelo", bg: "bg-amber-500", light: "bg-amber-50 border-amber-200 text-amber-800" },
    { value: "purple", label: "Roxo", bg: "bg-purple-500", light: "bg-purple-50 border-purple-200 text-purple-800" },
    { value: "pink", label: "Rosa", bg: "bg-pink-500", light: "bg-pink-50 border-pink-200 text-pink-800" }
  ];

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    schedule_type: "class",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "19:00",
    end_time: "21:00",
    assigned_members: [],
    member_roles: {}, // member_id -> role
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
      const [schedulesRes, membersRes, userRes, respRes, swapRes] = await Promise.all([
        axios.get(`${API}/schedules`, { withCredentials: true }),
        axios.get(`${API}/members`, { withCredentials: true }),
        axios.get(`${API}/auth/me`, { withCredentials: true }),
        axios.get(`${API}/responsibilities?active_only=false`, { withCredentials: true }),
        axios.get(`${API}/schedules/swap-requests?status=pending`, { withCredentials: true })
      ]);

      setSchedules(schedulesRes.data);
      setMembers(membersRes.data);
      setResponsibilities(respRes.data);
      setSwapRequests(swapRes.data);

      const userMember = membersRes.data.find(m => m.user_id === userRes.data.user_id);
      setCurrentUserMember(userMember);
      setIsAdmin(userRes.data.is_admin || userMember?.is_admin || false);

      // Fetch config for schedule types
      try {
        const configRes = await axios.get(`${API}/entities/current/config`, { withCredentials: true });
        if (configRes.data.custom_schedule_types?.length > 0) {
          setScheduleTypes(configRes.data.custom_schedule_types);
        }
      } catch (e) {
        console.error("Error fetching config:", e);
      }

      // Fetch calendar notes
      try {
        const notesRes = await axios.get(`${API}/calendar-notes`, { withCredentials: true });
        setCalendarNotes(notesRes.data);
      } catch (e) {
        console.error("Error fetching calendar notes:", e);
      }

      // Fetch checklist templates
      try {
        const chkRes = await axios.get(`${API}/checklist-templates`, { withCredentials: true });
        setChecklistTemplates(chkRes.data);
      } catch (e) {
        console.error("Error fetching checklist templates:", e);
      }
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
        member_roles: formData.member_roles,
        repeat_type: formData.repeat_enabled ? formData.repeat_type : "none",
        repeat_days: formData.repeat_days,
        repeat_until: formData.repeat_until
      };

      if (editingSchedule) {
        const isRecurring = editingSchedule.repeat_type && editingSchedule.repeat_type !== "none";
        let updateAll = false;

        if (isRecurring) {
          updateAll = window.confirm(
            "Esta escala faz parte de uma série recorrente.\n\n" +
            "Clique OK para aplicar as alterações em TODAS as escalas da série.\n" +
            "Clique Cancelar para alterar apenas ESTA escala."
          );
        }

        const url = `${API}/schedules/${editingSchedule.schedule_id}${updateAll ? '?update_all=true' : ''}`;
        await axios.put(url, scheduleData, { withCredentials: true });

        // Assign checklist if selected
        if (selectedChecklist && checklistAssignee) {
          try {
            await axios.post(
              `${API}/schedules/${editingSchedule.schedule_id}/checklists`,
              { template_id: selectedChecklist, assigned_to: checklistAssignee },
              { withCredentials: true }
            );
            toast.success("Checklist atribuído!");
          } catch (chkErr) {
            if (chkErr.response?.status !== 400) {
              console.error("Error assigning checklist:", chkErr);
            }
          }
        }

        toast.success(updateAll ? "Todas as escalas da série atualizadas!" : "Escala atualizada com sucesso!");
      } else {
        const res = await axios.post(`${API}/schedules`, scheduleData, { withCredentials: true });
        const createdScheduleId = res.data?.schedule_id;

        // Assign checklist if selected
        if (selectedChecklist && checklistAssignee && createdScheduleId) {
          try {
            await axios.post(
              `${API}/schedules/${createdScheduleId}/checklists`,
              { template_id: selectedChecklist, assigned_to: checklistAssignee },
              { withCredentials: true }
            );
            toast.success("Escala criada com checklist atribuído!");
          } catch (chkErr) {
            console.error("Error assigning checklist:", chkErr);
            toast.success("Escala criada! (checklist não atribuído)");
          }
        } else {
          toast.success("Escala criada com sucesso!");
        }
      }

      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error(editingSchedule ? "Erro ao atualizar escala" : "Erro ao criar escala");
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
      member_roles: {},
      repeat_enabled: false,
      repeat_type: "none",
      repeat_days: [],
      repeat_until: ""
    });
    setEditingSchedule(null);
    setSelectedChecklist("");
    setChecklistAssignee("");
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      title: schedule.title,
      description: schedule.description || "",
      schedule_type: schedule.schedule_type,
      date: schedule.date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      assigned_members: schedule.assigned_members || [],
      member_roles: schedule.member_roles || {},
      repeat_enabled: schedule.repeat_type !== "none",
      repeat_type: schedule.repeat_type || "none",
      repeat_days: schedule.repeat_days || [],
      repeat_until: schedule.repeat_until || ""
    });
    setIsCreateOpen(true);
  };

  const handleConfirmAttendance = async (scheduleId, memberId, status) => {
    try {
      await axios.post(
        `${API}/schedules/${scheduleId}/attendance`,
        { schedule_id: scheduleId, member_id: memberId, status },
        { withCredentials: true }
      );
      if (status === "confirmed") {
        // Find the schedule to generate Google Calendar URL
        const schedule = schedules.find(s => s.schedule_id === scheduleId);
        if (schedule) {
          toast.success("Presença confirmada!", {
            description: "Deseja salvar no Google Calendar?",
            duration: 8000,
            action: {
              label: "📅 Adicionar ao Calendário",
              onClick: () => window.open(generateGoogleCalendarUrl(schedule), "_blank"),
            },
          });
        } else {
          toast.success("Presença confirmada!");
        }
      } else {
        toast.success("Ausência registrada");
      }
      fetchData();
    } catch (error) {
      console.error("Error confirming attendance:", error);
      toast.error("Erro ao confirmar presença");
    }
  };

  const handleAcceptSwap = async (swapId) => {
    try {
      await axios.post(
        `${API}/schedules/swap-requests/${swapId}/respond`,
        { swap_id: swapId, accept: true },
        { withCredentials: true }
      );
      toast.success("Troca aceita!");
      fetchData();
    } catch (error) {
      console.error("Error accepting swap:", error);
      toast.error(error.response?.data?.detail || "Erro ao aceitar troca");
    }
  };

  const handleCancelSwap = async (swapId) => {
    try {
      await axios.delete(`${API}/schedules/swap-requests/${swapId}`, { withCredentials: true });
      toast.success("Solicitação cancelada");
      fetchData();
    } catch (error) {
      console.error("Error cancelling swap:", error);
      toast.error("Erro ao cancelar");
    }
  };

  const handleOpenSwapDialog = (schedule, requesterMemberId) => {
    setSelectedScheduleForSwap(schedule);
    setSwapRequesterMemberId(requesterMemberId || currentUserMember?.member_id);
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
          requester_member_id: swapRequesterMemberId,
          reason: swapReason.trim()
        },
        { withCredentials: true }
      );
      toast.success("Solicitação de troca enviada!");
      setSwapDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error creating swap:", error);
      toast.error(error.response?.data?.detail || "Erro ao solicitar troca");
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

  // Dates with notes
  const datesWithNotes = calendarNotes.map((n) => parseISO(n.date));

  // Notes for selected date
  const notesForSelectedDate = calendarNotes.filter((note) =>
    isSameDay(parseISO(note.date), selectedDate)
  );

  // ============== CALENDAR NOTE HANDLERS ==============
  const handleOpenNoteDialog = (date) => {
    setEditingNote(null);
    setNoteFormData({
      date: format(date || selectedDate, "yyyy-MM-dd"),
      title: "",
      content: "",
      color: "blue"
    });
    setNoteDialogOpen(true);
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteFormData({
      date: note.date,
      title: note.title,
      content: note.content || "",
      color: note.color || "blue"
    });
    setNoteDialogOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteFormData.title.trim()) {
      toast.error("Informe o título da anotação");
      return;
    }
    try {
      if (editingNote) {
        await axios.put(`${API}/calendar-notes/${editingNote.note_id}`, {
          title: noteFormData.title,
          content: noteFormData.content,
          color: noteFormData.color
        }, { withCredentials: true });
        toast.success("Anotação atualizada!");
      } else {
        await axios.post(`${API}/calendar-notes`, noteFormData, { withCredentials: true });
        toast.success("Anotação criada!");
      }
      setNoteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Erro ao salvar anotação");
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(`${API}/calendar-notes/${noteId}`, { withCredentials: true });
      toast.success("Anotação excluída!");
      fetchData();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Erro ao excluir anotação");
    }
  };

  const getNoteColorClasses = (color) => {
    const c = noteColors.find(nc => nc.value === color);
    return c ? c.light : noteColors[0].light;
  };

  const getNoteColorDot = (color) => {
    const c = noteColors.find(nc => nc.value === color);
    return c ? c.bg : noteColors[0].bg;
  };

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
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          {isAdmin && (
            <DialogTrigger asChild>
              <Button data-testid="create-schedule-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nova Escala
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-outfit">
                {editingSchedule ? "Editar Escala" : "Criar Nova Escala"}
              </DialogTitle>
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
                    {scheduleTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${type.color === 'pink' ? 'bg-pink-500' :
                            type.color === 'green' ? 'bg-green-500' :
                              type.color === 'amber' ? 'bg-amber-500' :
                                type.color === 'purple' ? 'bg-purple-500' :
                                  type.color === 'red' ? 'bg-red-500' :
                                    type.color === 'blue' ? 'bg-blue-500' :
                                      'bg-primary'
                            }`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
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
                      const member = members.find(m => m.member_id === value);
                      const defaultRole = member?.roles?.[0] || member?.role || "";
                      setFormData({
                        ...formData,
                        assigned_members: [...formData.assigned_members, value],
                        member_roles: {
                          ...formData.member_roles,
                          [value]: defaultRole
                        }
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
                    const memberRoles = member?.roles || (member?.role ? [member.role] : []);

                    return (
                      <div key={memberId} className="flex flex-col gap-1 p-2 border rounded bg-muted/30">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium">{member?.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              const newRoles = { ...formData.member_roles };
                              delete newRoles[memberId];
                              setFormData({
                                ...formData,
                                assigned_members: formData.assigned_members.filter(id => id !== memberId),
                                member_roles: newRoles
                              });
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <Select
                          value={formData.member_roles[memberId] || ""}
                          onValueChange={(role) => setFormData({
                            ...formData,
                            member_roles: { ...formData.member_roles, [memberId]: role }
                          })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Escolher função..." />
                          </SelectTrigger>
                          <SelectContent>
                            {memberRoles.map(role => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Checklist Assignment Section */}
              {checklistTemplates.length > 0 && formData.assigned_members.length > 0 && (
                <div className="space-y-4 p-4 bg-teal-50/50 rounded-lg border border-teal-200/50">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-teal-600" />
                    <Label className="font-medium text-teal-700">Atribuir Checklist</Label>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Template de Checklist</Label>
                      <Select
                        value={selectedChecklist}
                        onValueChange={(v) => setSelectedChecklist(v === "none" ? "" : v)}
                      >
                        <SelectTrigger data-testid="checklist-select">
                          <SelectValue placeholder="Selecionar checklist (opcional)..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {checklistTemplates.filter(t => t.active !== false).map(t => (
                            <SelectItem key={t.template_id} value={t.template_id}>
                              <div className="flex items-center gap-2">
                                <ListChecks className="w-4 h-4" />
                                {t.title} ({t.items?.length || 0} itens)
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedChecklist && (
                      <div className="space-y-2">
                        <Label className="text-sm">Responsável pelo Checklist</Label>
                        <Select
                          value={checklistAssignee}
                          onValueChange={(v) => setChecklistAssignee(v)}
                        >
                          <SelectTrigger data-testid="checklist-assignee-select">
                            <SelectValue placeholder="Escolher membro..." />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.assigned_members.map(memberId => {
                              const member = members.find(m => m.member_id === memberId);
                              return (
                                <SelectItem key={memberId} value={memberId}>
                                  {member?.name || "Desconhecido"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleCreateSchedule} data-testid="save-schedule-btn">
                {editingSchedule ? "Salvar Alterações" : "Criar Escala"}
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
          <TabsTrigger value="swaps" data-testid="tab-swaps">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Trocas
            {swapRequests.length > 0 && (
              <Badge className="ml-2 bg-amber-500 h-5 px-1.5 min-w-[20px] justify-center">
                {swapRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Content - Schedules, Responsibilities or Swaps */}
      {activeTab === "swaps" ? (
        // ============== SWAPS TAB ==============
        <div className="space-y-6">
          <div>
            <h2 className="font-outfit text-xl font-semibold">Solicitações de Troca</h2>
            <p className="text-sm text-muted-foreground">
              Ajude seus colegas ou gerencie suas solicitações de substituição
            </p>
          </div>

          {swapRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma solicitação de troca pendente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {swapRequests.map((request) => (
                <Card key={request.swap_id} className="border-amber-200 bg-amber-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 border border-amber-200">
                        <AvatarImage src={getAvatarUrl(request.requester_picture)} />
                        <AvatarFallback>{request.requester_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{request.requester_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.schedule_title}
                        </p>
                        <p className="text-xs font-medium text-amber-700">
                          {request.schedule_date && format(parseISO(request.schedule_date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </p>
                        <div className="mt-2 p-2 bg-white/50 rounded text-sm italic text-muted-foreground border border-amber-100">
                          "{request.reason}"
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {request.can_accept && (
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleAcceptSwap(request.swap_id)}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Eu vou!
                        </Button>
                      )}
                      {request.is_mine && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-amber-200 hover:bg-amber-100"
                          onClick={() => handleCancelSwap(request.swap_id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "responsibilities" ? (
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
              {isAdmin && (
                <DialogTrigger asChild>
                  <Button data-testid="create-responsibility-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Responsabilidade
                  </Button>
                </DialogTrigger>
              )}
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
                                <AvatarImage src={getAvatarUrl(member.picture)} />
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
                  hasSchedule: datesWithSchedules,
                  hasNote: datesWithNotes
                }}
                modifiersStyles={{
                  hasSchedule: {
                    backgroundColor: "hsl(var(--primary) / 0.1)",
                    fontWeight: "bold"
                  }
                }}
                modifiersClassNames={{
                  hasNote: "calendar-has-note"
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
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-amber-500" />
                    <span>Minhas Anotações</span>
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
                    onEdit={handleEditSchedule}
                    onDelete={handleDeleteClick}
                    onRequestSwap={handleOpenSwapDialog}
                    currentUserMemberId={currentUserMember?.member_id}
                    isAdmin={isAdmin}
                    scheduleTypes={scheduleTypes}
                  />
                ))}
              </div>
            )}

            {/* Calendar Notes for selected date */}
            <Card className="border-amber-200/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-5 h-5 text-amber-500" />
                    <CardTitle className="font-outfit text-lg">Minhas Anotações</CardTitle>
                    <Badge variant="outline">{notesForSelectedDate.length}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => handleOpenNoteDialog(selectedDate)}
                    data-testid="add-note-btn"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Nova Anotação
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {notesForSelectedDate.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma anotação para este dia</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notesForSelectedDate.map((note) => (
                      <div
                        key={note.note_id}
                        className={`p-3 rounded-lg border ${getNoteColorClasses(note.color)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getNoteColorDot(note.color)}`} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm">{note.title}</h4>
                              {note.content && (
                                <p className="text-sm mt-1 opacity-80 whitespace-pre-wrap">{note.content}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-70 hover:opacity-100"
                              onClick={() => handleEditNote(note)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 opacity-70 hover:opacity-100"
                              onClick={() => handleDeleteNote(note.note_id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ ...deleteDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.deleteAll ? (
                <>
                  Você está prestes a excluir <strong>"{deleteDialog.scheduleName}"</strong> e <strong>todas as suas ocorrências recorrentes</strong>.
                  <br /><br />
                  Esta ação não pode ser desfeita.
                </>
              ) : (
                <>
                  Você está prestes a excluir <strong>"{deleteDialog.scheduleName}"</strong>.
                  <br /><br />
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSchedule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-schedule"
            >
              {deleteDialog.deleteAll ? "Excluir Todas" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Swap Request Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-600" />
              Solicitar Troca de Escala
              {swapRequesterMemberId && swapRequesterMemberId !== currentUserMember?.member_id && (
                <span className="text-sm font-normal text-muted-foreground">
                  para {members.find(m => m.member_id === swapRequesterMemberId)?.name}
                </span>
              )}
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
                      .filter(m => m.member_id !== currentUserMember?.member_id && m.active)
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

      {/* Calendar Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-500" />
              {editingNote ? "Editar Anotação" : "Nova Anotação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              📅 {format(parseISO(noteFormData.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Reunião com equipe, Comprar material..."
                value={noteFormData.title}
                onChange={(e) => setNoteFormData({ ...noteFormData, title: e.target.value })}
                data-testid="note-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Detalhes da anotação..."
                value={noteFormData.content}
                onChange={(e) => setNoteFormData({ ...noteFormData, content: e.target.value })}
                rows={3}
                data-testid="note-content-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {noteColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full ${color.bg} transition-all ${noteFormData.color === color.value ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "opacity-60 hover:opacity-100"}`}
                    onClick={() => setNoteFormData({ ...noteFormData, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={handleSaveNote}
              disabled={!noteFormData.title.trim()}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="save-note-btn"
            >
              <StickyNote className="w-4 h-4 mr-2" />
              {editingNote ? "Salvar" : "Criar Anotação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
