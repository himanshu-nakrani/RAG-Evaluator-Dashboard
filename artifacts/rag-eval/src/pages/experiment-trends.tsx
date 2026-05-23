import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useGetExperimentTrends } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, AlertTriangle, ArrowLeft, Activity, Download, BarChart2, LineChartIcon } from "lucide-react";
import { Link } from "wouter";
import {
  LineChart, BarChart, AreaChart,
  Line, Bar, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type ChartType = "line" | "bar" | "area";

const METRIC_OPTIONS = [
  { key: "faithfulness", label: "Faithfulness", color: "var(--color-primary)" },
  { key: "contextRecall", label: "Context Recall", color: "#22c55e" },
  { key: "latencyMs", label: "Latency (ms)", color: "var(--color-muted-foreground)" },
];

function exportTrendsCsv(data: any) {
  const headers = ["run_number", "faithfulness", "context_recall", "latency_ms"];
  const rows = (data.trends ?? []).map((t: any) => [
    t.runNumber,
    t.faithfulness ?? "",
    t.contextRecall ?? "",
    t.latencyMs != null ? Math.round(t.latencyMs) : "",
  ]);
  const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(data.experimentName ?? "experiment").replace(/[^a-z0-9]/gi, "-").toLowerCase()}-trends.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExperimentTrends() {
  const { id } = useParams<{ id: string }>();
  const expId = Number(id);

  const { data, isLoading } = useGetExperimentTrends(expId, {
    query: { queryKey: ["getExperimentTrends", expId], enabled: !!expId, refetchInterval: 10000 },
  });

  const [chartType, setChartType] = useState<ChartType>("line");
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(["faithfulness", "contextRecall"]));

  const toggleMetric = (key: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const chartData = useMemo(() => (data?.trends ?? []).map((t: any) => ({
    run: `#${t.runNumber}`,
    faithfulness: t.faithfulness != null ? Number(t.faithfulness.toFixed(3)) : null,
    contextRecall: t.contextRecall != null ? Number(t.contextRecall.toFixed(3)) : null,
    latencyMs: t.latencyMs != null ? Math.round(t.latencyMs) : null,
  })), [data?.trends]);

  const showLatency = visibleMetrics.has("latencyMs");
  const showScores = visibleMetrics.has("faithfulness") || visibleMetrics.has("contextRecall");

  const ChartWrapper = chartType === "bar" ? BarChart : chartType === "area" ? AreaChart : LineChart;

  function renderSeries(metric: typeof METRIC_OPTIONS[0]) {
    if (!visibleMetrics.has(metric.key)) return null;
    const isLatency = metric.key === "latencyMs";
    const yId = isLatency && showScores ? "right" : "left";

    if (chartType === "bar") {
      return (
        <Bar
          key={metric.key}
          yAxisId={yId}
          dataKey={metric.key}
          name={metric.label}
          fill={metric.color}
          radius={[3, 3, 0, 0]}
          opacity={0.85}
        />
      );
    }
    if (chartType === "area") {
      return (
        <Area
          key={metric.key}
          yAxisId={yId}
          type="monotone"
          dataKey={metric.key}
          name={metric.label}
          stroke={metric.color}
          fill={metric.color}
          fillOpacity={0.12}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      );
    }
    return (
      <Line
        key={metric.key}
        yAxisId={yId}
        type="monotone"
        dataKey={metric.key}
        name={metric.label}
        stroke={metric.color}
        strokeWidth={2}
        dot={{ fill: metric.color, r: 4 }}
        activeDot={{ r: 6 }}
        strokeDasharray={isLatency ? "5 5" : undefined}
        connectNulls
      />
    );
  }

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
        <TrendingUp className="w-10 h-10 mx-auto mb-4 opacity-20" aria-hidden="true" />
        <p>Experiment not found.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
        <Link href={`/experiments/${expId}`}>
          <span className="flex items-center w-fit hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Back to Experiment
          </span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" aria-hidden="true" />
            {data.experimentName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Metric trends across {data.trends?.length ?? 0} evaluation runs
          </p>
        </div>
        {(data.trends?.length ?? 0) > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportTrendsCsv(data)} aria-label="Export trend data as CSV">
            <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Export CSV
          </Button>
        )}
      </div>

      {(data.regressions ?? []).length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
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
                      <div className="text-sm font-semibold">Run #{r.runNumber} — {r.metric}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Number(r.previousValue).toFixed(3)} → {Number(r.currentValue).toFixed(3)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.severity === "high" ? "destructive" : "secondary"} className="font-mono text-[10px]">
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
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-3 h-3" aria-hidden="true" /> Metrics Over Runs
              </CardTitle>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Metric toggles */}
                <div className="flex gap-3" role="group" aria-label="Toggle metrics">
                  {METRIC_OPTIONS.map((m) => (
                    <label key={m.key} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={visibleMetrics.has(m.key)}
                        onCheckedChange={() => toggleMetric(m.key)}
                        className="h-3.5 w-3.5"
                        aria-label={`Toggle ${m.label}`}
                      />
                      <span className="text-xs text-muted-foreground" style={{ color: visibleMetrics.has(m.key) ? m.color : undefined }}>
                        {m.label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Chart type */}
                <div className="flex gap-1 border border-border rounded-md p-0.5 bg-muted/30" role="group" aria-label="Chart type">
                  {([
                    { type: "line", icon: LineChartIcon },
                    { type: "area", icon: TrendingUp },
                    { type: "bar", icon: BarChart2 },
                  ] as const).map(({ type, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      aria-pressed={chartType === type}
                      aria-label={`${type} chart`}
                      className={`p-1.5 rounded transition-colors ${
                        chartType === type
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ChartWrapper data={chartData} margin={{ left: 0, right: showLatency && showScores ? 40 : 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="run" tick={{ fontSize: 10, fontFamily: "monospace" }} stroke="hsl(var(--muted-foreground))" />
                {showScores && (
                  <YAxis
                    yAxisId="left"
                    domain={[0, 1]}
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                )}
                {showLatency && showScores && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                )}
                {showLatency && !showScores && (
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                )}
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
                {METRIC_OPTIONS.map((m) => renderSeries(m))}
              </ChartWrapper>
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
                    <Activity className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span className="text-muted-foreground">Run #{t.runNumber}</span>
                  </div>
                  <div className="flex gap-6 text-xs">
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Faithfulness</div>
                      <div className={`font-bold ${
                        t.faithfulness == null ? "text-muted-foreground" :
                        t.faithfulness >= 0.8 ? "metric-green" :
                        t.faithfulness >= 0.5 ? "metric-amber" : "metric-red"
                      }`}>
                        {t.faithfulness != null ? t.faithfulness.toFixed(3) : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Recall</div>
                      <div className={`font-bold ${
                        t.contextRecall == null ? "text-muted-foreground" :
                        t.contextRecall >= 0.8 ? "metric-green" :
                        t.contextRecall >= 0.5 ? "metric-amber" : "metric-red"
                      }`}>
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
