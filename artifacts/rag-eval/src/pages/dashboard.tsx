import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Files, MessageSquare, FlaskConical, PlayCircle, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Documents", value: summary?.totalDocuments || 0, icon: Files },
    { title: "Question Sets", value: summary?.totalQuestions || 0, icon: MessageSquare },
    { title: "Experiments", value: summary?.totalExperiments || 0, icon: FlaskConical },
    { title: "Eval Runs", value: summary?.totalRuns || 0, icon: PlayCircle },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">High-level view of your evaluation metrics and runs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="bg-card shadow-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground/40" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Eval Runs</CardTitle>
            <Link href="/eval-runs">
              <span className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1 font-medium">
                View all <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {summary?.recentRuns && summary.recentRuns.length > 0 ? (
              <div className="divide-y divide-border">
                {summary.recentRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/40 transition-colors group">
                    <div className="flex items-center gap-3">
                      {run.status === "completed" ? (
                        <div className="w-5 h-5 rounded-full border-2 border-success flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-success" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-warning flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground flex items-center gap-2">
                          <span>Run #{run.id}</span>
                          <span className="text-muted-foreground font-normal">—</span>
                          <span className="text-muted-foreground font-normal text-xs">{run.status}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(run.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Link href={`/eval-runs/${run.id}`}>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground cursor-pointer font-medium">
                        Details
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground px-6">
                <p className="text-sm">No evaluation runs yet.</p>
                <Link href="/experiments">
                  <span className="text-primary hover:underline cursor-pointer mt-2 inline-block text-xs font-medium">Create an experiment</span>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Best Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Faithfulness</div>
              <div className="flex items-end gap-2">
                <span className={`text-2xl font-semibold tracking-tight ${
                  !summary?.bestFaithfulness ? 'text-muted-foreground' :
                  summary.bestFaithfulness >= 0.8 ? 'metric-green' :
                  summary.bestFaithfulness >= 0.5 ? 'metric-amber' : 'metric-red'
                }`}>
                  {summary?.bestFaithfulness != null ? summary.bestFaithfulness.toFixed(3) : '-'}
                </span>
                {summary?.bestFaithfulness != null && summary.bestFaithfulness >= 0.8 && (
                  <span className="text-xs text-success font-medium mb-0.5">Top score</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Context Recall</div>
              <div className="flex items-end gap-2">
                <span className={`text-2xl font-semibold tracking-tight ${
                  !summary?.bestContextRecall ? 'text-muted-foreground' :
                  summary.bestContextRecall >= 0.8 ? 'metric-green' :
                  summary.bestContextRecall >= 0.5 ? 'metric-amber' : 'metric-red'
                }`}>
                  {summary?.bestContextRecall != null ? summary.bestContextRecall.toFixed(3) : '-'}
                </span>
                {summary?.bestContextRecall != null && summary.bestContextRecall >= 0.8 && (
                  <span className="text-xs text-success font-medium mb-0.5">Top score</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Avg Latency</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-semibold tracking-tight text-foreground">
                  {summary?.avgLatencyMs != null ? `${Math.round(summary.avgLatencyMs)}ms` : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
