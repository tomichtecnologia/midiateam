import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CheckSquare,
  Link2,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  Trophy,
  Play,
  Trash2,
  AlertTriangle,
  FileText,
  ClipboardCheck
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { toast } from "sonner";
import { getAvatarUrl } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Calendar, label: "Escalas", path: "/schedules" },
  { icon: ClipboardCheck, label: "Checklists", path: "/checklists" },
  { icon: Users, label: "Membros", path: "/members" },
  { icon: CheckSquare, label: "Aprovações", path: "/approvals" },
  { icon: Link2, label: "Links", path: "/links" },
  { icon: Trophy, label: "Ranking", path: "/gamification" },
  { icon: FileText, label: "Relatórios", path: "/reports" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

const SidebarContent = ({ user, pathname, onLogout, onClose }) => {
  const [entities, setEntities] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState(user?.current_entity || null);
  const [showNewEntityDialog, setShowNewEntityDialog] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    if (user) {
      axios.get(`${API}/users/me/entities`, { withCredentials: true })
        .then(res => {
          const data = res.data || [];
          setEntities(data);

          // Se current_entity não bate com nenhum da lista, selecionar o primeiro
          const matchesCurrentEntity = data.some(e => e.entity_id === user.current_entity);
          if (!matchesCurrentEntity && data.length > 0) {
            const firstId = data[0].entity_id;
            setSelectedEntityId(firstId);
            // Atualizar no backend silenciosamente
            axios.post(`${API}/users/me/select-entity`, { entity_id: firstId }, { withCredentials: true }).catch(() => { });
          } else if (user.current_entity) {
            setSelectedEntityId(user.current_entity);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  const handleEntityChange = async (val) => {
    if (val === 'add-new') {
      setShowNewEntityDialog(true);
      return;
    }
    if (val === 'delete-current') {
      setShowDeleteDialog(true);
      return;
    }
    try {
      await axios.post(`${API}/users/me/select-entity`, { entity_id: val }, { withCredentials: true });
      window.location.reload();
    } catch (e) {
      toast.error("Erro ao trocar de organização");
      console.error(e);
    }
  };

  const handleCreateEntity = async () => {
    if (!newEntityName.trim()) return;
    setLoadingCreate(true);
    try {
      await axios.post(`${API}/entities`, { name: newEntityName }, { withCredentials: true });
      toast.success("Organização criada com sucesso!");
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar organização. Tente novamente.");
      setLoadingCreate(false);
    }
  };

  const handleDeleteEntity = async () => {
    if (!currentEntity) return;
    setLoadingDelete(true);
    try {
      await axios.delete(`${API}/entities/${currentEntity.entity_id}`, { withCredentials: true });
      toast.success(`Organização "${currentEntity.name}" removida com sucesso!`);
      setShowDeleteDialog(false);
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Erro ao remover organização.");
      setLoadingDelete(false);
    }
  };

  const currentEntity = entities.find(e => e.entity_id === selectedEntityId) || entities[0];

  return (
    <div className="flex flex-col h-full bg-secondary">
      {/* Header com Seletor */}
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 shadow-sm hover:border-primary/20 transition-colors group">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
            <Play className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 overflow-hidden relative">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5">Organização</p>

            {(user?.role === 'superadmin' || entities.length > 1) ? (
              /* Superadmin ou usuário com múltiplas organizações: pode trocar */
              <Select value={selectedEntityId || currentEntity?.entity_id} onValueChange={handleEntityChange}>
                <SelectTrigger className="w-full h-auto p-0 border-0 bg-transparent text-white font-bold text-base shadow-none focus:ring-0 focus:ring-offset-0 ring-offset-transparent data-[placeholder]:text-white">
                  <SelectValue placeholder="Carregando...">
                    <span className="truncate block max-w-[140px]">{currentEntity?.name || "Carregando..."}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-secondary border-white/10 text-white min-w-[220px]">
                  <div className="px-2 py-1.5 text-xs text-white/40 font-semibold uppercase tracking-wider">
                    Trocar Organização
                  </div>
                  {entities.map(e => (
                    <SelectItem
                      key={e.entity_id}
                      value={e.entity_id}
                      className="focus:bg-white/10 focus:text-white cursor-pointer py-2.5 px-3"
                    >
                      {e.name}
                    </SelectItem>
                  ))}
                  {user?.role === 'superadmin' && (
                    <>
                      <Separator className="my-1 bg-white/10" />
                      <SelectItem
                        value="add-new"
                        className="text-primary focus:text-primary focus:bg-primary/10 cursor-pointer font-medium py-2 px-3 text-xs"
                      >
                        + Nova Organização
                      </SelectItem>
                      <SelectItem
                        value="delete-current"
                        className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer font-medium py-2 px-3 text-xs"
                      >
                        <span className="flex items-center gap-1.5">
                          <Trash2 className="w-3 h-3" />
                          Remover Organização
                        </span>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            ) : (
              /* Usuário com apenas 1 organização: mostrar texto fixo */
              <p className="text-white font-bold text-base truncate max-w-[140px]">
                {currentEntity?.name || "Carregando..."}
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                data-testid={`nav-${item.path.replace("/", "")}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                  ? "bg-primary text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-white/10" />

      {/* User Section */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10 border-2 border-white/20">
            <AvatarImage src={getAvatarUrl(user?.picture)} />
            <AvatarFallback className="bg-primary text-white">
              {user?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-white/60 truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
          onClick={onLogout}
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4">
        <div className="text-center text-xs text-white/40 pt-3 border-t border-white/10">
          <p>Desenvolvido por</p>
          <p className="font-semibold text-white/60">Tomich Tecnologia</p>
          <p className="mt-1">© {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Dialog Nova Organização */}
      <Dialog open={showNewEntityDialog} onOpenChange={setShowNewEntityDialog}>
        <DialogContent className="sm:max-w-[425px] bg-[#1e1e24] text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Nova Organização</DialogTitle>
            <div className="text-sm text-white/60">Crie uma nova organização para gerenciar seus projetos e equipes.</div>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Nome da Empresa / Projeto</Label>
              <Input
                id="name"
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                className="bg-white/5 border-white/10 text-white focus-visible:ring-primary"
                placeholder="Ex: Igreja Local, Produtora X..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewEntityDialog(false)} className="text-white/70 hover:text-white hover:bg-white/10">Cancelar</Button>
            <Button onClick={handleCreateEntity} disabled={loadingCreate || !newEntityName.trim()} className="bg-primary text-white hover:bg-primary/90">
              {loadingCreate ? "Criando..." : "Criar Organização"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Remoção */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px] bg-[#1e1e24] text-white border-white/10">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <DialogTitle className="text-lg">Remover Organização</DialogTitle>
            </div>
            <DialogDescription className="text-white/60">
              Tem certeza que deseja remover <strong className="text-white">"{currentEntity?.name}"</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-300 font-medium mb-2">⚠️ Esta ação é irreversível!</p>
              <ul className="text-xs text-white/50 space-y-1">
                <li>• Todos os <strong className="text-white/70">membros</strong> desta organização serão removidos</li>
                <li>• Todas as <strong className="text-white/70">escalas</strong> serão excluídas</li>
                <li>• Todos os <strong className="text-white/70">conteúdos</strong> e aprovações serão perdidos</li>
                <li>• Todos os <strong className="text-white/70">links</strong> serão removidos</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} className="text-white/70 hover:text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteEntity}
              disabled={loadingDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loadingDelete ? "Removendo..." : "Sim, Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function SidebarLayout({ children, user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.success("Logout realizado com sucesso");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex w-64 bg-secondary fixed inset-y-0 left-0 z-50"
        data-testid="desktop-sidebar"
      >
        <SidebarContent
          user={user}
          pathname={location.pathname}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-secondary z-50 flex items-center px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-secondary border-0">
            <SidebarContent
              user={user}
              pathname={location.pathname}
              onLogout={handleLogout}
              onClose={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2 ml-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Play className="w-4 h-4 text-white" />
          </div>
          <span className="font-outfit font-bold text-white">Mídia Team</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
