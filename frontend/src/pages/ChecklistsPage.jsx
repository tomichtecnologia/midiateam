import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Plus, ClipboardCheck, Trash2, Edit2, GripVertical, CheckCircle, XCircle,
    Shield, ListChecks, Calendar, Clock, User, MoreVertical, Check
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getAvatarUrl } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

const colorOptions = [
    { value: "blue", label: "Azul", bg: "bg-blue-500", light: "bg-blue-50 border-blue-200 text-blue-700" },
    { value: "red", label: "Vermelho", bg: "bg-red-500", light: "bg-red-50 border-red-200 text-red-700" },
    { value: "green", label: "Verde", bg: "bg-green-500", light: "bg-green-50 border-green-200 text-green-700" },
    { value: "amber", label: "Amarelo", bg: "bg-amber-500", light: "bg-amber-50 border-amber-200 text-amber-700" },
    { value: "purple", label: "Roxo", bg: "bg-purple-500", light: "bg-purple-50 border-purple-200 text-purple-700" },
    { value: "pink", label: "Rosa", bg: "bg-pink-500", light: "bg-pink-50 border-pink-200 text-pink-700" },
];

const getColorClasses = (color) => colorOptions.find(c => c.value === color) || colorOptions[0];

// ============== TEMPLATE CARD ==============
const TemplateCard = ({ template, onEdit, onDelete }) => {
    const color = getColorClasses(template.color);
    const itemCount = template.items?.length || 0;

    return (
        <Card className="card-hover group" data-testid={`template-${template.template_id}`}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center`}>
                                <ClipboardCheck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">{template.title}</h3>
                                {template.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                            <Badge className={color.light}>
                                <ListChecks className="w-3 h-3 mr-1" />
                                {itemCount} {itemCount === 1 ? "item" : "itens"}
                            </Badge>
                            {!template.active && <Badge variant="secondary">Inativo</Badge>}
                        </div>

                        {/* Preview items */}
                        {template.items?.length > 0 && (
                            <div className="mt-3 space-y-1">
                                {template.items.slice(0, 3).map((item) => (
                                    <div key={item.item_id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <div className="w-4 h-4 rounded border border-muted-foreground/30 flex items-center justify-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                        </div>
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                ))}
                                {template.items.length > 3 && (
                                    <p className="text-xs text-muted-foreground pl-6">
                                        +{template.items.length - 3} mais...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(template)}>
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(template.template_id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// ============== ASSIGNMENT CARD ==============
const AssignmentCard = ({ assignment, onToggleItem, onDelete, isAdmin }) => {
    const totalItems = assignment.items?.length || 0;
    const doneItems = assignment.items?.filter(i => i.done).length || 0;
    const progress = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;
    const [expanded, setExpanded] = useState(false);

    const statusColors = {
        pending: "bg-amber-100 text-amber-700",
        in_progress: "bg-blue-100 text-blue-700",
        completed: "bg-green-100 text-green-700",
    };
    const statusLabels = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluído" };

    return (
        <Card className={`card-hover ${assignment.status === "completed" ? "opacity-75" : ""}`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={getAvatarUrl(assignment.assigned_to_picture)} />
                            <AvatarFallback className="text-xs">
                                {assignment.assigned_to_name?.charAt(0) || "?"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium text-sm">{assignment.assigned_to_name}</p>
                            <p className="text-xs text-muted-foreground">{assignment.checklist_title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className={statusColors[assignment.status]}>
                            {statusLabels[assignment.status]}
                        </Badge>
                        {isAdmin && assignment.status !== "completed" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(assignment.assignment_id)}>
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </div>

                {assignment.due_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>{format(parseISO(assignment.due_date), "dd/MM/yyyy (EEE)", { locale: ptBR })}</span>
                        {assignment.schedule_title && <span>• {assignment.schedule_title}</span>}
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{doneItems}/{totalItems}</span>
                    </div>
                    <Progress value={progress} className={`h-2 ${progress === 100 ? "[&>div]:bg-green-500" : ""}`} />
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 text-xs"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? "Ocultar itens" : "Ver itens"}
                </Button>

                {expanded && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                        {assignment.items?.map((item) => (
                            <button
                                key={item.item_id}
                                className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm text-left transition-all ${item.done
                                        ? "bg-green-50 text-green-700 line-through opacity-70"
                                        : "bg-muted/50 hover:bg-muted text-foreground"
                                    }`}
                                onClick={() => onToggleItem(assignment.assignment_id, item.item_id, !item.done)}
                                disabled={assignment.status === "completed" && item.done}
                            >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${item.done
                                        ? "bg-green-500 border-green-500 text-white"
                                        : "border-muted-foreground/30"
                                    }`}>
                                    {item.done && <Check className="w-3 h-3" />}
                                </div>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// ============== PAGE ==============
export default function ChecklistsPage() {
    const [templates, setTemplates] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState("templates");

    // Template Dialog
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateForm, setTemplateForm] = useState({
        title: "", description: "", icon: "clipboard-check", color: "blue", items: []
    });
    const [newItemLabel, setNewItemLabel] = useState("");

    // Assignment filter
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [userRes, templatesRes, assignmentsRes, membersRes] = await Promise.all([
                axios.get(`${API}/auth/me`, { withCredentials: true }),
                axios.get(`${API}/checklist-templates`, { withCredentials: true }),
                axios.get(`${API}/checklist-assignments`, { withCredentials: true }),
                axios.get(`${API}/members`, { withCredentials: true }),
            ]);

            const user = userRes.data;
            const memberData = membersRes.data.find(m => m.user_id === user.user_id);
            setIsAdmin(user.is_admin || user.role === "superadmin" || memberData?.is_admin || false);
            setTemplates(templatesRes.data);
            setAssignments(assignmentsRes.data);
            setMembers(membersRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    };

    // ============ TEMPLATE HANDLERS ============
    const handleOpenTemplateDialog = (template = null) => {
        if (template) {
            setEditingTemplate(template);
            setTemplateForm({
                title: template.title,
                description: template.description || "",
                icon: template.icon || "clipboard-check",
                color: template.color || "blue",
                items: template.items || [],
            });
        } else {
            setEditingTemplate(null);
            setTemplateForm({ title: "", description: "", icon: "clipboard-check", color: "blue", items: [] });
        }
        setNewItemLabel("");
        setTemplateDialogOpen(true);
    };

    const handleAddItem = () => {
        if (!newItemLabel.trim()) return;
        setTemplateForm({
            ...templateForm,
            items: [...templateForm.items, {
                item_id: `item_${Date.now().toString(36)}`,
                label: newItemLabel.trim(),
                order: templateForm.items.length
            }]
        });
        setNewItemLabel("");
    };

    const handleRemoveItem = (index) => {
        setTemplateForm({
            ...templateForm,
            items: templateForm.items.filter((_, i) => i !== index)
        });
    };

    const handleSaveTemplate = async () => {
        if (!templateForm.title.trim()) {
            toast.error("Informe o título da checklist");
            return;
        }
        if (templateForm.items.length === 0) {
            toast.error("Adicione pelo menos um item");
            return;
        }

        try {
            if (editingTemplate) {
                await axios.put(`${API}/checklist-templates/${editingTemplate.template_id}`, templateForm, { withCredentials: true });
                toast.success("Checklist atualizada!");
            } else {
                await axios.post(`${API}/checklist-templates`, templateForm, { withCredentials: true });
                toast.success("Checklist criada!");
            }
            setTemplateDialogOpen(false);
            fetchData();
        } catch (error) {
            console.error("Error saving template:", error);
            toast.error("Erro ao salvar checklist");
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!window.confirm("Excluir esta checklist?")) return;
        try {
            await axios.delete(`${API}/checklist-templates/${templateId}`, { withCredentials: true });
            toast.success("Checklist excluída!");
            fetchData();
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    // ============ ASSIGNMENT HANDLERS ============
    const handleToggleItem = async (assignmentId, itemId, done) => {
        try {
            const res = await axios.put(
                `${API}/checklist-assignments/${assignmentId}/toggle-item`,
                { item_id: itemId, done },
                { withCredentials: true }
            );
            if (res.data.just_completed) {
                toast.success("🎉 Checklist concluída! +10 pontos!", { duration: 5000 });
            }
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao atualizar item");
        }
    };

    const handleDeleteAssignment = async (assignmentId) => {
        if (!window.confirm("Remover esta atribuição?")) return;
        try {
            await axios.delete(`${API}/checklist-assignments/${assignmentId}`, { withCredentials: true });
            toast.success("Atribuição removida!");
            fetchData();
        } catch (error) {
            toast.error("Erro ao remover");
        }
    };

    const filteredAssignments = filterStatus === "all"
        ? assignments
        : assignments.filter(a => a.status === filterStatus);

    if (loading) {
        return (
            <div className="space-y-6" data-testid="checklists-loading">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn" data-testid="checklists-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="font-outfit text-3xl font-bold text-foreground">Checklists</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie templates e acompanhe a execução de checklists operacionais
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={() => handleOpenTemplateDialog()} data-testid="create-checklist-btn">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Template
                    </Button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <ClipboardCheck className="w-8 h-8 text-blue-600" />
                        <div><p className="text-2xl font-bold text-blue-700">{templates.length}</p><p className="text-xs text-blue-600/70">Templates</p></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Clock className="w-8 h-8 text-amber-600" />
                        <div><p className="text-2xl font-bold text-amber-700">{assignments.filter(a => a.status === "pending").length}</p><p className="text-xs text-amber-600/70">Pendentes</p></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <ListChecks className="w-8 h-8 text-purple-600" />
                        <div><p className="text-2xl font-bold text-purple-700">{assignments.filter(a => a.status === "in_progress").length}</p><p className="text-xs text-purple-600/70">Em Andamento</p></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div><p className="text-2xl font-bold text-green-700">{assignments.filter(a => a.status === "completed").length}</p><p className="text-xs text-green-600/70">Concluídos</p></div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="templates"><ClipboardCheck className="w-4 h-4 mr-2" /> Templates</TabsTrigger>
                    <TabsTrigger value="assignments">
                        <ListChecks className="w-4 h-4 mr-2" /> Atribuições
                        {assignments.filter(a => a.status !== "completed").length > 0 && (
                            <Badge className="ml-2 bg-amber-500 h-5 px-1.5 min-w-[20px] justify-center">
                                {assignments.filter(a => a.status !== "completed").length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Templates Tab */}
                <TabsContent value="templates" className="mt-4">
                    {templates.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Nenhum template de checklist criado</p>
                                {isAdmin && (
                                    <Button variant="outline" className="mt-4" onClick={() => handleOpenTemplateDialog()}>
                                        <Plus className="w-4 h-4 mr-2" /> Criar primeiro template
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map(template => (
                                <TemplateCard
                                    key={template.template_id}
                                    template={template}
                                    onEdit={handleOpenTemplateDialog}
                                    onDelete={handleDeleteTemplate}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Assignments Tab */}
                <TabsContent value="assignments" className="mt-4 space-y-4">
                    <div className="flex gap-2 flex-wrap">
                        {["all", "pending", "in_progress", "completed"].map(status => (
                            <Button
                                key={status}
                                variant={filterStatus === status ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilterStatus(status)}
                            >
                                {status === "all" ? "Todas" : status === "pending" ? "Pendentes" : status === "in_progress" ? "Em Andamento" : "Concluídas"}
                            </Button>
                        ))}
                    </div>

                    {filteredAssignments.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Nenhuma atribuição {filterStatus !== "all" ? "com este status" : "encontrada"}</p>
                                <p className="text-sm mt-2">Atribua checklists ao criar ou editar uma escala</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAssignments.map(assignment => (
                                <AssignmentCard
                                    key={assignment.assignment_id}
                                    assignment={assignment}
                                    onToggleItem={handleToggleItem}
                                    onDelete={handleDeleteAssignment}
                                    isAdmin={isAdmin}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Template Create/Edit Dialog */}
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-outfit">
                            {editingTemplate ? "Editar Template" : "Novo Template de Checklist"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input
                                placeholder="Ex: Fechamento de Sessão"
                                value={templateForm.title}
                                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição (opcional)</Label>
                            <Textarea
                                placeholder="Descreva quando usar esta checklist..."
                                value={templateForm.description}
                                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Cor</Label>
                            <div className="flex gap-2">
                                {colorOptions.map(c => (
                                    <button
                                        key={c.value}
                                        className={`w-8 h-8 rounded-lg ${c.bg} transition-all ${templateForm.color === c.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-60 hover:opacity-100"
                                            }`}
                                        onClick={() => setTemplateForm({ ...templateForm, color: c.value })}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2">
                            <Label>Itens da Checklist</Label>
                            <div className="space-y-2">
                                {templateForm.items.map((item, index) => (
                                    <div key={item.item_id || index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />
                                        <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                                        <span className="flex-1 text-sm">{item.label}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveItem(index)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 mt-2">
                                <Input
                                    placeholder="Adicionar item... (ex: Desligar tomadas)"
                                    value={newItemLabel}
                                    onChange={(e) => setNewItemLabel(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddItem())}
                                />
                                <Button variant="outline" size="icon" onClick={handleAddItem}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleSaveTemplate}>
                            {editingTemplate ? "Salvar Alterações" : "Criar Checklist"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
