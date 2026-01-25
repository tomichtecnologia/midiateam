import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Link2,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Wrench,
  Share2,
  FileText,
  Key,
  Search
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categoryIcons = {
  tools: Wrench,
  social: Share2,
  resources: FileText,
  passwords: Key
};

const categoryLabels = {
  tools: "Ferramentas",
  social: "Redes Sociais",
  resources: "Recursos",
  passwords: "Senhas"
};

const LinkCard = ({ link, onEdit, onDelete }) => {
  const [showPassword, setShowPassword] = useState(false);
  const CategoryIcon = categoryIcons[link.category] || Link2;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <Card className="card-hover group" data-testid={`link-card-${link.link_id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CategoryIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{link.title}</h3>
              <Badge variant="outline" className="mt-1">
                {categoryLabels[link.category] || link.category}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(link)}
              data-testid={`edit-link-${link.link_id}`}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(link.link_id)}
              data-testid={`delete-link-${link.link_id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1 mb-3"
        >
          <ExternalLink className="w-3 h-3" />
          {link.url.length > 40 ? link.url.substring(0, 40) + "..." : link.url}
        </a>

        {(link.username || link.password) && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            {link.username && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usuário:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{link.username}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(link.username, "Usuário")}
                    data-testid={`copy-username-${link.link_id}`}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
            {link.password && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Senha:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">
                    {showPassword ? link.password : "••••••••"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid={`toggle-password-${link.link_id}`}
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(link.password, "Senha")}
                    data-testid={`copy-password-${link.link_id}`}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {link.notes && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{link.notes}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default function LinksPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    url: "",
    category: "tools",
    username: "",
    password: "",
    notes: ""
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const response = await axios.get(`${API}/links`, { withCredentials: true });
      setLinks(response.data);
    } catch (error) {
      console.error("Error fetching links:", error);
      toast.error("Erro ao carregar links");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    try {
      if (editingLink) {
        await axios.put(`${API}/links/${editingLink.link_id}`, formData, { withCredentials: true });
        toast.success("Link atualizado com sucesso!");
      } else {
        await axios.post(`${API}/links`, formData, { withCredentials: true });
        toast.success("Link adicionado com sucesso!");
      }
      setIsCreateOpen(false);
      setEditingLink(null);
      resetForm();
      fetchLinks();
    } catch (error) {
      console.error("Error saving link:", error);
      toast.error("Erro ao salvar link");
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!window.confirm("Tem certeza que deseja remover este link?")) return;

    try {
      await axios.delete(`${API}/links/${linkId}`, { withCredentials: true });
      toast.success("Link removido com sucesso!");
      fetchLinks();
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Erro ao remover link");
    }
  };

  const handleEdit = (link) => {
    setEditingLink(link);
    setFormData({
      title: link.title,
      url: link.url,
      category: link.category,
      username: link.username || "",
      password: link.password || "",
      notes: link.notes || ""
    });
    setIsCreateOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      url: "",
      category: "tools",
      username: "",
      password: "",
      notes: ""
    });
  };

  const filteredLinks = links.filter((link) => {
    const matchesSearch = link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeTab === "all" || link.category === activeTab;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="space-y-6" data-testid="links-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="links-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-foreground">Links & Recursos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie links, ferramentas e senhas da equipe
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingLink(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="add-link-btn">
              <Plus className="w-4 h-4 mr-2" />
              Novo Link
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-outfit">
                {editingLink ? "Editar Link" : "Adicionar Link"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Ex: Canva Pro"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="link-title-input"
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  data-testid="link-url-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger data-testid="link-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tools">Ferramentas</SelectItem>
                    <SelectItem value="social">Redes Sociais</SelectItem>
                    <SelectItem value="resources">Recursos</SelectItem>
                    <SelectItem value="passwords">Senhas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuário (opcional)</Label>
                  <Input
                    placeholder="usuario@email.com"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    data-testid="link-username-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha (opcional)</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    data-testid="link-password-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  placeholder="Informações adicionais..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="link-notes-input"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleCreateLink} data-testid="save-link-btn">
                {editingLink ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="link-search-input"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="tools">
              <Wrench className="w-4 h-4 mr-1" />
              Ferramentas
            </TabsTrigger>
            <TabsTrigger value="social">
              <Share2 className="w-4 h-4 mr-1" />
              Redes
            </TabsTrigger>
            <TabsTrigger value="passwords">
              <Key className="w-4 h-4 mr-1" />
              Senhas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Links Grid */}
      {filteredLinks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum link encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLinks.map((link) => (
            <LinkCard
              key={link.link_id}
              link={link}
              onEdit={handleEdit}
              onDelete={handleDeleteLink}
            />
          ))}
        </div>
      )}
    </div>
  );
}
