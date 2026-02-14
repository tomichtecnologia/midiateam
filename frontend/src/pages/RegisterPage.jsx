import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        password: formData.password,
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
      const message = error.response?.data?.detail || "Erro ao enviar cadastro";
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
            <p className="text-muted-foreground mb-6">
              Seu cadastro foi enviado para aprovação. Você receberá uma notificação quando for aprovado e poderá fazer login.
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-lg">
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
