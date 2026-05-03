import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Files, MessageSquare, FlaskConical, PlayCircle, ArrowRight,
  Plus, Upload, Zap, Scale, Trophy, TrendingUp, TrendingDown,
  CheckCircle2, Activity, Clock,
} from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";

const QUICK_ACTIONS = [
  { label: "Upload Document", href: "/documents", icon: Upload, color: "text-blue-500" },
  { label: "New Question Set", href: "/question-sets", icon: MessageSquare, color: "text-purple-500" },
  { label: "New Experiment", href: "/experiments", icon: FlaskConical, color: "text-primary" },
  { label: "Run Sweep", href: "/sweeps", icon: Zap, color: "text-yellow-500" },
  { label: "Compare Exps", href: "/experiments/compare", icon: Scale, color: "text-pink-500" },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy, color: "text-yellow-600" },
];

function ScoreBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const cls = value >= 0.8 ? "metric-green" : value >= 0.5 ? "metric-amber" : "metric-red";
  return <span className={`font-semibold ${cls}`}>{value.toFixed(3)}</span>;
}

function TrendIndicator({ current, previous }: { current?: number | null; previous?: number | null }) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.001) return null;
  const isUp = diff > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-mono ml-1 ${isUp ? "text-green-500" : "text-red-400"}`}>
      {isUp ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> : <TrendingDown className="w-3 h-3" aria-hidden="true" />}
      {Math.abs(diff).toFixed(3)}
    </span>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { refetchInterval: 15000 },
  });
  const [showAllRuns, setShowAllRuns] = useState(false);

  const recentRuns = summary?.recentRuns ?? [];
  const visibleRuns = showAllRuns ? recentRuns : recentRuns.slice(0, 5);
  const completedRuns = recentRuns.filter((r: any) => r.status === "completed");
  const runningRuns = recentRuns.filter((r: any) => r.status === "running" || r.status === "pending");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Documents", value: summary?.totalDocuments ?? 0, icon: Files, href: "/documents", color: "text-blue-500" },
    { title: "Question Sets", value: summary?.totalQuestions ?? 0, icon: MessageSquare, href: "/question-sets", color: "text-purple-500" },
    { title: "Experiments", value: summary?.totalExperiments ?? 0, icon: FlaskConical, href: "/experiments", color: "text-primary" },
    { title: "Eval Runs", value: summary?.totalRuns ?? 0, icon: PlayCircle, href: "/experiments", color: "text-green-500" },
  ];

  const isEmpty = (summary?.totalDocuments ?? 0) === 0 && (summary?.totalExperiments ?? 0) === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          High-level view of your evaluation metrics and runs.
          {runningRuns.length > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-warning">
              <Activity className="w-3 h-3 animate-pulse" aria-hidden="true" />
              {runningRuns.length} run{runningRuns.length !== 1 ? "s" : ""} in progress
            </span>
          )}
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((action, idx) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Link href={action.href}>
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer text-center group hover-elevate">
                  <action.icon className={`w-5 h-5 ${action.color} group-hover:scale-110 transition-transform`} aria-hidden="true" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{action.label}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-dashed border-2 border-border bg-transparent p-10 text-center">
            <div className="flex flex-col items-center text-muted-foreground">
              <FlaskConical className="w-12 h-12 mb-4 opacity-20" aria-hidden="true" />
              <h3 className="text-lg font-medium mb-2 text-foreground">Welcome to RAG Eval!</h3>
              <p className="text-sm mb-6 max-w-md">
                Get started by uploading a document, creating a question set, then running your first evaluation experiment.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/documents">
                  <Button>
                    <Upload className="w-4 h-4 mr-2" aria-hidden="true" /> Upload Document
                  </Button>
                </Link>
                <Link href="/question-sets">
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Create Question Set
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
          >
            <Link href={stat.href}>
              <Card className="bg-card shadow-sm border-border hover:border-primary/40 transition-colors cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color} opacity-40 group-hover:opacity-70 transition-opacity`} aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Eval Runs */}
        <Card className="col-span-1 md:col-span-2 border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Eval Runs</CardTitle>
            <div className="flex items-center gap-2">
              {recentRuns.length > 5 && (
                <button
                  onClick={() => setShowAllRuns(!showAllRuns)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllRuns ? "Show less" : `Show all ${recentRuns.length}`}
                </button>
              )}
              <Link href="/experiments">
                <span className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1 font-medium">
                  View all <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentRuns.length > 0 ? (
              <div className="divide-y divide-border" role="list" aria-label="Recent evaluation runs">
                {visibleRuns.map((run: any) => (
                  <Link key={run.id} href={`/eval-runs/${run.id}`}>
                    <div className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/40 transition-colors group cursor-pointer" role="listitem">
                      <div className="flex items-center gap-3">
                        {run.status === "completed" ? (
                          <div className="w-5 h-5 rounded-full border-2 border-success flex items-center justify-center shrink-0" aria-hidden="true">
                            <div className="w-2 h-2 rounded-full bg-success" />
                          </div>
                        ) : run.status === "failed" ? (
                          <div className="w-5 h-5 rounded-full border-2 border-destructive flex items-center justify-center shrink-0" aria-hidden="true">
                            <div className="w-2 h-2 rounded-full bg-destructive" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-warning flex items-center justify-center shrink-0" aria-hidden="true">
                            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                            <span>Run #{run.id}</span>
                            <span className="text-muted-foreground font-normal">—</span>
                            <Badge variant="outline" className={`text-[9px] h-4 px-1 ${
                              run.status === "completed" ? "border-success text-success" :
                              run.status === "failed" ? "border-destructive text-destructive" :
                              "border-warning text-warning"
                            }`}>
                              {run.status}
                            </Badge>
                            {run.avgFaithfulness != null && (
                              <span className="text-xs text-muted-foreground font-mono">
                                Faith: <ScoreBadge value={run.avgFaithfulness} />
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground px-6">
                <PlayCircle className="w-8 h-8 mx-auto mb-3 opacity-20" aria-hidden="true" />
                <p className="text-sm mb-1">No evaluation runs yet.</p>
                <Link href="/experiments">
                  <span className="text-primary hover:underline cursor-pointer text-xs font-medium">
                    Create an experiment to get started
                  </span>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Best Metrics */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Best Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Faithfulness</div>
                <div className="flex items-center gap-1">
                  <span className={`text-2xl font-semibold tracking-tight ${
                    !summary?.bestFaithfulness ? "text-muted-foreground" :
                    summary.bestFaithfulness >= 0.8 ? "metric-green" :
                    summary.bestFaithfulness >= 0.5 ? "metric-amber" : "metric-red"
                  }`}>
                    {summary?.bestFaithfulness != null ? summary.bestFaithfulness.toFixed(3) : "—"}
                  </span>
                  {summary?.bestFaithfulness != null && summary.bestFaithfulness >= 0.8 && (
                    <span className="text-xs text-success font-medium ml-1">Top score</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Context Recall</div>
                <div className="flex items-center gap-1">
                  <span className={`text-2xl font-semibold tracking-tight ${
                    !summary?.bestContextRecall ? "text-muted-foreground" :
                    summary.bestContextRecall >= 0.8 ? "metric-green" :
                    summary.bestContextRecall >= 0.5 ? "metric-amber" : "metric-red"
                  }`}>
                    {summary?.bestContextRecall != null ? summary.bestContextRecall.toFixed(3) : "—"}
                  </span>
                  {summary?.bestContextRecall != null && summary.bestContextRecall >= 0.8 && (
                    <span className="text-xs text-success font-medium ml-1">Top score</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Avg Latency</div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  {summary?.avgLatencyMs != null ? `${Math.round(summary.avgLatencyMs)}ms` : "—"}
                </div>
              </div>

              {(summary?.totalRuns ?? 0) > 0 && (
                <div className="pt-3 border-t border-border/50">
                  <Link href="/leaderboard">
                    <Button variant="outline" size="sm" className="w-full">
                      <Trophy className="w-3.5 h-3.5 mr-2 text-yellow-500" aria-hidden="true" /> View Leaderboard
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick status summary */}
          {(summary?.totalRuns ?? 0) > 0 && (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Completed runs", value: completedRuns.length, icon: CheckCircle2, color: "text-success" },
                  { label: "Running now", value: runningRuns.length, icon: Activity, color: "text-warning" },
                  { label: "Total runs", value: summary?.totalRuns ?? 0, icon: PlayCircle, color: "text-muted-foreground" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Icon className={`w-3.5 h-3.5 ${color}`} aria-hidden="true" />
                      {label}
                    </span>
                    <span className="font-mono font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
