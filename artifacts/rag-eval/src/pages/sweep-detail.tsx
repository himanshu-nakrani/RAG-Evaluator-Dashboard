import { useParams } from "wouter";
import {
  useGetSweep,
  getGetSweepQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  ArrowLeft,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  FlaskConical,
  ArrowRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function SweepDetail() {
  const { id } = useParams();
  const sweepId = Number(id);
  const { data: sweep, isLoading } = useGetSweep(sweepId, {
    query: {
      enabled: !!sweepId,
      queryKey: getGetSweepQueryKey(sweepId),
      refetchInterval: (data: any) => (data?.status === "running" ? 3000 : false),
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!sweep) return <div>Sweep not found</div>;

  const progress =
    sweep.totalExperiments > 0
      ? Math.round((sweep.completedExperiments / sweep.totalExperiments) * 100)
      : 0;

  const completed = sweep.experiments?.filter(
    (e: any) => e.bestFaithfulness != null
  );
  const bestExp =
    completed?.length > 0
      ? [...completed].sort(
          (a: any, b: any) => (b.bestFaithfulness ?? 0) - (a.bestFaithfulness ?? 0)
        )[0]
      : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="text-sm font-mono text-muted-foreground mb-4">
        <Link href="/sweeps">
          <span className="flex items-center w-fit hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sweeps
          </span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            {sweep.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge
              variant="outline"
              className={`font-mono text-xs ${
                sweep.status === "completed"
                  ? "border-success text-success bg-success/10"
                  : sweep.status === "running"
                  ? "border-warning text-warning bg-warning/10"
                  : "border-border"
              }`}
            >
              {sweep.status === "running" && <Activity className="w-3 h-3 mr-1 animate-pulse" />}
              {sweep.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
              {sweep.status.toUpperCase()}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(sweep.createdAt), "MMM d, yyyy h:mm a")}
            </span>
          </div>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex justify-between font-mono text-sm mb-2">
            <span className="text-muted-foreground">
              {sweep.completedExperiments} / {sweep.totalExperiments} experiments complete
            </span>
            <span className="font-bold text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {bestExp && (
            <div className="mt-4 text-xs font-mono text-muted-foreground flex items-center gap-2">
              <span className="text-primary">★ Best so far:</span>
              <span className="text-foreground truncate">{bestExp.name}</span>
              <span className="metric-green ml-auto shrink-0">
                {bestExp.bestFaithfulness?.toFixed(3)} faithfulness
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {bestExp && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
                Best Faithfulness
              </div>
              <div
                className={`text-2xl font-bold font-mono ${
                  bestExp.bestFaithfulness >= 0.8
                    ? "metric-green"
                    : bestExp.bestFaithfulness >= 0.5
                    ? "metric-amber"
                    : "metric-red"
                }`}
              >
                {bestExp.bestFaithfulness?.toFixed(3)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
                Best Context Recall
              </div>
              <div
                className={`text-2xl font-bold font-mono ${
                  bestExp.bestContextRecall >= 0.8
                    ? "metric-green"
                    : bestExp.bestContextRecall >= 0.5
                    ? "metric-amber"
                    : "metric-red"
                }`}
              >
                {bestExp.bestContextRecall?.toFixed(3) ?? "-"}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">
                Total Experiments
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {sweep.totalExperiments}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-muted-foreground mb-4 pl-2 border-l-2 border-primary">
          Generated Experiments
        </h3>
        {!sweep.experiments?.length ? (
          <div className="text-center py-8 text-muted-foreground font-mono text-sm">
            Experiments are being created...
          </div>
        ) : (
          <div className="space-y-3">
            {sweep.experiments.map((exp: any) => (
              <Link key={exp.id} href={`/experiments/${exp.id}`}>
                <div className="border border-border bg-card rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col md:flex-row md:items-center gap-4 hover-elevate group">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2 truncate">
                      <FlaskConical className="w-4 h-4 text-primary shrink-0" />
                      {exp.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge
                        variant="secondary"
                        className="font-mono text-[9px] bg-muted/50 text-muted-foreground"
                      >
                        chunk={exp.chunkSize}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[9px] bg-muted/50 text-muted-foreground"
                      >
                        {exp.embeddingModel.split("-").slice(-2).join("-")}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[9px] bg-muted/50 text-muted-foreground"
                      >
                        {exp.retrieverType}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-6 border-t md:border-t-0 md:border-l border-border/50 pt-3 md:pt-0 md:pl-4 shrink-0">
                    <div className="text-center">
                      <div className="text-[9px] font-mono uppercase text-muted-foreground mb-1">
                        Faithfulness
                      </div>
                      <div
                        className={`font-mono font-bold text-sm ${
                          exp.bestFaithfulness == null
                            ? "text-muted-foreground"
                            : exp.bestFaithfulness >= 0.8
                            ? "metric-green"
                            : exp.bestFaithfulness >= 0.5
                            ? "metric-amber"
                            : "metric-red"
                        }`}
                      >
                        {exp.bestFaithfulness != null ? exp.bestFaithfulness.toFixed(3) : "..."}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] font-mono uppercase text-muted-foreground mb-1">
                        Recall
                      </div>
                      <div
                        className={`font-mono font-bold text-sm ${
                          exp.bestContextRecall == null
                            ? "text-muted-foreground"
                            : exp.bestContextRecall >= 0.8
                            ? "metric-green"
                            : exp.bestContextRecall >= 0.5
                            ? "metric-amber"
                            : "metric-red"
                        }`}
                      >
                        {exp.bestContextRecall != null ? exp.bestContextRecall.toFixed(3) : "..."}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] font-mono uppercase text-muted-foreground mb-1">
                        Runs
                      </div>
                      <div className="font-mono text-sm text-muted-foreground">
                        {exp.runCount}
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center text-muted-foreground shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
