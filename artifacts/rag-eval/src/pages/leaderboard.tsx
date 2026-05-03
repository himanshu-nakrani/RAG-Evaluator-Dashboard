import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, FlaskConical, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309"];

function getRankBadgeClass(rank: number) {
  if (rank === 1) return "border-yellow-500/60 text-yellow-400 bg-yellow-500/10";
  if (rank === 2) return "border-slate-400/60 text-slate-300 bg-slate-400/10";
  if (rank === 3) return "border-amber-700/60 text-amber-600 bg-amber-700/10";
  return "border-border text-muted-foreground";
}

function getRankSymbol(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function Leaderboard() {
  const { data, isLoading } = useGetLeaderboard({
    query: { queryKey: getGetLeaderboardQueryKey(), refetchInterval: 10000 },
  });

  const chartData = (data?.entries ?? [])
    .slice(0, 8)
    .map((e) => ({
      name:
        e.experimentName.length > 20
          ? e.experimentName.substring(0, 18) + "…"
          : e.experimentName,
      Faithfulness: e.bestFaithfulness != null ? Number(e.bestFaithfulness.toFixed(3)) : 0,
      ContextRecall: e.bestContextRecall != null ? Number(e.bestContextRecall.toFixed(3)) : 0,
    }))
    .reverse();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          All experiments ranked by best faithfulness score across runs.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data?.entries.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center mt-8">
          <div className="flex flex-col items-center text-muted-foreground">
            <Trophy className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">No experiments yet</h3>
            <p className="text-sm max-w-md">
              Run evaluations on your experiments and they'll appear here ranked by performance.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {chartData.length > 1 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                  <TrendingUp className="w-4 h-4" /> Score Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 1]}
                      tick={{ fontSize: 10, fontFamily: "monospace" }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 10, fontFamily: "monospace" }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--color-popover)",
                        borderColor: "var(--color-border)",
                        borderRadius: "6px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "var(--color-foreground)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "monospace" }} />
                    <Bar dataKey="Faithfulness" fill="var(--color-primary)" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="ContextRecall" fill="var(--color-chart-2)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {data.entries.map((entry, idx) => (
              <motion.div
                key={entry.experimentId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Link href={`/experiments/${entry.experimentId}`}>
                  <div className="border border-border bg-card rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col md:flex-row md:items-center gap-4 hover-elevate group">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 text-center">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs px-2 py-1 ${getRankBadgeClass(entry.rank)}`}
                        >
                          {getRankSymbol(entry.rank)}
                        </Badge>
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-primary shrink-0" />
                          {entry.experimentName}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <Badge
                            variant="secondary"
                            className="font-mono text-[9px] bg-muted/50 text-muted-foreground border-border"
                          >
                            chunk={entry.chunkSize}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="font-mono text-[9px] bg-muted/50 text-muted-foreground border-border"
                          >
                            {entry.embeddingModel.split("-").slice(-2).join("-")}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="font-mono text-[9px] bg-muted/50 text-muted-foreground border-border"
                          >
                            {entry.retrieverType}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="font-mono text-[9px] bg-muted/50 text-muted-foreground border-border"
                          >
                            k={entry.topK}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-8 border-t md:border-t-0 md:border-l border-border/50 pt-3 md:pt-0 md:pl-6 shrink-0">
                      <div className="text-center">
                        <div className="text-[9px] uppercase text-muted-foreground mb-1 font-medium">
                          Faithfulness
                        </div>
                        <div
                          className={`font-mono font-bold text-base ${
                            entry.bestFaithfulness == null
                              ? "text-muted-foreground"
                              : entry.bestFaithfulness >= 0.8
                              ? "metric-green"
                              : entry.bestFaithfulness >= 0.5
                              ? "metric-amber"
                              : "metric-red"
                          }`}
                        >
                          {entry.bestFaithfulness != null
                            ? entry.bestFaithfulness.toFixed(3)
                            : "-"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground mb-1 font-medium">
                          Recall
                        </div>
                        <div
                          className={`font-semibold text-base ${
                            entry.bestContextRecall == null
                              ? "text-muted-foreground"
                              : entry.bestContextRecall >= 0.8
                              ? "metric-green"
                              : entry.bestContextRecall >= 0.5
                              ? "metric-amber"
                              : "metric-red"
                          }`}
                        >
                          {entry.bestContextRecall != null
                            ? entry.bestContextRecall.toFixed(3)
                            : "-"}
                        </div>
                      </div>
                      <div className="text-center hidden sm:block">
                        <div className="text-[9px] text-muted-foreground mb-1 font-medium">
                          Latency
                        </div>
                        <div className="font-semibold text-base text-foreground">
                          {entry.avgLatencyMs != null
                            ? `${Math.round(entry.avgLatencyMs)}ms`
                            : "-"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground mb-1 font-medium">
                          Runs
                        </div>
                        <div className="text-base text-muted-foreground">
                          {entry.runCount}
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center text-muted-foreground shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
