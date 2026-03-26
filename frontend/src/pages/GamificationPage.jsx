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
  Award,
  TrendingUp,
  Users,
  ChevronRight,
  Sparkles,
  CalendarDays,
  Infinity,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { getAvatarUrl } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

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

const levelBgColors = {
  1: "bg-gray-100 dark:bg-gray-900",
  2: "bg-green-50 dark:bg-green-950",
  3: "bg-blue-50 dark:bg-blue-950",
  4: "bg-purple-50 dark:bg-purple-950",
  5: "bg-yellow-50 dark:bg-yellow-950",
  6: "bg-orange-50 dark:bg-orange-950",
  7: "bg-red-50 dark:bg-red-950",
  8: "bg-pink-50 dark:bg-pink-950",
  9: "bg-indigo-50 dark:bg-indigo-950",
  10: "bg-amber-50 dark:bg-amber-950",
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
  10: "Supremo",
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
  10: 999999,
};

const pointsForLevel = {
  1: 0,
  2: 50,
  3: 150,
  4: 300,
  5: 500,
  6: 750,
  7: 1000,
  8: 1500,
  9: 2000,
  10: 3000,
};

// Badge category groupings for display
const badgeCategories = {
  "Escalas": ["schedule_confirmed", "schedule_5", "schedule_10", "schedule_25", "helper"],
  "Conteúdo": ["content_creator", "content_approved", "content_5_approved"],
  "Participação": ["first_login", "first_vote", "voter_10", "link_contributor", "ai_explorer"],
  "Níveis": ["level_5", "level_10"],
};

const getRankIcon = (rank) => {
  if (rank === 1) return <Crown className="w-7 h-7 text-yellow-500 drop-shadow-md" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
};

const getRankBg = (rank) => {
  if (rank === 1) return "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40 border-yellow-300 dark:border-yellow-800";
  if (rank === 2) return "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/40 dark:to-slate-950/40 border-gray-300 dark:border-gray-700";
  if (rank === 3) return "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 border-orange-300 dark:border-orange-800";
  return "";
};

// ============ BADGE CARD ============
const BadgeCard = ({ badgeId, badge, earned }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-default ${earned
            ? "border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-lg hover:scale-[1.03] hover:border-primary/60"
            : "border-dashed border-muted-foreground/20 bg-muted/20 opacity-40 hover:opacity-60"
            }`}
          data-testid={`badge-${badgeId}`}
        >
          {earned && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
              <Star className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="text-4xl mb-2 text-center select-none">{badge.icon}</div>
          <h4 className={`font-semibold text-xs text-center leading-tight ${earned ? "" : "text-muted-foreground"}`}>
            {badge.name}
          </h4>
          {earned && badge.points > 0 && (
            <div className="flex items-center justify-center gap-1 mt-1.5">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">+{badge.points}</span>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-semibold">{badge.name}</p>
        <p className="text-sm text-muted-foreground">{badge.description}</p>
        {!earned && <p className="text-xs text-primary mt-1 font-medium">🔒 Não conquistado ainda</p>}
        {earned && badge.points > 0 && <p className="text-xs text-green-600 mt-1">✅ +{badge.points} pontos ganhos</p>}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ============ LEADERBOARD CARD ============
const LeaderboardCard = ({ member, rank, allBadges, showMonthly }) => {
  const memberBadges = (member.badges || []).filter(b => allBadges[b]);
  const topBadges = memberBadges.slice(0, 5);
  const displayPoints = showMonthly ? (member.monthly_points || 0) : (member.points || 0);

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${getRankBg(rank)}`}
      data-testid={`leaderboard-${member.member_id}`}
    >
      {/* Rank */}
      <div className="w-10 flex justify-center shrink-0">
        {getRankIcon(rank)}
      </div>

      {/* Avatar with level ring */}
      <div className="relative shrink-0">
        <Avatar className={`w-12 h-12 border-2 ${rank <= 3 ? "border-primary/40" : "border-muted"}`}>
          <AvatarImage src={getAvatarUrl(member.picture)} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {member.name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        {/* Level badge on avatar */}
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${levelColors[member.level || 1]} flex items-center justify-center shadow-md border-2 border-background`}>
          <span className="text-[10px] font-bold text-white">{member.level || 1}</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold truncate text-sm">{member.name}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 bg-gradient-to-r ${levelColors[member.level || 1]} text-white border-0`}
          >
            {levelNames[member.level || 1]}
          </Badge>
        </div>
        {/* Badges strip */}
        {topBadges.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            {topBadges.map((bId) => (
              <TooltipProvider key={bId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm cursor-default hover:scale-125 transition-transform">
                      {allBadges[bId]?.icon}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {allBadges[bId]?.name}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {memberBadges.length > 5 && (
              <span className="text-[10px] text-muted-foreground font-medium ml-1">
                +{memberBadges.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Points */}
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 text-lg font-bold text-primary">
          <Zap className="w-5 h-5" />
          {displayPoints}
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {showMonthly ? "pts/mês" : "pontos"}
        </span>
        {showMonthly && (member.points || 0) > 0 && (
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Total: {member.points || 0}
          </p>
        )}
      </div>
    </div>
  );
};

// ============ "HOW TO EARN" ACTION CARD ============
const ActionCard = ({ emoji, title, description, gradient }) => (
  <div className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${gradient}`}>
    <div className="text-2xl mb-2">{emoji}</div>
    <h4 className="font-semibold text-sm">{title}</h4>
    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
  </div>
);

// ============ MAIN PAGE ============
export default function GamificationPage() {
  const [myStats, setMyStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState([]);
  const [allBadges, setAllBadges] = useState({});
  const [loading, setLoading] = useState(true);
  const [leaderboardView, setLeaderboardView] = useState("monthly"); // "monthly" or "alltime"

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, leaderboardRes, monthlyRes, badgesRes] = await Promise.all([
        axios.get(`${API}/gamification/my-stats`, { withCredentials: true }),
        axios.get(`${API}/gamification/leaderboard`, { withCredentials: true }),
        axios.get(`${API}/gamification/leaderboard/monthly`, { withCredentials: true }),
        axios.get(`${API}/gamification/badges`, { withCredentials: true }),
      ]);

      setMyStats(statsRes.data);
      setLeaderboard(leaderboardRes.data);
      setMonthlyLeaderboard(monthlyRes.data);
      setAllBadges(badgesRes.data);
    } catch (error) {
      console.error("Error fetching gamification data:", error);
      toast.error("Erro ao carregar dados de gamificação");
    } finally {
      setLoading(false);
    }
  };

  const currentLevelPoints = pointsForLevel[myStats?.level || 1] || 0;
  const nextLevelPoints = pointsToNextLevel[myStats?.level || 1] || 50;
  const myPoints = myStats?.points || 0;
  const progressToNextLevel = Math.min(
    ((myPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100,
    100
  );
  const earnedBadgesCount = myStats?.badges?.length || 0;
  const totalBadgesCount = Object.keys(allBadges).length;
  const myMonthlyPoints = myStats?.monthly_points || 0;
  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  if (loading) {
    return (
      <div className="space-y-6" data-testid="gamification-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-1" />
          <Skeleton className="h-80 lg:col-span-2" />
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
          Ranking & Conquistas
        </h1>
        <p className="text-muted-foreground mt-1">
          Conquiste medalhas, suba de nível e mostre sua evolução na equipe
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${levelColors[myStats?.level || 1]} flex items-center justify-center shadow-md`}>
              <span className="text-xl font-bold text-white">{myStats?.level || 1}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nível</p>
              <p className="font-bold text-lg leading-tight">{levelNames[myStats?.level || 1]}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pontos Totais</p>
              <p className="font-bold text-lg leading-tight">{myPoints}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-md">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground capitalize">Pts {currentMonth}</p>
              <p className="font-bold text-lg leading-tight">{myMonthlyPoints}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Medalhas</p>
              <p className="font-bold text-lg leading-tight">{earnedBadgesCount}<span className="text-sm font-normal text-muted-foreground">/{totalBadgesCount}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-md">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Posição</p>
              <p className="font-bold text-lg leading-tight">#{myStats?.rank || "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============ LEFT: MY PROGRESS ============ */}
        <Card className="lg:col-span-1" data-testid="my-stats-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-outfit flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              Meu Progresso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Level Display */}
            <div className="text-center">
              <div className="relative w-28 h-28 mx-auto">
                {/* Outer ring */}
                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" strokeWidth="8"
                    stroke="url(#levelGradient)"
                    strokeLinecap="round"
                    strokeDasharray={`${progressToNextLevel * 3.27} 327`}
                  />
                  <defs>
                    <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${levelColors[myStats?.level || 1]} flex items-center justify-center shadow-xl`}>
                    <span className="text-3xl font-bold text-white">{myStats?.level || 1}</span>
                  </div>
                </div>
              </div>
              <h3 className="font-outfit text-xl font-bold mt-3">
                {levelNames[myStats?.level || 1]}
              </h3>
              <p className="text-sm text-muted-foreground">
                {nextLevelPoints - myPoints > 0
                  ? `Faltam ${nextLevelPoints - myPoints} pontos para ${levelNames[Math.min((myStats?.level || 1) + 1, 10)]}`
                  : "Nível máximo alcançado! 🏆"
                }
              </p>
            </div>

            {/* XP Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">XP {myPoints - currentLevelPoints}</span>
                <span className="text-muted-foreground">{nextLevelPoints - currentLevelPoints}</span>
              </div>
              <div className="relative">
                <Progress value={progressToNextLevel} className="h-3" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white drop-shadow-sm">
                    {Math.round(progressToNextLevel)}%
                  </span>
                </div>
              </div>
            </div>

            {/* My Earned Badges */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Minhas Conquistas
              </h4>
              {earnedBadgesCount === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma conquista ainda. Continue interagindo! 💪
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(myStats?.badges || []).map((bId) => {
                    const b = allBadges[bId];
                    if (!b) return null;
                    return (
                      <TooltipProvider key={bId}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-10 h-10 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center hover:scale-110 transition-transform cursor-default">
                              <span className="text-xl">{b.icon}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ============ RIGHT: LEADERBOARD & BADGES ============ */}
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
                  Todas as Medalhas
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              {/* ---- Leaderboard Tab ---- */}
              <TabsContent value="leaderboard" className="mt-0 space-y-3">
                {/* Monthly / All-time toggle */}
                <div className="flex gap-2 p-1 rounded-lg bg-muted/50">
                  <button
                    type="button"
                    onClick={() => setLeaderboardView("monthly")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${leaderboardView === "monthly"
                      ? "bg-background shadow-sm text-primary border"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span className="capitalize">Mensal ({currentMonth})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardView("alltime")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${leaderboardView === "alltime"
                      ? "bg-background shadow-sm text-primary border"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <Infinity className="w-4 h-4" />
                    Total (Sempre)
                  </button>
                </div>

                {leaderboardView === "monthly" && monthlyLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma atividade este mês</p>
                    <p className="text-sm">Comece a interagir para liderar o ranking mensal!</p>
                  </div>
                ) : leaderboardView === "alltime" && leaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhum participante ainda</p>
                    <p className="text-sm">Comece a interagir para aparecer no ranking!</p>
                  </div>
                ) : (
                  (leaderboardView === "monthly" ? monthlyLeaderboard : leaderboard).map((member, index) => (
                    <LeaderboardCard
                      key={member.member_id}
                      member={member}
                      rank={index + 1}
                      allBadges={allBadges}
                      showMonthly={leaderboardView === "monthly"}
                    />
                  ))
                )}

                {leaderboardView === "monthly" && (
                  <p className="text-xs text-center text-muted-foreground pt-2 border-t">
                    🔄 Ranking mensal reseta no início de cada mês. Pontos totais nunca são perdidos.
                  </p>
                )}
              </TabsContent>

              {/* ---- Badges Tab ---- */}
              <TabsContent value="badges" className="mt-0 space-y-6">
                {Object.entries(badgeCategories).map(([category, badgeIds]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      {category}
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {badgeIds.map((badgeId) => {
                        const badge = allBadges[badgeId];
                        if (!badge) return null;
                        return (
                          <BadgeCard
                            key={badgeId}
                            badgeId={badgeId}
                            badge={badge}
                            earned={myStats?.badges?.includes(badgeId)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
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
            Como Ganhar Pontos e Medalhas
          </CardTitle>
          <CardDescription>
            Cada interação no sistema rende pontos. Suba de nível e conquiste todas as medalhas!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActionCard
              emoji="✅"
              title="Confirmar Presença"
              description="+10 pontos por escala confirmada"
              gradient="bg-green-50/80 dark:bg-green-950/30 border-green-200 dark:border-green-800"
            />
            <ActionCard
              emoji="🗳️"
              title="Votar em Conteúdo"
              description="+5 pontos por voto dado"
              gradient="bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
            />
            <ActionCard
              emoji="🎨"
              title="Enviar Conteúdo"
              description="+15 pts. Se aprovado: +50 pts!"
              gradient="bg-purple-50/80 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
            />
            <ActionCard
              emoji="🔗"
              title="Adicionar Links"
              description="+10 pontos por link útil"
              gradient="bg-orange-50/80 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
            />
            <ActionCard
              emoji="🤝"
              title="Substituir Colega"
              description="+40 pontos por substituição"
              gradient="bg-pink-50/80 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800"
            />
            <ActionCard
              emoji="🤖"
              title="Usar IA"
              description="+20 pontos na primeira vez"
              gradient="bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
            />
            <ActionCard
              emoji="⭐"
              title="Medalhas de Marco"
              description="Ganhe ao atingir marcos especiais"
              gradient="bg-yellow-50/80 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
            />
            <ActionCard
              emoji="🏆"
              title="Nível Supremo"
              description="Acumule 3000+ pts para nível 10"
              gradient="bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
