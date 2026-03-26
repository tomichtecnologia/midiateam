import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Bell,
  Calendar,
  Sparkles,
  Send,
  Loader2,
  Users,
  Briefcase,
  Plus,
  Trash2,
  Camera,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  CalendarDays
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { getAvatarUrl } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Notification settings (local state for demo)
  const [notifications, setNotifications] = useState({
    scheduleReminders: true,
    approvalUpdates: true,
    newMembers: false
  });

  const [customRoles, setCustomRoles] = useState([]);
  const [customDepartments, setCustomDepartments] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [newDept, setNewDept] = useState("");
  const [configLoading, setConfigLoading] = useState(false);
  const [migrateLoading, setMigrateLoading] = useState(false);

  // Schedule types state
  const [scheduleTypes, setScheduleTypes] = useState([]);
  const [newScheduleType, setNewScheduleType] = useState({ value: "", label: "", color: "primary" });

  // Periods state
  const [customPeriods, setCustomPeriods] = useState([]);
  const [newPeriod, setNewPeriod] = useState("");
  const [newPeriodColor, setNewPeriodColor] = useState("blue");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchConfig();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user:", error);
      toast.error("Erro ao carregar dados do usuário");
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/entities/current/config`, { withCredentials: true });
      setCustomRoles(response.data.custom_roles || []);
      setCustomDepartments(response.data.custom_departments || []);
      setScheduleTypes(response.data.custom_schedule_types || [
        { value: "class", label: "Aula", icon: "graduation-cap", color: "primary" },
        { value: "content", label: "Postagem", icon: "instagram", color: "pink" }
      ]);
      const defaultPeriods = [
        { name: "1º Ano", color: "blue" },
        { name: "2º Ano", color: "green" },
        { name: "1º Tempo", color: "purple" },
        { name: "2º Tempo", color: "amber" }
      ];
      const rawPeriods = response.data.custom_periods || defaultPeriods;
      // Normalize: convert old string format to {name, color} objects
      const normalizedPeriods = rawPeriods.map(p =>
        typeof p === 'string' ? { name: p, color: 'blue' } : p
      );
      setCustomPeriods(normalizedPeriods);
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  const handleUpdateConfig = async (roles, depts) => {
    setConfigLoading(true);
    try {
      await axios.put(
        `${API}/entities/current/config`,
        { custom_roles: roles, custom_departments: depts, custom_schedule_types: scheduleTypes },
        { withCredentials: true }
      );
      toast.success("Personalização salva!");
      fetchConfig();
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error("Erro ao salvar personalização");
    } finally {
      setConfigLoading(false);
    }
  };

  const addRole = () => {
    if (!newRole.trim()) return;
    if (customRoles.includes(newRole.trim())) {
      toast.error("Função já cadastrada");
      return;
    }
    const updated = [...customRoles, newRole.trim()];
    handleUpdateConfig(updated, customDepartments);
    setNewRole("");
  };

  const removeRole = (role) => {
    const updated = customRoles.filter(r => r !== role);
    handleUpdateConfig(updated, customDepartments);
  };

  const addDept = () => {
    if (!newDept.trim()) return;
    if (customDepartments.includes(newDept.trim())) {
      toast.error("Departamento já cadastrado");
      return;
    }
    const updated = [...customDepartments, newDept.trim()];
    handleUpdateConfig(customRoles, updated);
    setNewDept("");
  };

  const removeDept = (dept) => {
    const updated = customDepartments.filter(d => d !== dept);
    handleUpdateConfig(customRoles, updated);
  };

  const addScheduleType = async () => {
    if (!newScheduleType.value.trim() || !newScheduleType.label.trim()) {
      toast.error("Preencha o identificador e o nome");
      return;
    }
    // Create a slug-like value
    const value = newScheduleType.value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (scheduleTypes.find(t => t.value === value)) {
      toast.error("Tipo de escala já existe");
      return;
    }
    const updated = [...scheduleTypes, { value, label: newScheduleType.label.trim(), icon: "calendar", color: newScheduleType.color }];
    setScheduleTypes(updated);
    setConfigLoading(true);
    try {
      await axios.put(
        `${API}/entities/current/config`,
        { custom_roles: customRoles, custom_departments: customDepartments, custom_schedule_types: updated },
        { withCredentials: true }
      );
      toast.success("Tipo de escala adicionado!");
      setNewScheduleType({ value: "", label: "", color: "primary" });
      fetchConfig();
    } catch (error) {
      toast.error("Erro ao salvar");
    } finally {
      setConfigLoading(false);
    }
  };

  const removeScheduleType = async (value) => {
    const updated = scheduleTypes.filter(t => t.value !== value);
    setScheduleTypes(updated);
    setConfigLoading(true);
    try {
      await axios.put(
        `${API}/entities/current/config`,
        { custom_roles: customRoles, custom_departments: customDepartments, custom_schedule_types: updated },
        { withCredentials: true }
      );
      toast.success("Tipo de escala removido!");
      fetchConfig();
    } catch (error) {
      toast.error("Erro ao salvar");
    } finally {
      setConfigLoading(false);
    }
  };

  const addPeriod = async () => {
    if (!newPeriod.trim()) return;
    if (customPeriods.find(p => (typeof p === 'string' ? p : p.name) === newPeriod.trim())) {
      toast.error("Período já cadastrado");
      return;
    }
    const updated = [...customPeriods.map(p => typeof p === 'string' ? { name: p, color: 'blue' } : p), { name: newPeriod.trim(), color: newPeriodColor }];
    setCustomPeriods(updated);
    setConfigLoading(true);
    try {
      await axios.put(
        `${API}/entities/current/config`,
        { custom_periods: updated },
        { withCredentials: true }
      );
      toast.success("Período adicionado!");
      setNewPeriod("");
      fetchConfig();
    } catch (error) {
      toast.error("Erro ao salvar");
    } finally {
      setConfigLoading(false);
    }
  };

  const removePeriod = async (periodName) => {
    const updated = customPeriods
      .map(p => typeof p === 'string' ? { name: p, color: 'blue' } : p)
      .filter(p => p.name !== periodName);
    setCustomPeriods(updated);
    setConfigLoading(true);
    try {
      await axios.put(
        `${API}/entities/current/config`,
        { custom_periods: updated },
        { withCredentials: true }
      );
      toast.success("Período removido!");
      fetchConfig();
    } catch (error) {
      toast.error("Erro ao salvar");
    } finally {
      setConfigLoading(false);
    }
  };

  const handleAiSuggestion = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Digite uma pergunta ou solicitação");
      return;
    }

    setAiLoading(true);
    setAiSuggestion("");

    try {
      const response = await axios.post(
        `${API}/ai/suggest`,
        { prompt: aiPrompt },
        { withCredentials: true }
      );
      setAiSuggestion(response.data.suggestion);
      toast.success("Sugestão gerada!");
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      toast.error("Erro ao gerar sugestão. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setAvatarLoading(true);
    try {
      const response = await axios.post(`${API}/users/me/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      console.log("Avatar upload response:", response.data);
      // We store the raw URL (e.g., /uploads/...) and let getAvatarUrl handle the prefix
      const newAvatarUrl = response.data.avatar_url;

      setUser((prev) => ({
        ...prev,
        picture: newAvatarUrl
      }));

      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao atualizar foto. Tente novamente.");
    } finally {
      setAvatarLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="settings-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="font-outfit text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu perfil e preferências
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card data-testid="profile-card">
          <CardHeader>
            <CardTitle className="font-outfit flex items-center gap-2">
              <User className="w-5 h-5" />
              Perfil
            </CardTitle>
            <CardDescription>
              Suas informações de conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <Avatar className="w-24 h-24 border-4 border-background shadow-sm transition-transform group-hover:scale-105">
                  <AvatarImage
                    src={getAvatarUrl(user?.picture)}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl font-semibold">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>

                {/* Loading API Overlay */}
                {avatarLoading && (
                  <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <h3 className="font-semibold text-lg">{user?.name}</h3>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="flex gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={`capitalize ${user?.role === "superadmin"
                      ? "border-red-500 text-red-600 bg-red-50"
                      : user?.role === "admin"
                        ? "border-amber-500 text-amber-600 bg-amber-50"
                        : ""
                      }`}
                  >
                    {user?.role === "superadmin" ? "Super Admin" : user?.role === "admin" ? "Administrador" : "Membro"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Clique na foto para alterar
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={user?.name || ""}
                  disabled
                  className="bg-muted"
                  data-testid="profile-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                  data-testid="profile-email-input"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              As informações do perfil são gerenciadas pela sua conta Google.
            </p>
          </CardContent>
        </Card>

        {/* Security / Password Card */}
        <Card data-testid="security-card">
          <CardHeader>
            <CardTitle className="font-outfit flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Altere sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-pw">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  type={showCurrentPw ? "text" : "password"}
                  placeholder="Digite sua senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNewPw ? "text" : "password"}
                  placeholder="Digite a nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPw(!showNewPw)}
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirmar Nova Senha</Label>
              <Input
                id="confirm-pw"
                type={showNewPw ? "text" : "password"}
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">As senhas não coincidem.</p>
            )}
            <Button
              onClick={async () => {
                if (!currentPassword) { toast.error("Digite sua senha atual"); return; }
                if (!newPassword || newPassword.length < 4) { toast.error("A nova senha deve ter pelo menos 4 caracteres"); return; }
                if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
                try {
                  setPasswordLoading(true);
                  await axios.post(`${API}/auth/change-password`, {
                    current_password: currentPassword,
                    new_password: newPassword
                  }, { withCredentials: true });
                  toast.success("Senha alterada com sucesso!");
                  setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
                  setShowCurrentPw(false); setShowNewPw(false);
                } catch (err) {
                  toast.error(err.response?.data?.detail || "Erro ao alterar senha");
                } finally { setPasswordLoading(false); }
              }}
              disabled={passwordLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="w-full"
            >
              {passwordLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Alterando...</>
                : <><Check className="w-4 h-4 mr-2" /> Alterar Senha</>
              }
            </Button>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card data-testid="notifications-card">
          <CardHeader>
            <CardTitle className="font-outfit flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure suas preferências de notificação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Lembretes de Escala</p>
                  <p className="text-sm text-muted-foreground">
                    Receber avisos sobre suas escalas
                  </p>
                </div>
                <Switch
                  checked={notifications.scheduleReminders}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, scheduleReminders: checked })
                  }
                  data-testid="schedule-reminders-switch"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Atualizações de Aprovação</p>
                  <p className="text-sm text-muted-foreground">
                    Receber avisos sobre votações
                  </p>
                </div>
                <Switch
                  checked={notifications.approvalUpdates}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, approvalUpdates: checked })
                  }
                  data-testid="approval-updates-switch"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Novos Membros</p>
                  <p className="text-sm text-muted-foreground">
                    Avisar quando alguém entrar na equipe
                  </p>
                </div>
                <Switch
                  checked={notifications.newMembers}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, newMembers: checked })
                  }
                  data-testid="new-members-switch"
                />
              </div>
            </div>

            <div className="pt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-medium">Google Calendar</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                As notificações são enviadas automaticamente pelo Google Calendar
                quando você confirma presença em uma escala.
              </p>
              <Button variant="outline" size="sm" disabled>
                Conectado via Google Auth
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customization Card - Admin Only */}
        {user?.is_admin && (
          <Card className="lg:col-span-2" data-testid="customization-card">
            <CardHeader>
              <CardTitle className="font-outfit flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Estrutura da Equipe
              </CardTitle>
              <CardDescription>
                Personalize as funções e departamentos disponíveis para sua organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Roles Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Funções / Cargos</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova função..."
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-48 h-9"
                    />
                    <Button size="sm" onClick={addRole} disabled={configLoading}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customRoles.map((role) => (
                    <Badge key={role} variant="secondary" className="px-3 py-1 gap-2 bg-muted text-foreground">
                      {role}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:text-destructive"
                        onClick={() => removeRole(role)}
                        disabled={configLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                  {customRoles.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Nenhuma função customizada</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Departments Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Departamentos / Setores</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Novo depto..."
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="w-48 h-9"
                    />
                    <Button size="sm" onClick={addDept} disabled={configLoading}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customDepartments.map((dept) => (
                    <Badge key={dept} variant="secondary" className="px-3 py-1 gap-2 bg-muted text-foreground">
                      {dept}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:text-destructive"
                        onClick={() => removeDept(dept)}
                        disabled={configLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                  {customDepartments.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Nenhum departamento customizado</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Nota informativa */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Dica:</strong> As funções e setores configurados aqui são as mesmas opções que aparecem no formulário de cadastro de novos membros.
                </p>
              </div>

              <Separator />

              {/* Schedule Types Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      Tipos de Escala
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Defina os tipos de escala disponíveis (ex: Aula, Postagem, Ensaio)</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {scheduleTypes.map((type) => (
                    <Badge key={type.value} variant="secondary" className="px-3 py-1.5 gap-2 bg-muted text-foreground">
                      <span className={`w-2.5 h-2.5 rounded-full ${type.color === 'pink' ? 'bg-pink-500' :
                          type.color === 'green' ? 'bg-green-500' :
                            type.color === 'amber' ? 'bg-amber-500' :
                              type.color === 'purple' ? 'bg-purple-500' :
                                type.color === 'red' ? 'bg-red-500' :
                                  type.color === 'blue' ? 'bg-blue-500' :
                                    'bg-primary'
                        }`} />
                      {type.label}
                      <span className="text-xs text-muted-foreground">({type.value})</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:text-destructive"
                        onClick={() => removeScheduleType(type.value)}
                        disabled={configLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                  {scheduleTypes.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Nenhum tipo de escala customizado</p>
                  )}
                </div>
                <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Identificador</Label>
                    <Input
                      placeholder="ex: ensaio"
                      value={newScheduleType.value}
                      onChange={(e) => setNewScheduleType({ ...newScheduleType, value: e.target.value })}
                      className="w-32 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nome exibido</Label>
                    <Input
                      placeholder="ex: Ensaio"
                      value={newScheduleType.label}
                      onChange={(e) => setNewScheduleType({ ...newScheduleType, label: e.target.value })}
                      className="w-36 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cor</Label>
                    <select
                      className="h-9 px-2 rounded-md border text-sm bg-background"
                      value={newScheduleType.color}
                      onChange={(e) => setNewScheduleType({ ...newScheduleType, color: e.target.value })}
                    >
                      <option value="primary">Padrão</option>
                      <option value="pink">Rosa</option>
                      <option value="green">Verde</option>
                      <option value="amber">Amarelo</option>
                      <option value="purple">Roxo</option>
                      <option value="blue">Azul</option>
                      <option value="red">Vermelho</option>
                    </select>
                  </div>
                  <Button size="sm" onClick={addScheduleType} disabled={configLoading} className="h-9">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Periods Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base flex items-center gap-2">
                      📅 Períodos
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Defina os períodos disponíveis para as escalas (ex: 1º Ano, 2º Tempo)</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customPeriods.map((period) => {
                    const pName = typeof period === 'string' ? period : period.name;
                    const pColor = typeof period === 'string' ? 'blue' : (period.color || 'blue');
                    const colorMap = {
                      blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
                      green: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
                      purple: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800',
                      amber: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
                      red: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
                      pink: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800',
                      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800',
                      teal: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800',
                    };
                    const dotMap = {
                      blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', amber: 'bg-amber-500',
                      red: 'bg-red-500', pink: 'bg-pink-500', indigo: 'bg-indigo-500', teal: 'bg-teal-500'
                    };
                    return (
                      <Badge key={pName} variant="secondary" className={`px-3 py-1.5 gap-2 border ${colorMap[pColor] || colorMap.blue}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${dotMap[pColor] || dotMap.blue}`} />
                        {pName}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 hover:text-destructive"
                          onClick={() => removePeriod(pName)}
                          disabled={configLoading}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                  {customPeriods.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Nenhum período cadastrado</p>
                  )}
                </div>
                <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome do Período</Label>
                    <Input
                      placeholder="ex: 1º Ano, Turma A..."
                      value={newPeriod}
                      onChange={(e) => setNewPeriod(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addPeriod()}
                      className="w-40 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cor</Label>
                    <select
                      className="h-9 px-2 rounded-md border text-sm bg-background"
                      value={newPeriodColor}
                      onChange={(e) => setNewPeriodColor(e.target.value)}
                    >
                      <option value="blue">🔵 Azul</option>
                      <option value="green">🟢 Verde</option>
                      <option value="purple">🟣 Roxo</option>
                      <option value="amber">🟡 Amarelo</option>
                      <option value="red">🔴 Vermelho</option>
                      <option value="pink">🩷 Rosa</option>
                      <option value="indigo">🔷 Índigo</option>
                      <option value="teal">🩵 Turquesa</option>
                    </select>
                  </div>
                  <Button size="sm" onClick={addPeriod} disabled={configLoading} className="h-9">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Botão de Migração */}
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Nomes em inglês?</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Migre automaticamente os nomes de cargos e setores antigos (ex: "operator", "production") para português.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
                  disabled={migrateLoading}
                  onClick={async () => {
                    setMigrateLoading(true);
                    try {
                      const res = await axios.post(`${API}/admin/migrate-labels`, {}, { withCredentials: true });
                      toast.success(res.data.message);
                      fetchConfig(); // Recarregar config após migração
                    } catch (err) {
                      console.error("Erro na migração:", err);
                      toast.error("Erro ao migrar labels");
                    } finally {
                      setMigrateLoading(false);
                    }
                  }}
                  data-testid="migrate-labels-btn"
                >
                  {migrateLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1" />
                  )}
                  Migrar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Assistant Card */}
        <Card className="lg:col-span-2" data-testid="ai-assistant-card">
          <CardHeader>
            <CardTitle className="font-outfit flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Assistente de IA
            </CardTitle>
            <CardDescription>
              Use inteligência artificial para gerar ideias de conteúdo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>O que você precisa?</Label>
              <Textarea
                placeholder="Ex: Me dê 5 ideias de posts para o Instagram sobre o culto de jovens..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                data-testid="ai-prompt-input"
              />
            </div>

            <Button
              onClick={handleAiSuggestion}
              disabled={aiLoading || !aiPrompt.trim()}
              data-testid="ai-generate-btn"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Gerar Sugestão
                </>
              )}
            </Button>

            {aiSuggestion && (
              <div className="p-4 bg-muted rounded-lg" data-testid="ai-response">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Sugestão da IA:
                </p>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {aiSuggestion}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
