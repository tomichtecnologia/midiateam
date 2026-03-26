import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Play, ArrowLeft, Loader2, CheckCircle, Briefcase, Building2, Church, Search, X, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { cn } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

// ============ SEARCHABLE MULTI-SELECT ============
function SearchableMultiSelect({ options, selected, onChange, placeholder, searchPlaceholder, emptyMessage, icon: Icon, renderOption }) {
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-auto min-h-[40px] py-2"
        >
          <div className="flex flex-wrap gap-1.5 flex-1 text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            ) : (
              selected.map((val) => {
                const label = renderOption ? renderOption(val) : val;
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="text-xs px-2 py-0.5 gap-1 shrink-0"
                  >
                    {label}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors"
                      onClick={(e) => handleRemove(val, e)}
                    />
                  </Badge>
                );
              })
            )}
          </div>
          <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder || "Pesquisar..."} />
          <CommandList>
            <CommandEmpty>{emptyMessage || "Nenhum item encontrado."}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const value = typeof option === "string" ? option : option.value;
                const label = typeof option === "string" ? option : option.label;
                const description = typeof option === "object" ? option.description : null;
                const isSelected = selected.includes(value);

                return (
                  <CommandItem
                    key={value}
                    value={label}
                    onSelect={() => handleToggle(value)}
                    className="cursor-pointer"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border mr-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{label}</span>
                      {description && (
                        <span className="text-xs text-muted-foreground block">{description}</span>
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

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registrationOptions, setRegistrationOptions] = useState({ roles: [], departments: [] });
  const [availableEntities, setAvailableEntities] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    roles: [],
    department: "",
    selectedEntities: [],
  });

  useEffect(() => {
    // Buscar opções de cargo e setor da entidade configurada no admin
    axios.get(`${API}/auth/registration-options`)
      .then(res => {
        setRegistrationOptions(res.data);
        // Se tiver departamentos, selecionar o primeiro como padrão
        if (res.data.departments?.length > 0) {
          setFormData(prev => ({ ...prev, department: res.data.departments[0] }));
        }
      })
      .catch(err => {
        console.error("Erro ao carregar opções de cadastro:", err);
        // Fallback com opções padrão em português
        const fallback = {
          roles: ["Operador", "Editor", "Câmera", "Sonoplastia", "Mídias Sociais"],
          departments: ["Produção", "Conteúdo", "Desenvolvimento"],
        };
        setRegistrationOptions(fallback);
        setFormData(prev => ({ ...prev, department: fallback.departments[0] }));
      });

    // Buscar entidades disponíveis para seleção
    axios.get(`${API}/auth/available-entities`)
      .then(res => {
        setAvailableEntities(res.data);
      })
      .catch(err => {
        console.error("Erro ao carregar entidades:", err);
      });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRolesChange = (newRoles) => {
    setFormData(prev => ({ ...prev, roles: newRoles }));
  };

  const handleEntitiesChange = (newEntities) => {
    setFormData(prev => ({ ...prev, selectedEntities: newEntities }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim();

    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas digitadas não são iguais. Verifique e tente novamente.");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("A senha é muito curta. Use pelo menos 6 caracteres.");
      return;
    }

    if (formData.roles.length === 0) {
      toast.error("Selecione pelo menos um cargo/função.");
      return;
    }

    if (!formData.department) {
      toast.error("Selecione um setor.");
      return;
    }

    if (availableEntities.length > 0 && formData.selectedEntities.length === 0) {
      toast.error("Selecione pelo menos uma organização.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        name: name,
        email: email,
        phone: formData.phone || null,
        password: formData.password,
        roles: formData.roles,
        department: formData.department,
        requested_entities: formData.selectedEntities,
      });

      // Se foi auto-aprovado (primeiro usuário), redireciona para login
      if (response.data.auto_approved) {
        toast.success("Conta de administrador criada! Faça login para continuar.");
        navigate("/login");
        return;
      }

      setSuccess(true);
      toast.success("Cadastro enviado com sucesso!");
    } catch (error) {
      console.error("Erro no cadastro:", error);
      const message = error.response?.data?.detail || error.message || "Erro ao enviar cadastro";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background" data-testid="register-success">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-outfit text-2xl font-bold text-foreground mb-2">
              Cadastro Enviado!
            </h2>
            <p className="text-muted-foreground mb-2">
              Seu cadastro foi enviado para aprovação dos administradores
              {formData.selectedEntities.length > 0 && (
                <> das organizações selecionadas</>
              )}.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Você receberá uma notificação quando for aprovado e poderá fazer login.
            </p>
            <Link to="/login">
              <Button className="w-full" data-testid="back-to-login-btn">
                Voltar para Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" data-testid="register-page">
      {/* Left Side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1764068866740-506ba4cf64e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHwxfHxicm9hZGNhc3QlMjBzdHVkaW8lMjBtZWRpYSUyMHByb2R1Y3Rpb24lMjBwcm9mZXNzaW9uYWx8ZW58MHx8fHwxNzcxMDE4MTY1fDA&ixlib=rb-4.1.0&q=85')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/90 to-primary/80" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Play className="w-6 h-6" />
              </div>
              <span className="font-outfit text-2xl font-bold">Mídia Team</span>
            </div>
            <h1 className="font-outfit text-4xl md:text-5xl font-bold leading-tight">
              Junte-se à equipe
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              Crie sua conta e comece a fazer parte da equipe de mídia.
              Após o cadastro, um administrador irá aprovar seu acesso.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-lg my-4">
          <CardContent className="p-8">
            {/* Back Button */}
            <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <span className="font-outfit text-xl font-bold">Mídia Team</span>
            </div>

            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h2 className="font-outfit text-2xl md:text-3xl font-bold text-foreground">
                  Criar conta
                </h2>
                <p className="text-muted-foreground mt-2">
                  Preencha seus dados para solicitar acesso
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    data-testid="register-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    data-testid="register-email-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={handleChange}
                    data-testid="register-phone-input"
                  />
                </div>

                {/* Organizações / Entidades - Multi-select pesquisável */}
                {availableEntities.length > 0 && (
                  <div className="space-y-2" data-testid="entity-select-section">
                    <Label className="flex items-center gap-2">
                      <Church className="w-4 h-4 text-muted-foreground" />
                      Organizações
                    </Label>
                    <p className="text-xs text-muted-foreground -mt-1">
                      Selecione as organizações que deseja participar
                    </p>
                    <SearchableMultiSelect
                      options={availableEntities.map(e => ({
                        value: e.entity_id,
                        label: e.name,
                        description: e.description || null,
                      }))}
                      selected={formData.selectedEntities}
                      onChange={handleEntitiesChange}
                      placeholder="Selecione organizações..."
                      searchPlaceholder="Pesquisar organização..."
                      emptyMessage="Nenhuma organização encontrada."
                      icon={Church}
                      renderOption={(val) => {
                        const ent = availableEntities.find(e => e.entity_id === val);
                        return ent?.name || val;
                      }}
                    />
                    {formData.selectedEntities.length === 0 && (
                      <p className="text-xs text-amber-600">Selecione pelo menos uma organização</p>
                    )}
                  </div>
                )}

                {/* Cargo / Função - Multi-select pesquisável */}
                <div className="space-y-2" data-testid="role-select-section">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    Cargo / Função
                  </Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Selecione uma ou mais funções que você exerce
                  </p>
                  <SearchableMultiSelect
                    options={registrationOptions.roles}
                    selected={formData.roles}
                    onChange={handleRolesChange}
                    placeholder="Selecione funções..."
                    searchPlaceholder="Pesquisar função..."
                    emptyMessage="Nenhuma função encontrada."
                    icon={Briefcase}
                  />
                  {formData.roles.length === 0 && (
                    <p className="text-xs text-amber-600">Selecione pelo menos um cargo</p>
                  )}
                </div>

                {/* Setor / Departamento - Puxado das configurações do admin */}
                <div className="space-y-2">
                  <Label htmlFor="department">Setor</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger id="department" data-testid="register-department-select">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {registrationOptions.departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    data-testid="register-password-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Repita a senha"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    data-testid="register-confirm-password-input"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={loading}
                  data-testid="register-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Solicitar cadastro"
                  )}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Já tem uma conta?{" "}
                  <Link to="/login" className="text-primary hover:underline" data-testid="login-link">
                    Faça login
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
