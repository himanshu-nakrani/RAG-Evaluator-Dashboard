import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetArenaBattle,
  useFinalizeArenaBattle,
  useCreateHumanRating,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Trophy, CheckCheck, EyeOff } from "lucide-react";

export default function ArenaDetail() {
  const { id } = useParams<{ id: string }>();
  const battleId = Number(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createRating = useCreateHumanRating();
  const finalize = useFinalizeArenaBattle();
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState<"A" | "B" | "tie" | null>(null);

  const { data: battle, isLoading } = useGetArenaBattle(battleId, {
    query: {
      queryKey: ["getArenaBattle", battleId],
      enabled: !!battleId,
      refetchInterval: 2000,
    },
  });

  if (isLoading || !battle) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const isCompleted = battle.status === "completed";
  const isRevealed = revealed || battle.status === "completed" && !!battle.humanWinner;

  const handleVote = (winner: "A" | "B" | "tie") => {
    setRating(winner);
  };

  const handleFinalize = async () => {
    if (!rating) return;
    try {
      await finalize.mutateAsync({ id: battleId, data: { humanWinner: rating } });
      setRevealed(true);
      toast({ title: "Verdict submitted!", description: `Winner: ${rating === "tie" ? "Tie" : `System ${rating}`}` });
    } catch {
      toast({ title: "Error", description: "Failed to finalize.", variant: "destructive" });
    }
  };

  const blindAResults = battle.runABlind?.questionResults ?? [];
  const blindBResults = battle.runBBlind?.questionResults ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" aria-hidden="true" />
            {battle.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-[10px] ${battle.status === "running" ? "bg-blue-500/10 text-blue-400" : battle.status === "completed" ? "bg-green-500/10 text-green-400" : ""}`}>
              {battle.status}
            </Badge>
            {battle.metricWinner && (
              <span className="text-xs text-muted-foreground">
                Metric winner: <span className="font-semibold text-foreground">{battle.metricWinner}</span>
              </span>
            )}
          </div>
        </div>
        {isCompleted && !isRevealed && (
          <Button onClick={handleFinalize} disabled={!rating || finalize.isPending}>
            <CheckCheck className="w-4 h-4 mr-2" aria-hidden="true" />
            Submit Verdict
          </Button>
        )}
      </div>

      {/* Blind side-by-side */}
      {blindAResults.length > 0 || blindBResults.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {([
            { side: "A", results: blindAResults, exp: battle.expA },
            { side: "B", results: blindBResults, exp: battle.expB },
          ] as const).map(({ side, results, exp }) => (
            <div key={side} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-[10px]">{side}</Badge>
                  {isRevealed ? (
                    <span className="text-sm font-semibold">{exp?.name ?? `System ${side}`}</span>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      <EyeOff className="w-3 h-3 inline mr-1" aria-hidden="true" />
                      System {side}
                    </span>
                  )}
                </div>
                {isRevealed && exp && (
                  <div className="flex gap-1 text-[10px] text-muted-foreground">
                    <span>Chunk {exp.chunkSize}</span>
                    <span>·</span>
                    <span>{exp.retrieverType}</span>
                    <span>·</span>
                    <span className="truncate max-w-[100px]">{exp.embeddingModel}</span>
                  </div>
                )}
              </div>

              {results.map((r, i) => (
                <Card key={i} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium leading-relaxed">{r.questionText}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {r.retrievedContext && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Retrieved Context</div>
                        <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto font-mono bg-muted/20 rounded p-2 leading-relaxed">
                          {r.retrievedContext}
                        </div>
                      </div>
                    )}
                    {r.generatedAnswer && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Generated Answer</div>
                        <div className="text-sm leading-relaxed">{r.generatedAnswer}</div>
                      </div>
                    )}
                    {isCompleted && exp?.latestRunId && (
                      <div className="flex items-center gap-1 pt-2 border-t border-border/30">
                        <span className="text-[10px] text-muted-foreground">Rate:</span>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              createRating.mutate({
                                data: {
                                  evalRunId: exp.latestRunId!,
                                  questionId: r.questionId,
                                  rating: n,
                                  preference: rating === "tie" ? "tie" : rating === side ? "A" : rating ? "B" : undefined,
                                  arenaBattleId: battleId,
                                },
                              });
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors"
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <p className="text-sm text-muted-foreground">Waiting for evaluation results…</p>
        </Card>
      )}

      {/* Voting section */}
      {isCompleted && !isRevealed && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Your Verdict</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {(["A", "B", "tie"] as const).map((choice) => (
                <Button
                  key={choice}
                  variant={rating === choice ? "default" : "outline"}
                  size="lg"
                  className="flex-1"
                  onClick={() => handleVote(choice)}
                >
                  {choice === "tie" ? "Tie" : `System ${choice}`}
                  {rating === choice && <Trophy className="w-4 h-4 ml-2 text-yellow-500" aria-hidden="true" />}
                </Button>
              ))}
            </div>
            <Button className="w-full" onClick={handleFinalize} disabled={!rating || finalize.isPending}>
              <CheckCheck className="w-4 h-4 mr-2" aria-hidden="true" />
              {finalize.isPending ? "Submitting…" : "Submit Verdict"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Revealed winner */}
      {isRevealed && (
        <Card className={`border ${battle.humanWinner === "tie" ? "border-border" : "border-yellow-500/40"} bg-yellow-500/5`}>
          <CardContent className="p-6 flex items-center gap-4">
            <Trophy className="w-6 h-6 text-yellow-500 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold">
                {battle.humanWinner === "tie"
                  ? "It's a tie!"
                  : `System ${battle.humanWinner} wins!`}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {battle.metricWinner && (
                  <span>Automated metrics: <span className="text-foreground font-semibold">{battle.metricWinner}</span></span>
                )}
                {battle.humanWinner && (
                  <span>Human verdict: <span className="text-foreground font-semibold">{battle.humanWinner}</span></span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reveal button (manual) */}
      {isCompleted && !isRevealed && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={() => setRevealed(true)}>
            <span className="mr-1">👁</span> Peek (Reveal)
          </Button>
        </div>
      )}
    </motion.div>
  );
}
