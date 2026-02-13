import { useState } from "react";
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
  X,
  ChevronRight,
  Trophy
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Calendar, label: "Escalas", path: "/schedules" },
  { icon: Users, label: "Membros", path: "/members" },
  { icon: CheckSquare, label: "Aprovações", path: "/approvals" },
  { icon: Link2, label: "Links", path: "/links" },
  { icon: Trophy, label: "Ranking", path: "/gamification" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

const SidebarContent = ({ user, pathname, onLogout, onClose }) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">R</span>
        </div>
        <div>
          <h1 className="font-outfit font-bold text-lg text-white">Tomich Gestão de Mídia</h1>
          <p className="text-xs text-white/60">Sistema de Mídia</p>
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
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
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
          <AvatarImage src={user?.picture} />
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
  </div>
);

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
            <span className="text-white font-bold">R</span>
          </div>
          <span className="font-outfit font-bold text-white">Tomich Gestão de Mídia</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
