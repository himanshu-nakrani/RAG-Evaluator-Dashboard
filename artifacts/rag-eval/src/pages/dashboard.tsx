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
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Overview</h1>
        <p className="text-muted-foreground mt-1">System level metrics and recent evaluation runs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="bg-card hover-elevate transition-all border-border overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon className="w-16 h-16" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground font-mono">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Recent Eval Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.recentRuns && summary.recentRuns.length > 0 ? (
              <div className="space-y-4">
                {summary.recentRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
                    <div>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        Run #{run.id}
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {run.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Link href={`/eval-runs/${run.id}`}>
                      <span className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1 font-mono">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No evaluation runs yet.</p>
                <Link href="/experiments">
                  <span className="text-primary hover:underline cursor-pointer mt-2 inline-block">Create an experiment</span>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Best Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground font-mono mb-2">Faithfulness</div>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-bold ${
                  !summary?.bestFaithfulness ? 'text-muted-foreground' :
                  summary.bestFaithfulness >= 0.8 ? 'metric-green' :
                  summary.bestFaithfulness >= 0.5 ? 'metric-amber' : 'metric-red'
                }`}>
                  {summary?.bestFaithfulness != null ? summary.bestFaithfulness.toFixed(3) : '-'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground font-mono mb-2">Context Recall</div>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-bold ${
                  !summary?.bestContextRecall ? 'text-muted-foreground' :
                  summary.bestContextRecall >= 0.8 ? 'metric-green' :
                  summary.bestContextRecall >= 0.5 ? 'metric-amber' : 'metric-red'
                }`}>
                  {summary?.bestContextRecall != null ? summary.bestContextRecall.toFixed(3) : '-'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground font-mono mb-2">Avg Latency</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-foreground">
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
