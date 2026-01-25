import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Trophy,
  Medal,
  Star,
  Flame,
  Crown,
  Target,
  Zap,
  Award
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const levelColors = {
  1: "from-gray-400 to-gray-500",
  2: "from-green-400 to-green-500",
  3: "from-blue-400 to-blue-500",
  4: "from-purple-400 to-purple-500",
  5: "from-yellow-400 to-yellow-500",
  6: "from-orange-400 to-orange-500",
  7: "from-red-400 to-red-500",
  8: "from-pink-400 to-pink-500",
  9: "from-indigo-400 to-indigo-500",
  10: "from-amber-400 to-amber-600"
};

const levelNames = {
  1: "Iniciante",
  2: "Aprendiz",
  3: "Colaborador",
  4: "Dedicado",
  5: "Experiente",
  6: "Avançado",
  7: "Expert",
  8: "Mestre",
  9: "Lenda",
  10: "Supremo"
};

const pointsToNextLevel = {
  1: 50,
  2: 150,
  3: 300,
  4: 500,
  5: 750,
  6: 1000,
  7: 1500,
  8: 2000,
  9: 3000,
  10: 999999
};

const getRankIcon = (rank) => {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
};

const BadgeCard = ({ badgeId, badge, earned }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`p-4 rounded-xl border-2 transition-all duration-200 ${
            earned
              ? "border-primary bg-primary/5 hover:bg-primary/10"
              : "border-dashed border-muted-foreground/30 bg-muted/30 opacity-50"
          }`}
          data-testid={`badge-${badgeId}`}
        >
          <div className="text-4xl mb-2 text-center">{badge.icon}</div>
          <h4 className={`font-semibold text-sm text-center ${earned ? "" : "text-muted-foreground"}`}>
            {badge.name}
          </h4>
          {earned && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <Star className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-muted-foreground">+{badge.points}</span>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{badge.name}</p>
        <p className="text-sm text-muted-foreground">{badge.description}</p>
        {!earned && <p className="text-xs text-primary mt-1">🔒 Não conquistado</p>}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const LeaderboardCard = ({ member, rank }) => (
  <div
    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
      rank <= 3 ? "bg-gradient-to-r from-primary/5 to-transparent border-primary/20" : ""
    }`}
    data-testid={`leaderboard-${member.member_id}`}
  >
    <div className="w-10 flex justify-center">
      {getRankIcon(rank)}
    </div>
    <Avatar className="w-12 h-12 border-2 border-primary/20">
      <AvatarImage src={member.picture} />
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {member.name?.charAt(0) || "?"}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold truncate">{member.name}</h4>
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className={`bg-gradient-to-r ${levelColors[member.level || 1]} text-white border-0`}
        >
          Nível {member.level || 1}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {levelNames[member.level || 1]}
        </span>
      </div>
    </div>
    <div className="text-right">
      <div className="flex items-center gap-1 text-lg font-bold text-primary">
        <Zap className="w-5 h-5" />
        {member.points || 0}
      </div>
      <span className="text-xs text-muted-foreground">pontos</span>
    </div>
  </div>
);

export default function GamificationPage() {
  const [myStats, setMyStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [allBadges, setAllBadges] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, leaderboardRes, badgesRes] = await Promise.all([
        axios.get(`${API}/gamification/my-stats`, { withCredentials: true }),
        axios.get(`${API}/gamification/leaderboard`, { withCredentials: true }),
        axios.get(`${API}/gamification/badges`, { withCredentials: true })
      ]);

      setMyStats(statsRes.data);
      setLeaderboard(leaderboardRes.data);
      setAllBadges(badgesRes.data);
    } catch (error) {
      console.error("Error fetching gamification data:", error);
      toast.error("Erro ao carregar dados de gamificação");
    } finally {
      setLoading(false);
    }
  };

  const currentLevelPoints = myStats?.level ? (pointsToNextLevel[myStats.level - 1] || 0) : 0;
  const nextLevelPoints = myStats?.level ? pointsToNextLevel[myStats.level] : 50;
  const progressToNextLevel = myStats
    ? ((myStats.points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100
    : 0;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="gamification-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="gamification-page">
      {/* Header */}
      <div>
        <h1 className="font-outfit text-3xl font-bold text-foreground flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          Gamificação
        </h1>
        <p className="text-muted-foreground mt-1">
          Conquiste medalhas e suba no ranking interagindo com o sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Stats Card */}
        <Card className="lg:col-span-1" data-testid="my-stats-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-outfit flex items-center gap-2">
              <Target className="w-5 h-5" />
              Seu Progresso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Level Display */}
            <div className="text-center">
              <div
                className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${
                  levelColors[myStats?.level || 1]
                } flex items-center justify-center shadow-lg`}
              >
                <span className="text-4xl font-bold text-white">{myStats?.level || 1}</span>
              </div>
              <h3 className="font-outfit text-xl font-bold mt-3">
                {levelNames[myStats?.level || 1]}
              </h3>
              <p className="text-muted-foreground text-sm">Nível {myStats?.level || 1}</p>
            </div>

            {/* Points & Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pontos</span>
                <span className="font-bold text-primary flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  {myStats?.points || 0}
                </span>
              </div>
              <Progress value={Math.min(progressToNextLevel, 100)} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                {nextLevelPoints - (myStats?.points || 0)} pontos para o próximo nível
              </p>
            </div>

            {/* Rank */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">Sua posição</span>
              <div className="flex items-center gap-2">
                {getRankIcon(myStats?.rank || 0)}
                <span className="font-bold text-lg">#{myStats?.rank || "-"}</span>
              </div>
            </div>

            {/* Badges Count */}
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
              <span className="text-muted-foreground flex items-center gap-2">
                <Award className="w-4 h-4" />
                Medalhas
              </span>
              <span className="font-bold text-lg">
                {myStats?.badges?.length || 0}/{Object.keys(allBadges).length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard & Badges */}
        <Card className="lg:col-span-2" data-testid="leaderboard-card">
          <Tabs defaultValue="leaderboard">
            <CardHeader className="pb-0">
              <TabsList className="w-full">
                <TabsTrigger value="leaderboard" className="flex-1" data-testid="tab-leaderboard">
                  <Trophy className="w-4 h-4 mr-2" />
                  Ranking
                </TabsTrigger>
                <TabsTrigger value="badges" className="flex-1" data-testid="tab-badges">
                  <Medal className="w-4 h-4 mr-2" />
                  Medalhas
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="leaderboard" className="mt-0 space-y-3">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum participante ainda</p>
                  </div>
                ) : (
                  leaderboard.map((member, index) => (
                    <LeaderboardCard
                      key={member.member_id}
                      member={member}
                      rank={index + 1}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="badges" className="mt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(allBadges).map(([badgeId, badge]) => (
                    <BadgeCard
                      key={badgeId}
                      badgeId={badgeId}
                      badge={badge}
                      earned={myStats?.badges?.includes(badgeId)}
                    />
                  ))}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* How to Earn Points */}
      <Card data-testid="how-to-earn-card">
        <CardHeader>
          <CardTitle className="font-outfit flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Como Ganhar Pontos
          </CardTitle>
          <CardDescription>
            Interaja com o sistema para subir no ranking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl mb-2">✅</div>
              <h4 className="font-semibold text-green-700">Confirmar Presença</h4>
              <p className="text-sm text-green-600">+10 pontos por escala</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl mb-2">🗳️</div>
              <h4 className="font-semibold text-blue-700">Votar em Conteúdo</h4>
              <p className="text-sm text-blue-600">+5 pontos por voto</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl mb-2">🎨</div>
              <h4 className="font-semibold text-purple-700">Enviar Conteúdo</h4>
              <p className="text-sm text-purple-600">+15 pontos + 50 se aprovado</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl mb-2">🔗</div>
              <h4 className="font-semibold text-orange-700">Adicionar Links</h4>
              <p className="text-sm text-orange-600">+10 pontos por link</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
