import { useParams } from "wouter";
import { useGetExperimentTrends } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, AlertTriangle, ArrowLeft, Activity } from "lucide-react";
import { Link } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ExperimentTrends() {
  const { id } = useParams<{ id: string }>();
  const expId = Number(id);

  const { data, isLoading } = useGetExperimentTrends(expId, {
    query: { enabled: !!expId, refetchInterval: 10000 },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground py-20">
        Experiment not found
      </div>
    );
  }

  const chartData = (data.trends ?? []).map((t: any) => ({
    run: `#${t.runNumber}`,
    faithfulness: t.faithfulness != null ? Number(t.faithfulness.toFixed(3)) : null,
    contextRecall: t.contextRecall != null ? Number(t.contextRecall.toFixed(3)) : null,
    latencyMs: t.latencyMs != null ? Math.round(t.latencyMs) : null,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
        <Link href={`/experiments/${expId}`}>
          <span className="flex items-center w-fit hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Experiment
          </span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-primary" />
          {data.experimentName}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Metric trends across {data.trends?.length ?? 0} evaluation runs
        </p>
      </div>

      {(data.regressions ?? []).length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle className="w-4 h-4" />
                {data.regressions.length} Regression{data.regressions.length > 1 ? "s" : ""} Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.regressions.map((r: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between border border-destructive/30 rounded-lg p-3 bg-background/50"
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        Run #{r.runNumber} — {r.metric}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Number(r.previousValue).toFixed(3)} → {Number(r.currentValue).toFixed(3)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={r.severity === "high" ? "destructive" : "secondary"}
                        className="font-mono text-[10px]"
                      >
                        {r.severity}
                      </Badge>
                      <span className="font-mono text-sm text-destructive font-bold">
                        {r.percentChange > 0 ? "+" : ""}{r.percentChange}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {chartData.length > 1 ? (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> Metrics Over Runs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="run"
                  tick={{ fontSize: 10, fontFamily: "monospace" }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  yAxisId="left"
                  domain={[0, 1]}
                  tick={{ fontSize: 10, fontFamily: "monospace" }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fontFamily: "monospace" }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="faithfulness"
                  name="Faithfulness"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="contextRecall"
                  name="Context Recall"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="latencyMs"
                  name="Latency (ms)"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card p-8 text-center">
          <p className="text-muted-foreground font-mono text-sm">
            Need at least 2 eval runs to show trends. Run more evaluations to see the chart.
          </p>
        </Card>
      )}

      {(data.trends ?? []).length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Run History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {[...data.trends].reverse().map((t: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 font-mono text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Run #{t.runNumber}</span>
                  </div>
                  <div className="flex gap-6 text-xs">
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Faithfulness</div>
                      <div className="text-green-400 font-bold">
                        {t.faithfulness != null ? t.faithfulness.toFixed(3) : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Recall</div>
                      <div className="text-blue-400 font-bold">
                        {t.contextRecall != null ? t.contextRecall.toFixed(3) : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Latency</div>
                      <div className="text-muted-foreground">
                        {t.latencyMs != null ? `${Math.round(t.latencyMs)}ms` : "—"}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
