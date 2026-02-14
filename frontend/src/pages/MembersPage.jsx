import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  Mail,
  Phone,
  Camera,
  Video,
  Mic,
  Edit2,
  Trash2,
  UserPlus,
  Vote,
  Shield,
  Crown,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const roleIcons = {
  operator: Camera,
  editor: Video,
  camera: Camera,
  sound: Mic,
  social_media: UserPlus
};

const roleLabels = {
  operator: "Operador",
  editor: "Editor",
  camera: "Câmera",
  sound: "Som",
  social_media: "Social Media"
};

const departmentLabels = {
  production: "Produção",
  content: "Conteúdo",
  development: "Desenvolvimento"
};

const MemberCard = ({ member, onEdit, onDelete }) => {
  const RoleIcon = roleIcons[member.role] || Camera;

  return (
    <Card className="card-hover group" data-testid={`member-card-${member.member_id}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={member.picture} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {member.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            {member.is_admin && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                <Crown className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg truncate">{member.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <RoleIcon className="w-3 h-3" />
                    {roleLabels[member.role] || member.role}
                  </Badge>
                  <Badge variant="outline">
                    {departmentLabels[member.department] || member.department}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {member.is_admin && (
                    <Badge className="bg-amber-500 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Admin
                    </Badge>
                  )}
                  {member.can_vote && (
                    <Badge variant="default" className="bg-green-600 flex items-center gap-1">
                      <Vote className="w-3 h-3" />
                      Pode Votar
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(member)}
                  data-testid={`edit-member-${member.member_id}`}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(member.member_id)}
                  data-testid={`delete-member-${member.member_id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="truncate">{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    picture: "",
    role: "operator",
    department: "production",
    is_admin: false,
    can_vote: false
  });

  useEffect(() => {
    fetchMembers();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setIsAdmin(response.data.is_admin || false);
      if (response.data.is_admin) {
        fetchPendingRegistrations();
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchPendingRegistrations = async () => {
    try {
      const response = await axios.get(`${API}/auth/pending-registrations`, { withCredentials: true });
      setPendingRegistrations(response.data);
    } catch (error) {
      console.error("Error fetching pending registrations:", error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`${API}/members`, { withCredentials: true });
      setMembers(response.data);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Erro ao carregar membros");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async () => {
    try {
      if (editingMember) {
        await axios.put(`${API}/members/${editingMember.member_id}`, formData, { withCredentials: true });
        toast.success("Membro atualizado com sucesso!");
      } else {
        await axios.post(`${API}/members`, formData, { withCredentials: true });
        toast.success("Membro adicionado com sucesso!");
      }
      setIsCreateOpen(false);
      setEditingMember(null);
      resetForm();
      fetchMembers();
    } catch (error) {
      console.error("Error saving member:", error);
      toast.error("Erro ao salvar membro");
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("Tem certeza que deseja remover este membro?")) return;

    try {
      await axios.delete(`${API}/members/${memberId}`, { withCredentials: true });
      toast.success("Membro removido com sucesso!");
      fetchMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Erro ao remover membro");
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
      picture: member.picture || "",
      role: member.role,
      department: member.department,
      is_admin: member.is_admin || false,
      can_vote: member.can_vote || false
    });
    setIsCreateOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      picture: "",
      role: "operator",
      department: "production",
      is_admin: false,
      can_vote: false
    });
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      filterDepartment === "all" || member.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleApproveRegistration = async (registrationId) => {
    try {
      await axios.post(`${API}/auth/approve-registration/${registrationId}`, {}, { withCredentials: true });
      toast.success("Cadastro aprovado com sucesso!");
      fetchPendingRegistrations();
      fetchMembers();
    } catch (error) {
      toast.error("Erro ao aprovar cadastro");
    }
  };

  const handleRejectRegistration = async (registrationId) => {
    if (!window.confirm("Tem certeza que deseja rejeitar este cadastro?")) return;
    try {
      await axios.post(`${API}/auth/reject-registration/${registrationId}`, {}, { withCredentials: true });
      toast.success("Cadastro rejeitado");
      fetchPendingRegistrations();
    } catch (error) {
      toast.error("Erro ao rejeitar cadastro");
    }
  };

  const votersCount = members.filter(m => m.can_vote).length;
  const adminsCount = members.filter(m => m.is_admin).length;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="members-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="members-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-foreground">Membros</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a equipe de mídia
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingMember(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="add-member-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-outfit">
                {editingMember ? "Editar Membro" : "Adicionar Membro"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="member-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="member-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="member-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label>URL da Foto</Label>
                <Input
                  placeholder="https://..."
                  value={formData.picture}
                  onChange={(e) => setFormData({ ...formData, picture: e.target.value })}
                  data-testid="member-picture-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger data-testid="member-role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operator">Operador</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="camera">Câmera</SelectItem>
                      <SelectItem value="sound">Som</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger data-testid="member-department-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Produção</SelectItem>
                      <SelectItem value="content">Conteúdo</SelectItem>
                      <SelectItem value="development">Desenvolvimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Permissões */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Permissões</h4>
                
                {/* Admin */}
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <Label className="font-medium">Administrador</Label>
                      <p className="text-sm text-muted-foreground">
                        Pode gerenciar membros, entidades e estornar votos
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.is_admin}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_admin: checked })}
                    data-testid="member-is-admin-switch"
                  />
                </div>

                {/* Votação */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Vote className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <Label className="font-medium">Pode Votar</Label>
                      <p className="text-sm text-muted-foreground">
                        Permitir votar na aprovação de conteúdo
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.can_vote}
                    onCheckedChange={(checked) => setFormData({ ...formData, can_vote: checked })}
                    data-testid="member-can-vote-switch"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleCreateMember} data-testid="save-member-btn">
                {editingMember ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="member-search-input"
          />
        </div>
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-full sm:w-48" data-testid="filter-department-select">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="production">Produção</SelectItem>
            <SelectItem value="content">Conteúdo</SelectItem>
            <SelectItem value="development">Desenvolvimento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum membro encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.member_id}
              member={member}
              onEdit={handleEdit}
              onDelete={handleDeleteMember}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            <span>Total: <strong className="text-foreground">{members.length}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-amber-500" />
              Admins: <strong className="text-amber-600">{adminsCount}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Vote className="w-4 h-4 text-green-600" />
              Votantes: <strong className="text-green-600">{votersCount}</strong>
            </span>
            <span>•</span>
            <span>Produção: <strong className="text-foreground">{members.filter(m => m.department === "production").length}</strong></span>
            <span>•</span>
            <span>Conteúdo: <strong className="text-foreground">{members.filter(m => m.department === "content").length}</strong></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
