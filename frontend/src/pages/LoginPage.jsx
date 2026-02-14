import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Video, Users, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/auth/login`,
        formData,
        { withCredentials: true }
      );

      if (response.data) {
        toast.success("Login realizado com sucesso!");
        navigate("/dashboard", { state: { user: response.data.user } });
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Erro ao fazer login";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
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
              Gerencie sua equipe
              <br />
              de mídia com facilidade
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              Sistema completo para escalas, aprovação de conteúdo e
              organização da produção de mídia da sua igreja.
            </p>
            <div className="flex gap-6 pt-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Gestão de Equipe</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span>Escalas Integradas</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <span>Produção de Conteúdo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-lg">
          <CardContent className="p-8">
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
                  Bem-vindo de volta
                </h2>
                <p className="text-muted-foreground mt-2">
                  Entre com seu email e senha para continuar
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    data-testid="login-email-input"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary hover:underline"
                      data-testid="forgot-password-link"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    data-testid="login-password-input"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Não tem uma conta?{" "}
                  <Link to="/register" className="text-primary hover:underline" data-testid="register-link">
                    Solicite cadastro
                  </Link>
                </p>
              </div>

              <div className="text-center text-sm text-muted-foreground border-t pt-4">
                <p>Mídia Team</p>
                <p className="mt-1">Sistema de Gerenciamento de Mídia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
