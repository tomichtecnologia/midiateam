import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Video, Users, Calendar } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

export default function LoginPage() {
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
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
              <span className="font-outfit text-2xl font-bold">Tomich Gestão de Mídia</span>
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
              <span className="font-outfit text-xl font-bold">Tomich Gestão de Mídia</span>
            </div>

            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h2 className="font-outfit text-2xl md:text-3xl font-bold text-foreground">
                  Bem-vindo de volta
                </h2>
                <p className="text-muted-foreground mt-2">
                  Entre com sua conta Google para continuar
                </p>
              </div>

              <Button
                className="w-full h-14 text-base font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
                onClick={handleGoogleLogin}
                data-testid="google-login-btn"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Entrar com Google
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>Tomich Gestão de Mídia</p>
                <p className="mt-1">Sistema de Gerenciamento de Mídia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
