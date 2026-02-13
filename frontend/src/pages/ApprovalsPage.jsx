import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  XCircle,
  Clock,
  Image,
  Video,
  FileText,
  Instagram,
  Sparkles,
  Users,
  Vote,
  AlertCircle
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const contentTypeIcons = {
  video: Video,
  image: Image,
  post: FileText,
  story: Instagram
};

const contentTypeLabels = {
  video: "Vídeo",
  image: "Imagem",
  post: "Post",
  story: "Story"
};

const statusLabels = {
  pending: { label: "Pendente", variant: "secondary", icon: Clock },
  approved: { label: "Aprovado", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejeitado", variant: "destructive", icon: XCircle }
};

const ApprovalCard = ({ approval, onVote, currentUserId, totalVoters, canVote }) => {
  const ContentIcon = contentTypeIcons[approval.content_type] || FileText;
  const statusInfo = statusLabels[approval.status] || statusLabels.pending;
  const StatusIcon = statusInfo.icon;

  const votesFor = approval.votes_for?.length || 0;
  const votesAgainst = approval.votes_against?.length || 0;
  const totalVotes = votesFor + votesAgainst;
  const approvalPercentage = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;
  const participationPercentage = totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;

  const hasVotedFor = approval.votes_for?.includes(currentUserId);
  const hasVotedAgainst = approval.votes_against?.includes(currentUserId);

  return (
    <Card className="card-hover overflow-hidden" data-testid={`approval-card-${approval.approval_id}`}>
      {/* Thumbnail */}
      {approval.thumbnail_url ? (
        <div className="aspect-video relative overflow-hidden bg-muted">
          <img
            src={approval.thumbnail_url}
            alt={approval.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2">
            <Badge className="flex items-center gap-1">
              <ContentIcon className="w-3 h-3" />
              {contentTypeLabels[approval.content_type]}
            </Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative">
          <ContentIcon className="w-16 h-16 text-muted-foreground/50" />
          <div className="absolute top-2 left-2">
            <Badge className="flex items-center gap-1">
              <ContentIcon className="w-3 h-3" />
              {contentTypeLabels[approval.content_type]}
            </Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      )}

      <CardContent className="p-5">
        <h3 className="font-semibold text-lg mb-2">{approval.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {approval.description}
        </p>

        {/* Voting Stats */}
        <div className="space-y-3 mb-4">
          {/* Approval Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Aprovação</span>
              <span className={`font-semibold ${approvalPercentage >= 50 ? "text-green-600" : "text-amber-500"}`}>
                {Math.round(approvalPercentage)}%
              </span>
            </div>
            <div className="relative">
              <Progress
                value={approvalPercentage}
                className={`h-3 ${approvalPercentage >= 50 ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500"}`}
              />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-3 bg-border" />
            </div>
          </div>

          {/* Participation */}
          <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-lg">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              Participação
            </span>
            <span className="font-medium">
              {totalVotes} de {totalVoters} votantes ({Math.round(participationPercentage)}%)
            </span>
          </div>

          {/* Votes breakdown */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 text-green-500" />
              {votesFor} votos a favor
            </span>
            <span>50% necessário</span>
            <span className="flex items-center gap-1">
              <ThumbsDown className="w-3 h-3 text-red-500" />
              {votesAgainst} votos contra
            </span>
          </div>
        </div>

        {/* Vote Buttons */}
        {approval.status === "pending" && (
          <>
            {canVote ? (
              <div className="flex gap-2">
                <Button
                  variant={hasVotedFor ? "default" : "outline"}
                  className={`flex-1 ${hasVotedFor ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => onVote(approval.approval_id, "for")}
                  disabled={hasVotedFor}
                  data-testid={`vote-for-${approval.approval_id}`}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  variant={hasVotedAgainst ? "default" : "outline"}
                  className={`flex-1 ${hasVotedAgainst ? "bg-red-600 hover:bg-red-700" : ""}`}
                  onClick={() => onVote(approval.approval_id, "against")}
                  disabled={hasVotedAgainst}
                  data-testid={`vote-against-${approval.approval_id}`}
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            ) : (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 text-sm">
                  Você não tem permissão para votar. Contate um administrador.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Metadata */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          {approval.created_at && (
            <span>
              Enviado em {format(parseISO(approval.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [votingStats, setVotingStats] = useState({ total_voters: 0, can_vote: false });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content_type: "video",
    content_url: "",
    thumbnail_url: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [approvalsRes, userRes, statsRes] = await Promise.all([
        axios.get(`${API}/approvals`, { withCredentials: true }),
        axios.get(`${API}/auth/me`, { withCredentials: true }),
        axios.get(`${API}/approvals/voting-stats`, { withCredentials: true })
      ]);

      setApprovals(approvalsRes.data);
      setCurrentUser(userRes.data);
      setVotingStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApproval = async () => {
    try {
      await axios.post(`${API}/approvals`, formData, { withCredentials: true });
      toast.success("Conteúdo enviado para aprovação!");
      setIsCreateOpen(false);
      setFormData({
        title: "",
        description: "",
        content_type: "video",
        content_url: "",
        thumbnail_url: ""
      });
      fetchData();
    } catch (error) {
      console.error("Error creating approval:", error);
      toast.error("Erro ao enviar conteúdo");
    }
  };

  const handleVote = async (approvalId, vote) => {
    try {
      await axios.post(
        `${API}/approvals/${approvalId}/vote`,
        { approval_id: approvalId, vote },
        { withCredentials: true }
      );
      toast.success(vote === "for" ? "Voto de aprovação registrado!" : "Voto de rejeição registrado!");
      fetchData();
    } catch (error) {
      console.error("Error voting:", error);
      if (error.response?.status === 403) {
        toast.error("Você não tem permissão para votar");
      } else {
        toast.error("Erro ao votar");
      }
    }
  };

  const filteredApprovals = approvals.filter((approval) => {
    if (activeTab === "all") return true;
    return approval.status === activeTab;
  });

  if (loading) {
    return (
      <div className="space-y-6" data-testid="approvals-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="approvals-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-foreground">Aprovações</h1>
          <p className="text-muted-foreground mt-1">
            Vote nos conteúdos para aprovação
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Voting Stats Card */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Vote className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Votantes</p>
                <p className="text-xl font-bold text-green-600">{votingStats.total_voters}</p>
              </div>
              {votingStats.can_vote && (
                <Badge className="bg-green-600 ml-2">Você pode votar</Badge>
              )}
            </CardContent>
          </Card>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="submit-content-btn">
                <Plus className="w-4 h-4 mr-2" />
                Enviar Conteúdo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-outfit">Enviar para Aprovação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Vídeo do culto de domingo"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    data-testid="approval-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descreva o conteúdo..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="approval-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Conteúdo</Label>
                  <Select
                    value={formData.content_type}
                    onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                  >
                    <SelectTrigger data-testid="approval-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>URL do Conteúdo</Label>
                  <Input
                    placeholder="https://..."
                    value={formData.content_url}
                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                    data-testid="approval-content-url-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL da Thumbnail</Label>
                  <Input
                    placeholder="https://..."
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    data-testid="approval-thumbnail-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleCreateApproval} data-testid="submit-approval-btn">
                  Enviar para Aprovação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Alert */}
      {!votingStats.can_vote && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Você não está habilitado para votar. Para votar nas aprovações, um administrador precisa ativar essa permissão no seu cadastro de membro.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            <Clock className="w-4 h-4 mr-2" />
            Pendentes ({approvals.filter(a => a.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovados ({approvals.filter(a => a.status === "approved").length})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            <XCircle className="w-4 h-4 mr-2" />
            Rejeitados ({approvals.filter(a => a.status === "rejected").length})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all-approvals">
            Todos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Approvals Grid */}
      {filteredApprovals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum conteúdo {activeTab !== "all" ? statusLabels[activeTab]?.label.toLowerCase() : ""}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApprovals.map((approval) => (
            <ApprovalCard
              key={approval.approval_id}
              approval={approval}
              onVote={handleVote}
              currentUserId={currentUser?.user_id}
              totalVoters={votingStats.total_voters}
              canVote={votingStats.can_vote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
