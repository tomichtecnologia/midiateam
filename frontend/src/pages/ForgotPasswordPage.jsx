import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSuccess(true);
      toast.success("Instruções enviadas!");
    } catch (error) {
      // Não revelamos se o email existe ou não
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background" data-testid="forgot-password-success">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="font-outfit text-2xl font-bold text-foreground mb-2">
              Verifique seu email
            </h2>
            <p className="text-muted-foreground mb-6">
              Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background" data-testid="forgot-password-page">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {/* Back Button */}
          <Link to="/login" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para login
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <span className="font-outfit text-xl font-bold">Mídia Team</span>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-outfit text-2xl md:text-3xl font-bold text-foreground">
                Esqueceu a senha?
              </h2>
              <p className="text-muted-foreground mt-2">
                Digite seu email para receber instruções de recuperação
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="forgot-email-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12"
                disabled={loading}
                data-testid="forgot-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar instruções"
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                Lembrou a senha?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Faça login
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
