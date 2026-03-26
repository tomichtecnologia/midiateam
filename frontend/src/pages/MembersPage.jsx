import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search, Trash2, Mail, Plus, UserPlus, Check, X, Clock,
  Building2, Briefcase, Phone, ChevronDown, ChevronUp, Loader2,
  Shield, Eye, EyeOff, Pencil, Globe, Users, ChevronsUpDown, KeyRound, Vote,
  Zap, CheckCircle, Filter
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { getAvatarUrl, cn } from "@/lib/utils";

// ============ GAMIFICATION CONSTANTS ============
const levelColors = {
  1: "from-gray-400 to-gray-500",
  2: "from-green-400 to-green-600",
  3: "from-blue-400 to-blue-600",
  4: "from-purple-400 to-purple-600",
  5: "from-yellow-400 to-yellow-600",
  6: "from-orange-400 to-orange-600",
  7: "from-red-400 to-red-600",
  8: "from-pink-400 to-pink-600",
  9: "from-indigo-400 to-indigo-600",
  10: "from-amber-400 to-amber-600",
};

const levelNames = {
  1: "Iniciante", 2: "Aprendiz", 3: "Colaborador", 4: "Dedicado",
  5: "Experiente", 6: "Avançado", 7: "Expert", 8: "Mestre",
  9: "Lenda", 10: "Supremo",
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

// ============ MULTI-SELECT DROPDOWN ============
function MultiSelectDropdown({ options, selected, onChange, placeholder, icon: Icon }) {
  const [open, setOpen] = useState(false);

  const handleToggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value, e) => {
    e.stopPropagation();
    onChange(selected.filter(v => v !== value));
  };

  // options can be strings or { value, label, description }
  const normalizedOptions = options.map(o =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[40px] font-normal"
        >
          <div className="flex flex-wrap gap-1 flex-1 text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map(val => {
                const opt = normalizedOptions.find(o => o.value === val);
                return (
                  <Badge key={val} variant="secondary" className="text-xs gap-1 py-0.5 pr-1">
                    {opt?.label || val}
                    <button
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      onClick={(e) => handleRemove(val, e)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar...`} />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
            <CommandGroup>
              {normalizedOptions.map(opt => {
                const isSelected = selected.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => handleToggle(opt.value)}
                    className="cursor-pointer"
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1">
                      <span>{opt.label}</span>
                      {opt.description && (
                        <span className="text-xs text-muted-foreground ml-2">{opt.description}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ============ CARD DE MEMBRO ============
const MemberCard = ({ member, onDelete, onEdit, showEntity, allBadges = {} }) => {
  const level = member.level || 1;
  const points = member.points || 0;
  const badges = (member.badges || []).filter(b => allBadges[b]);
  const topBadges = badges.slice(0, 5);

  return (
    <Card className="card-hover group">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar with level ring */}
          <div className="relative shrink-0">
            <Avatar className="w-14 h-14 border-2 border-primary/20">
              <AvatarImage src={getAvatarUrl(member.picture)} />
              <AvatarFallback>{member.name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            {/* Level indicator */}
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${levelColors[level]} flex items-center justify-center shadow-md border-2 border-background`}>
              <span className="text-[10px] font-bold text-white">{level}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <h3 className="font-semibold text-base truncate">{member.name}</h3>
                {showEntity && member.entity_name && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-primary/60" />
                    <span className="text-xs font-medium text-primary/80">{member.entity_name}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-0.5 shrink-0">
                {onEdit && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => onEdit(member)} title="Editar membro">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(member.member_id)} title="Excluir membro">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Level + Points badges */}
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 bg-gradient-to-r ${levelColors[level]} text-white border-0`}
              >
                {levelNames[level]}
              </Badge>
              {points > 0 && (
                <Badge variant="outline" className="text-[10px] py-0 gap-0.5">
                  <Zap className="w-2.5 h-2.5 text-yellow-500" />
                  {points}
                </Badge>
              )}
              {(member.roles || []).map((role) => (
                <Badge key={role} variant="secondary" className="text-xs py-0">{role}</Badge>
              ))}
              {(member.departments && member.departments.length > 0
                ? member.departments
                : (member.department ? [member.department] : [])
              ).map(dept => (
                <Badge key={dept} variant="outline" className="text-xs py-0">{dept}</Badge>
              ))}
              {member.is_admin && (
                <Badge className="text-xs py-0 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-0">
                  <Shield className="w-3 h-3 mr-0.5" /> Admin
                </Badge>
              )}
            </div>
            {/* Earned badges strip */}
            {topBadges.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                {topBadges.map((bId) => (
                  <TooltipProvider key={bId}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm cursor-default hover:scale-125 transition-transform inline-block">
                          {allBadges[bId]?.icon}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-semibold">{allBadges[bId]?.name}</p>
                        <p className="text-muted-foreground">{allBadges[bId]?.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {badges.length > 5 && (
                  <span className="text-[10px] text-muted-foreground font-medium">+{badges.length - 5}</span>
                )}
              </div>
            )}
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3 h-3" /><span className="truncate">{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /><span>{member.phone}</span></div>
              )}
              {member.institution && (
                <div className="flex items-center gap-1.5"><Building2 className="w-3 h-3" /><span className="truncate">{member.institution}</span></div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============ CARD DE PENDÊNCIA ============
const PendingRegistrationCard = ({ registration, onReview, onReject, loading, entities = [] }) => {
  const createdAt = registration.created_at
    ? new Date(registration.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-sm">{registration.name}</h4>
                <p className="text-xs text-muted-foreground">{registration.email}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline"
                  className="h-8 px-3 text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                  onClick={() => onReview(registration)} disabled={loading} title="Revisar e Aprovar">
                  <Eye className="w-4 h-4 mr-1" /> Revisar
                </Button>
                <Button size="sm" variant="outline"
                  className="h-8 px-2 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                  onClick={() => onReject(registration.registration_id)} disabled={loading} title="Rejeitar">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(registration.roles || []).map((r) => <Badge key={r} variant="secondary" className="text-xs py-0">{r}</Badge>)}
              {registration.department && <Badge variant="outline" className="text-xs py-0">{registration.department}</Badge>}
            </div>
            {(registration.requested_entities || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {registration.requested_entities.map((eid) => {
                  const ent = entities.find(e => e.entity_id === eid);
                  const isApproved = (registration.approved_entities || []).includes(eid);
                  return (
                    <Badge key={eid} variant="outline" className={`text-xs py-0 ${isApproved
                      ? "border-green-400 text-green-700 dark:border-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
                      : "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400"}`}>
                      {isApproved && <CheckCircle className="w-3 h-3 mr-1" />}
                      {ent?.name || eid}
                    </Badge>
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {registration.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{registration.phone}</span>}
              {registration.institution && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{registration.institution}</span>}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{createdAt}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============ MODAL DE EDIÇÃO / APROVAÇÃO ============
function MemberEditDialog({
  open, onOpenChange, member, registration, entities, entityConfig,
  onSave, loading, mode, isSuperAdmin
}) {
  const [editData, setEditData] = useState({
    name: "", roles: [], department: "", departments: [], institution: "", phone: "", is_admin: false,
  });
  const [selectedEntityIds, setSelectedEntityIds] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const source = member || registration;
  const isApproval = mode === "approve";

  useEffect(() => {
    if (!source) return;
    setNewPassword("");
    setShowPassword(false);
    setEditEmail(source.email || "");
    const sourceDepartments = source.departments && source.departments.length > 0
      ? source.departments
      : (source.department ? [source.department] : []);
    setEditData({
      name: source.name || "",
      roles: source.roles || [],
      department: source.department || "",
      departments: sourceDepartments,
      institution: source.institution || "",
      phone: source.phone || "",
      is_admin: source.is_admin || false,
      can_vote: source.can_vote || false,
    });

    if (isApproval) {
      // Pre-selecionar as entidades que o candidato solicitou
      const requestedEntities = registration?.requested_entities || [];
      if (requestedEntities.length > 0) {
        // Filtrar apenas entidades que existem na lista disponível
        const validEntities = requestedEntities.filter(eid => entities.some(e => e.entity_id === eid));
        setSelectedEntityIds(validEntities.length > 0 ? validEntities : (entities.length > 0 ? [entities[0].entity_id] : []));
      } else {
        setSelectedEntityIds(entities.length > 0 ? [entities[0].entity_id] : []);
      }
    } else if (member) {
      fetchMemberEntities(member.member_id);
    }
  }, [source, entities]);

  const fetchMemberEntities = async (memberId) => {
    try {
      setLoadingEntities(true);
      const res = await axios.get(`${API}/admin/members/${memberId}/entities`, { withCredentials: true });
      setSelectedEntityIds(res.data.map(e => e.entity_id));
    } catch {
      if (member?.entity_id) setSelectedEntityIds([member.entity_id]);
    } finally {
      setLoadingEntities(false);
    }
  };

  if (!source) return null;

  const handleSubmit = () => {
    if (selectedEntityIds.length === 0) {
      toast.error("Selecione pelo menos uma organização");
      return;
    }
    if (editData.roles.length === 0) {
      toast.error("Selecione pelo menos uma função");
      return;
    }
    if (editData.departments.length === 0) {
      toast.error("Selecione pelo menos um setor");
      return;
    }
    const id = isApproval ? registration.registration_id : member.member_id;
    const saveData = {
      ...editData,
      department: editData.departments[0] || "",
      entity_ids: selectedEntityIds,
      entity_id: selectedEntityIds[0]
    };
    onSave(id, saveData, mode);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error("A nova senha deve ter pelo menos 4 caracteres");
      return;
    }
    // Use user_id if available, otherwise fall back to member_id
    const targetId = member?.user_id || member?.member_id;
    if (!targetId) {
      toast.error("Membro inválido");
      return;
    }
    try {
      setPasswordLoading(true);
      const res = await axios.post(`${API}/auth/admin-change-password/${targetId}`, {
        new_password: newPassword
      }, { withCredentials: true });
      toast.success(res.data?.message || `Senha de ${member.name} redefinida com sucesso!`);
      setNewPassword("");
      setShowPassword(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao redefinir senha");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Montar opções dinâmicas (config + roles do candidato)
  const baseRoles = entityConfig?.custom_roles || ["Operador", "Editor", "Câmera", "Sonoplastia", "Mídias Sociais"];
  const extraRoles = (source.roles || []).filter(r => r && !baseRoles.includes(r));
  const availableRoles = [...baseRoles, ...extraRoles];

  const baseDepts = entityConfig?.custom_departments || ["Produção", "Conteúdo", "Desenvolvimento"];
  const extraDepts = source.department && !baseDepts.includes(source.department) ? [source.department] : [];
  const availableDepts = [...baseDepts, ...extraDepts];

  const entityOptions = entities.map(e => ({
    value: e.entity_id,
    label: e.name,
    description: e.description || ""
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApproval ? <UserPlus className="w-5 h-5 text-primary" /> : <Pencil className="w-5 h-5 text-primary" />}
            {isApproval ? "Revisar Solicitação de Cadastro" : "Editar Membro"}
          </DialogTitle>
          <DialogDescription>
            {isApproval ? "Revise e ajuste os dados do candidato antes de aprovar" : "Altere os dados do membro"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Dados informativos (aprovação) */}
          {isApproval && (
            <>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do Candidato</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">Email</span><p className="font-medium">{registration.email}</p></div>
                  {registration.phone && <div><span className="text-muted-foreground text-xs">Telefone</span><p className="font-medium">{registration.phone}</p></div>}
                  {registration.institution && <div className="col-span-2"><span className="text-muted-foreground text-xs">Instituição</span><p className="font-medium">{registration.institution}</p></div>}
                  {registration.created_at && (
                    <div><span className="text-muted-foreground text-xs">Data do cadastro</span>
                      <p className="font-medium">{new Date(registration.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                    </div>
                  )}
                </div>
                {registration.roles?.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs">Funções solicitadas</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {registration.roles.map(r => <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          <div className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" value={editData.name} onChange={(e) => setEditData(p => ({ ...p, name: e.target.value }))} />
            </div>

            {/* Email (SuperAdmin only, edit mode) */}
            {!isApproval && isSuperAdmin && member?.user_id && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Mail className="w-4 h-4" /> Email de Login
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="novo@email.com"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-10"
                    disabled={emailLoading || editEmail === member.email || !editEmail.includes('@')}
                    onClick={async () => {
                      try {
                        setEmailLoading(true);
                        const res = await axios.put(
                          `${API}/admin/users/${member.user_id}/email`,
                          { email: editEmail },
                          { withCredentials: true }
                        );
                        toast.success(res.data.message);
                      } catch (err) {
                        toast.error(err.response?.data?.detail || "Erro ao alterar email");
                      } finally {
                        setEmailLoading(false);
                      }
                    }}
                  >
                    {emailLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <>Alterar Email</>
                    }
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Altera o email de login deste usuário em todos os sistemas.
                </p>
              </div>
            )}

            {/* Telefone (edição) */}
            {!isApproval && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input id="edit-phone" value={editData.phone} onChange={(e) => setEditData(p => ({ ...p, phone: e.target.value }))} />
              </div>
            )}

            {/* Instituição */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-institution">Instituição</Label>
              <Input id="edit-institution" value={editData.institution} onChange={(e) => setEditData(p => ({ ...p, institution: e.target.value }))} />
            </div>

            {/* ===== ORGANIZAÇÕES (multi-select dropdown) ===== */}
            {entities.length > 0 && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" /> Organizações
                </Label>
                {loadingEntities ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                  </div>
                ) : (
                  <MultiSelectDropdown
                    options={entityOptions}
                    selected={selectedEntityIds}
                    onChange={setSelectedEntityIds}
                    placeholder="Selecione as organizações..."
                  />
                )}
              </div>
            )}

            {/* ===== FUNÇÕES / CARGOS (multi-select dropdown) ===== */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" /> Funções / Cargos
              </Label>
              <MultiSelectDropdown
                options={availableRoles}
                selected={editData.roles}
                onChange={(roles) => setEditData(p => ({ ...p, roles }))}
                placeholder="Selecione as funções..."
              />
            </div>

            {/* ===== SETORES (multi-select) ===== */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Building2 className="w-4 h-4" /> Setores
              </Label>
              <MultiSelectDropdown
                options={availableDepts}
                selected={editData.departments}
                onChange={(departments) => setEditData(p => ({ ...p, departments, department: departments[0] || "" }))}
                placeholder="Selecione os setores..."
              />
            </div>

            {/* Admin e Votação */}
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Checkbox id="is-admin-check" checked={editData.is_admin}
                onCheckedChange={(c) => setEditData(p => ({ ...p, is_admin: !!c }))} />
              <label htmlFor="is-admin-check" className="cursor-pointer flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-amber-500" /> Tornar administrador
              </label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Checkbox id="can-vote-check" checked={editData.can_vote}
                onCheckedChange={(c) => setEditData(p => ({ ...p, can_vote: !!c }))} />
              <label htmlFor="can-vote-check" className="cursor-pointer flex items-center gap-2 text-sm">
                <Vote className="w-4 h-4 text-blue-500" /> Pode votar nas aprovações
              </label>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              ⓘ Essas permissões se aplicam apenas à organização atual. Para alterar em outra organização, troque a organização no menu lateral e edite o membro novamente.
            </p>

            {/* Redefinir Senha (apenas edição, não aprovação) */}
            {!isApproval && member?.user_id && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <KeyRound className="w-4 h-4" /> {member?.user_id ? "Redefinir Senha" : "Criar Acesso / Definir Senha"}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Nova senha..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetPassword}
                      disabled={passwordLoading || !newPassword}
                      className="shrink-0 h-10"
                    >
                      {passwordLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><KeyRound className="w-4 h-4 mr-1" /> Redefinir</>
                      }
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {member?.user_id
                      ? "A nova senha será aplicada imediatamente."
                      : "Será criada uma conta de login para este membro com a senha definida."}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}
            className={isApproval ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              : isApproval
                ? <><Check className="w-4 h-4 mr-2" />Aprovar Cadastro</>
                : <><Check className="w-4 h-4 mr-2" />Salvar Alterações</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ PÁGINA PRINCIPAL ============
export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [showPending, setShowPending] = useState(true);
  const [activeTab, setActiveTab] = useState("org");

  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [editRegistration, setEditRegistration] = useState(null);
  const [editMode, setEditMode] = useState("edit");
  const [entities, setEntities] = useState([]);
  const [entityConfig, setEntityConfig] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [allBadges, setAllBadges] = useState({});

  // Create member dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    name: "", email: "", password: "", phone: "", institution: "",
    roles: [], department: "", departments: [], is_admin: false, can_vote: false
  });
  const [createLoading, setCreateLoading] = useState(false);

  const handleCreateMember = async () => {
    if (!createData.name.trim() || !createData.email.trim()) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    if (!createData.password || createData.password.length < 4) {
      toast.error("A senha deve ter pelo menos 4 caracteres");
      return;
    }
    if (createData.roles.length === 0) {
      toast.error("Selecione pelo menos uma função");
      return;
    }
    if (createData.departments.length === 0) {
      toast.error("Selecione pelo menos um setor");
      return;
    }
    try {
      setCreateLoading(true);
      const submitData = { ...createData, department: createData.departments[0] || "" };
      await axios.post(`${API}/members`, submitData, { withCredentials: true });
      toast.success(`Membro ${createData.name} criado com sucesso!`);
      setCreateOpen(false);
      setCreateData({ name: "", email: "", password: "", phone: "", institution: "", roles: [], department: "", departments: [], is_admin: false, can_vote: false });
      fetchMembers();
      if (currentUser?.is_superadmin) fetchAllMembers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao criar membro");
    } finally {
      setCreateLoading(false);
    }
  };

  const createBaseRoles = entityConfig?.custom_roles || ["Operador", "Editor", "Câmera", "Sonoplastia", "Mídias Sociais"];
  const createBaseDepts = entityConfig?.custom_departments || ["Produção", "Conteúdo", "Desenvolvimento"];

  useEffect(() => { fetchMembers(); fetchCurrentUser(); fetchBadges(); }, []);

  const fetchBadges = async () => {
    try { setAllBadges((await axios.get(`${API}/gamification/badges`, { withCredentials: true })).data); }
    catch { /* badges are optional, fail silently */ }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setCurrentUser(res.data);
      if (res.data.is_admin || res.data.is_superadmin) {
        fetchPendingRegistrations();
        fetchEntities();
        fetchEntityConfig();
      }
      if (res.data.is_superadmin) fetchAllMembers();
    } catch (err) { console.error("Error fetching current user:", err); }
  };

  const fetchEntities = async () => {
    try { setEntities((await axios.get(`${API}/entities/all`, { withCredentials: true })).data); }
    catch { try { setEntities((await axios.get(`${API}/entities`, { withCredentials: true })).data); } catch { } }
  };

  const fetchEntityConfig = async () => {
    try { setEntityConfig((await axios.get(`${API}/entities/current/config`, { withCredentials: true })).data); } catch { }
  };

  const fetchPendingRegistrations = async () => {
    try {
      setPendingLoading(true);
      setPendingRegistrations((await axios.get(`${API}/auth/pending-registrations`, { withCredentials: true })).data);
    } catch { } finally { setPendingLoading(false); }
  };

  const fetchMembers = async () => {
    try { setMembers((await axios.get(`${API}/members`, { withCredentials: true })).data); }
    catch { toast.error("Erro ao carregar membros"); }
    finally { setLoading(false); }
  };

  const fetchAllMembers = async () => {
    try { setAllMembers((await axios.get(`${API}/admin/members/all`, { withCredentials: true })).data); }
    catch (err) { console.error("Error fetching all members:", err); }
  };

  const handleReviewRegistration = (reg) => {
    setEditRegistration(reg); setEditMember(null); setEditMode("approve"); setEditOpen(true);
  };

  const handleEditMember = (m) => {
    setEditMember(m); setEditRegistration(null); setEditMode("edit"); setEditOpen(true);
  };

  const handleSave = async (id, data, mode) => {
    try {
      setSaveLoading(true);
      if (mode === "approve") {
        await axios.post(`${API}/auth/approve-registration/${id}`, data, { withCredentials: true });
        toast.success("Cadastro aprovado com sucesso!");
        fetchPendingRegistrations();
        // Multi-org sync
        if (data.entity_ids && data.entity_ids.length > 1) {
          setTimeout(async () => {
            try {
              const reg = editRegistration;
              const membersRes = await axios.get(`${API}/members`, { withCredentials: true });
              const newMember = membersRes.data.find(m => m.email === reg.email);
              if (newMember) {
                await axios.put(`${API}/admin/members/${newMember.member_id}/entities`, { entity_ids: data.entity_ids }, { withCredentials: true });
              }
              fetchMembers();
              if (currentUser?.is_superadmin) fetchAllMembers();
            } catch { }
          }, 500);
        }
      } else {
        await axios.put(`${API}/members/${id}`, data, { withCredentials: true });
        toast.success("Membro atualizado com sucesso!");
        if (data.entity_ids) {
          try { await axios.put(`${API}/admin/members/${id}/entities`, { entity_ids: data.entity_ids }, { withCredentials: true }); } catch { }
        }
      }
      setEditOpen(false); setEditMember(null); setEditRegistration(null);
      fetchMembers();
      if (currentUser?.is_superadmin) fetchAllMembers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao salvar");
    } finally { setSaveLoading(false); }
  };

  const handleRejectRegistration = async (regId) => {
    if (!window.confirm("Tem certeza que deseja rejeitar este cadastro?")) return;
    try {
      setPendingLoading(true);
      await axios.post(`${API}/auth/reject-registration/${regId}`, {}, { withCredentials: true });
      toast.success("Cadastro rejeitado e removido");
      fetchPendingRegistrations();
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao rejeitar"); }
    finally { setPendingLoading(false); }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("Tem certeza que deseja remover este membro? Isso também removerá a conta de login associada.")) return;
    try {
      await axios.delete(`${API}/members/${memberId}`, { withCredentials: true });
      toast.success("Membro removido com sucesso!");
      fetchMembers();
      if (currentUser?.is_superadmin) fetchAllMembers();
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao remover membro"); }
  };

  const displayMembers = activeTab === "all" ? allMembers : members;
  
  // Extrair setores e funções únicos para os filtros
  const allDepartments = [...new Set(displayMembers.flatMap(m => {
    if (m.departments && m.departments.length > 0) return m.departments;
    return m.department ? [m.department] : [];
  }))].sort();
  const allRoles = [...new Set(displayMembers.flatMap(m => m.roles || []))].sort();
  
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  
  const filteredMembers = displayMembers.filter((m) => {
    // Filtro de busca textual
    const matchesSearch = !searchQuery || 
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activeTab === "all" && m.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filtro por setor
    const memberDepts = (m.departments && m.departments.length > 0) ? m.departments : (m.department ? [m.department] : []);
    const matchesDept = filterDepartment === "all" || memberDepts.includes(filterDepartment);
    
    // Filtro por função
    const matchesRole = filterRole === "all" || (m.roles || []).includes(filterRole);
    
    return matchesSearch && matchesDept && matchesRole;
  });

  if (loading) return <div className="p-8 text-center">Carregando membros...</div>;

  const isSuperAdmin = currentUser?.is_superadmin || currentUser?.role === "superadmin";
  const isAdmin = currentUser?.is_admin || isSuperAdmin;

  return (
    <div className="space-y-6 p-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Membros</h1>
          <p className="text-muted-foreground">Gerencie a equipe de mídia</p>
        </div>
        {isAdmin && (
          <Button onClick={() => {
            setCreateData({ name: "", email: "", password: "", phone: "", institution: "", roles: [], department: "", departments: [], is_admin: false, can_vote: false });
            setCreateOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Membro
          </Button>
        )}
      </div>

      {/* Abas SuperAdmin */}
      {isSuperAdmin && (
        <div className="flex border-b">
          <button className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "org" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`} onClick={() => setActiveTab("org")}>
            <Users className="w-4 h-4" /> Minha Organização
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{members.length}</Badge>
          </button>
          <button className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "all" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`} onClick={() => setActiveTab("all")}>
            <Globe className="w-4 h-4" /> Todas as Organizações
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{allMembers.length}</Badge>
          </button>
        </div>
      )}

      {/* Pendências */}
      {activeTab === "org" && isAdmin && pendingRegistrations.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setShowPending(!showPending)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" /> Solicitações de Cadastro
                <Badge variant="destructive" className="ml-1 px-2 py-0 text-xs">{pendingRegistrations.length}</Badge>
              </CardTitle>
              {showPending ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </CardHeader>
          {showPending && (
            <CardContent className="pt-0 px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingRegistrations.map((reg) => (
                  <PendingRegistrationCard key={reg.registration_id} registration={reg}
                    onReview={handleReviewRegistration} onReject={handleRejectRegistration} loading={pendingLoading} entities={entities} />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={activeTab === "all" ? "Buscar por nome, email ou organização..." : "Buscar por nome ou email..."}
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" autoComplete="off" name="members-search-filter" />
        </div>
        <div className="flex gap-2">
          {/* Filtro por Setor */}
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-[160px] h-10">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue placeholder="Todos os setores" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {allDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Filtro por Função */}
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[160px] h-10">
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue placeholder="Todas as funções" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              {allRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Botão limpar filtros */}
          {(filterDepartment !== "all" || filterRole !== "all") && (
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground"
              onClick={() => { setFilterDepartment("all"); setFilterRole("all"); }} title="Limpar filtros">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      {/* Indicador de filtros ativos */}
      {(filterDepartment !== "all" || filterRole !== "all") && (
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">Filtros ativos:</span>
          {filterDepartment !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1 py-0">
              <Building2 className="w-3 h-3" /> {filterDepartment}
              <button onClick={() => setFilterDepartment("all")} className="ml-0.5 hover:bg-muted-foreground/20 rounded-full p-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}
          {filterRole !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1 py-0">
              <Briefcase className="w-3 h-3" /> {filterRole}
              <button onClick={() => setFilterRole("all")} className="ml-0.5 hover:bg-muted-foreground/20 rounded-full p-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}
          <span className="text-muted-foreground">({filteredMembers.length} membro{filteredMembers.length !== 1 ? 's' : ''})</span>
        </div>
      )}

      {filteredMembers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum membro encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((m) => (
            <MemberCard key={m.member_id} member={m}
              onDelete={isAdmin ? handleDeleteMember : undefined}
              onEdit={isAdmin ? handleEditMember : undefined}
              showEntity={activeTab === "all"}
              allBadges={allBadges} />
          ))}
        </div>
      )}

      <MemberEditDialog open={editOpen} onOpenChange={setEditOpen} member={editMember} registration={editRegistration}
        entities={entities} entityConfig={entityConfig} onSave={handleSave} loading={saveLoading} mode={editMode} isSuperAdmin={isSuperAdmin} />

      {/* Create Member Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Cadastrar Novo Membro
            </DialogTitle>
            <DialogDescription>
              Cadastre um membro diretamente com acesso ao sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={createData.name} onChange={(e) => setCreateData(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input value={createData.email} onChange={(e) => setCreateData(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label>Senha de acesso *</Label>
              <Input value={createData.password} onChange={(e) => setCreateData(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 4 caracteres" type="text" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={createData.phone} onChange={(e) => setCreateData(p => ({ ...p, phone: e.target.value }))} placeholder="(27) 99999-9999" />
              </div>
              <div className="space-y-1.5">
                <Label>Instituição</Label>
                <Input value={createData.institution} onChange={(e) => setCreateData(p => ({ ...p, institution: e.target.value }))} placeholder="Igreja/Empresa" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> Funções / Cargos *</Label>
              <MultiSelectDropdown
                options={createBaseRoles}
                selected={createData.roles}
                onChange={(roles) => setCreateData(p => ({ ...p, roles }))}
                placeholder="Selecione as funções..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Building2 className="w-4 h-4" /> Setores *
              </Label>
              <MultiSelectDropdown
                options={createBaseDepts}
                selected={createData.departments}
                onChange={(departments) => setCreateData(p => ({ ...p, departments, department: departments[0] || "" }))}
                placeholder="Selecione os setores..."
              />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Checkbox id="create-admin" checked={createData.is_admin}
                onCheckedChange={(c) => setCreateData(p => ({ ...p, is_admin: !!c }))} />
              <label htmlFor="create-admin" className="cursor-pointer flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-amber-500" /> Tornar administrador
              </label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Checkbox id="create-vote" checked={createData.can_vote}
                onCheckedChange={(c) => setCreateData(p => ({ ...p, can_vote: !!c }))} />
              <label htmlFor="create-vote" className="cursor-pointer flex items-center gap-2 text-sm">
                <Vote className="w-4 h-4 text-blue-500" /> Pode votar nas aprovações
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>Cancelar</Button>
            <Button onClick={handleCreateMember} disabled={createLoading} className="bg-green-600 hover:bg-green-700 text-white">
              {createLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</>
                : <><UserPlus className="w-4 h-4 mr-2" />Cadastrar Membro</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
