import { useGetChallengeToday, useListChallengeAttempts, useStartChallenge } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Play, Calendar, TrendingUp } from "lucide-react";

export default function Challenge() {
  const { data: todayData, isLoading } = useGetChallengeToday();
  const { data: attempts } = useListChallengeAttempts();
  const startChallenge = useStartChallenge();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleStart = async () => {
    try {
      const result = await startChallenge.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["listChallengeAttempts"] });
      toast({ title: "Challenge started!", description: "Good luck!" });
      navigate(`/eval-runs/${result.evalRunId}?challenge=${result.id}`);
    } catch {
      toast({ title: "Error", description: "Failed to start challenge.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Trophy className="w-8 h-8 text-amber-500" aria-hidden="true" />
          Daily Challenge
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          One preset, picked for today. Run it, score it, beat your best.
        </p>
      </div>

      {todayData ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <Badge variant="secondary" className="text-[10px]">{todayData.date}</Badge>
            </div>
            <CardTitle className="text-lg font-semibold mt-2">{todayData.preset.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{todayData.preset.description}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] capitalize">{todayData.preset.category}</Badge>
              <span className="text-xs text-muted-foreground">
                Chunk {todayData.preset.defaultChunkSize} · Top-K {todayData.preset.defaultTopK} · {todayData.preset.defaultRetrieverType}
              </span>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleStart}
              disabled={startChallenge.isPending}
            >
              <Play className="w-4 h-4 mr-2" aria-hidden="true" />
              {startChallenge.isPending ? "Starting…" : "Start Challenge"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <p className="text-sm text-muted-foreground">No presets available for today's challenge.</p>
        </Card>
      )}

      {/* History */}
      {(attempts ?? []).length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              Your Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...(attempts ?? [])].reverse().map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => navigate(`/eval-runs/${a.evalRunId}?challenge=${a.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm">{a.challengeDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.score != null ? (
                      <Badge className="text-[10px] bg-amber-500/20 text-amber-400">
                        {a.score}/100
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Running</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
