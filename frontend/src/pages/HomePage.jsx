import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Video, Users, Calendar, CheckCircle, Shield, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <span className="font-outfit text-xl font-bold">Mídia Team</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" data-testid="header-login-btn">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button data-testid="header-register-btn">Cadastrar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Shield className="w-4 h-4" />
                Sistema completo de gestão
              </div>
              <h1 className="font-outfit text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                Gerencie sua equipe de mídia com{" "}
                <span className="text-primary">facilidade</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Sistema completo para escalas, aprovação de conteúdo e organização 
                da produção de mídia da sua igreja ou organização.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto" data-testid="hero-register-btn">
                    Começar agora
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="hero-login-btn">
                    Já tenho conta
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl transform rotate-3"></div>
                <img
                  src="https://images.unsplash.com/photo-1764068866740-506ba4cf64e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHwxfHxicm9hZGNhc3QlMjBzdHVkaW8lMjBtZWRpYSUyMHByb2R1Y3Rpb24lMjBwcm9mZXNzaW9uYWx8ZW58MHx8fHwxNzcxMDE4MTY1fDA&ixlib=rb-4.1.0&q=85&w=600"
                  alt="Media Production"
                  className="relative rounded-3xl shadow-2xl w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="font-outfit text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ferramentas completas para gerenciar sua equipe de mídia de forma eficiente
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-background rounded-2xl p-6 shadow-sm border">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-outfit text-xl font-semibold mb-2">Escalas Integradas</h3>
              <p className="text-muted-foreground">
                Crie escalas com recorrência, confirmação de presença e sistema de substituição.
              </p>
            </div>

            <div className="bg-background rounded-2xl p-6 shadow-sm border">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-outfit text-xl font-semibold mb-2">Aprovação de Conteúdo</h3>
              <p className="text-muted-foreground">
                Sistema de votação para aprovar artes, vídeos e outros conteúdos da equipe.
              </p>
            </div>

            <div className="bg-background rounded-2xl p-6 shadow-sm border">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-outfit text-xl font-semibold mb-2">Gestão de Equipe</h3>
              <p className="text-muted-foreground">
                Cadastre membros, atribua funções e acompanhe o desempenho da equipe.
              </p>
            </div>

            <div className="bg-background rounded-2xl p-6 shadow-sm border">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-outfit text-xl font-semibold mb-2">Produção de Conteúdo</h3>
              <p className="text-muted-foreground">
                Acompanhe a criação de conteúdo e gerencie responsabilidades delegadas.
              </p>
            </div>

            <div className="bg-background rounded-2xl p-6 shadow-sm border">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-outfit text-xl font-semibold mb-2">Multi-Entidade</h3>
              <p className="text-muted-foreground">
                Gerencie múltiplas igrejas ou equipes com dados isolados e seguros.
              </p>
            </div>

            <div className="bg-background rounded-2xl p-6 shadow-sm border">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Play className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-outfit text-xl font-semibold mb-2">Gamificação</h3>
              <p className="text-muted-foreground">
                Sistema de pontos, medalhas e ranking para engajar sua equipe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="font-outfit text-3xl md:text-4xl font-bold text-foreground mb-4">
            Pronto para começar?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Cadastre-se gratuitamente e comece a gerenciar sua equipe de mídia hoje mesmo.
          </p>
          <Link to="/register">
            <Button size="lg" data-testid="cta-register-btn">
              Criar minha conta
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-white" />
              </div>
              <span className="font-outfit font-semibold">Mídia Team</span>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              <p>Desenvolvido por <span className="font-semibold text-foreground">Tomich Tecnologia</span></p>
              <p className="mt-1">© {new Date().getFullYear()} Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
