import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Bell,
  Calendar,
  Sparkles,
  Send,
  Loader2
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Notification settings (local state for demo)
  const [notifications, setNotifications] = useState({
    scheduleReminders: true,
    approvalUpdates: true,
    newMembers: false
  });

  useEffect(() => {
    fetchUser();
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
              <Avatar className="w-20 h-20 border-2 border-primary/20">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{user?.name}</h3>
                <p className="text-muted-foreground">{user?.email}</p>
                <p className="text-sm text-muted-foreground capitalize mt-1">
                  Função: {user?.role === "member" ? "Membro" : user?.role}
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
