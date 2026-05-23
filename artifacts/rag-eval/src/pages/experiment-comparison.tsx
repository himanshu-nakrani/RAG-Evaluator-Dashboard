import { useState, useEffect } from "react";
import { useCompareExperiments, useListExperiments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, TrendingUp, TrendingDown, Minus, Download, Trophy, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HumanRatingPanel } from "@/components/blind/HumanRatingPanel";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const ALL_METRICS = [
  { key: "bestFaithfulness", label: "Faithfulness", higherIsBetter: true },
  { key: "bestContextRecall", label: "Context Recall", higherIsBetter: true },
  { key: "avgLatencyMs", label: "Avg Latency (ms)", higherIsBetter: false },
  { key: "runCount", label: "Run Count", higherIsBetter: true },
];

function DiffBadge({ diff, lowerIsBetter = false }: { diff: number | null; lowerIsBetter?: boolean }) {
  if (diff === null) return <span className="text-muted-foreground">—</span>;
  const isPositive = lowerIsBetter ? diff < 0 : diff > 0;
  const isNegative = lowerIsBetter ? diff > 0 : diff < 0;
  return (
    <div className={`flex items-center gap-1 font-bold text-sm ${
      isPositive ? "text-green-400" : isNegative ? "text-red-400" : "text-muted-foreground"
    }`}>
      {isPositive ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> :
        isNegative ? <TrendingDown className="w-3 h-3" aria-hidden="true" /> :
          <Minus className="w-3 h-3" aria-hidden="true" />}
      {diff > 0 ? "+" : ""}{typeof diff === "number" && Math.abs(diff) < 1 ? diff.toFixed(3) : Math.round(diff)}
      {lowerIsBetter && diff !== 0 ? "ms" : ""}
    </div>
  );
}

function exportComparisonCsv(comparison: any) {
  const headers = ["experiment", "best_faithfulness", "best_context_recall", "avg_latency_ms", "run_count", "chunk_size", "embedding_model", "retriever_type", "top_k"];
  const rows = [comparison.exp1, comparison.exp2].map((e: any) => [
    `"${(e.name ?? "").replace(/"/g, '""')}"`,
    e.bestFaithfulness ?? "",
    e.bestContextRecall ?? "",
    e.avgLatencyMs != null ? Math.round(e.avgLatencyMs) : "",
    e.runCount,
    e.chunkSize,
    e.embeddingModel,
    e.retrieverType,
    e.topK,
  ]);
  const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comparison-${comparison.exp1.id}-vs-${comparison.exp2.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExperimentComparison() {
  const { data: experiments, isLoading: expsLoading } = useListExperiments();
  const [selectedExp1, setSelectedExp1] = useState("");
  const [selectedExp2, setSelectedExp2] = useState("");
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(
    new Set(["bestFaithfulness", "bestContextRecall", "avgLatencyMs"])
  );
  const [view, setView] = useState<"cards" | "table">("cards");
  const [isBlind, setIsBlind] = useState(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get("blind") === "1";
  });

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (isBlind) {
      sp.set("blind", "1");
    } else {
      sp.delete("blind");
    }
    const qs = sp.toString();
    const url = window.location.pathname + (qs ? `?${qs}` : "");
    window.history.replaceState({}, "", url);
  }, [isBlind]);

  const id1 = Number(selectedExp1);
  const id2 = Number(selectedExp2);

  const { data: comparison, isLoading: compLoading } = useCompareExperiments(
    { id1, id2 },
    {
      query: {
        queryKey: ["compareExperiments", id1, id2],
        enabled: !!id1 && !!id2 && id1 !== id2,
      },
    },
  );

  const toggleMetric = (key: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const radarData = comparison
    ? [
        { metric: "Faithfulness", exp1: (comparison.exp1.bestFaithfulness ?? 0) * 100, exp2: (comparison.exp2.bestFaithfulness ?? 0) * 100 },
        { metric: "Recall", exp1: (comparison.exp1.bestContextRecall ?? 0) * 100, exp2: (comparison.exp2.bestContextRecall ?? 0) * 100 },
        {
          metric: "Speed",
          exp1: comparison.exp1.avgLatencyMs ? Math.max(0, 100 - comparison.exp1.avgLatencyMs / 10) : 0,
          exp2: comparison.exp2.avgLatencyMs ? Math.max(0, 100 - comparison.exp2.avgLatencyMs / 10) : 0,
        },
      ]
    : [];

  const barData = comparison
    ? [
        { metric: "Faithfulness", A: comparison.exp1.bestFaithfulness ?? 0, B: comparison.exp2.bestFaithfulness ?? 0 },
        { metric: "Recall", A: comparison.exp1.bestContextRecall ?? 0, B: comparison.exp2.bestContextRecall ?? 0 },
      ]
    : [];

  // Determine winner per metric
  const winner = comparison
    ? ALL_METRICS.reduce((acc, m) => {
        const v1 = (comparison.exp1 as any)[m.key] ?? 0;
        const v2 = (comparison.exp2 as any)[m.key] ?? 0;
        if (v1 === v2) acc[m.key] = "tie";
        else if (m.higherIsBetter) acc[m.key] = v1 > v2 ? "exp1" : "exp2";
        else acc[m.key] = v1 < v2 ? "exp1" : "exp2";
        return acc;
      }, {} as Record<string, string>)
    : {};

  const exp1Wins = Object.values(winner).filter((v) => v === "exp1").length;
  const exp2Wins = Object.values(winner).filter((v) => v === "exp2").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" aria-hidden="true" />
            Compare Experiments
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Side-by-side experiment metrics comparison</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Blind mode toggle */}
          <div className="flex items-center gap-2 border border-border rounded-md px-3 py-1.5 bg-muted/20">
            {isBlind ? (
              <EyeOff className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            )}
            <Label htmlFor="blind-mode" className="text-xs cursor-pointer select-none">Blind</Label>
            <Switch id="blind-mode" checked={isBlind} onCheckedChange={setIsBlind} />
          </div>
          {comparison && (
            <div className="flex items-center gap-2">
              {isBlind && (
                <Button variant="default" size="sm" onClick={() => setIsBlind(false)}>
                  Reveal
                </Button>
              )}
              {/* View toggle */}
              <div className="flex gap-1 border border-border rounded-md p-0.5 bg-muted/30">
                <button
                  onClick={() => setView("cards")}
                  aria-pressed={view === "cards"}
                  className={`px-3 py-1 text-xs rounded transition-colors ${view === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setView("table")}
                  aria-pressed={view === "table"}
                  className={`px-3 py-1 text-xs rounded transition-colors ${view === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Table
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportComparisonCsv(comparison)} aria-label="Export comparison as CSV">
                <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Export CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Experiment selectors */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: "Experiment A", value: selectedExp1, onChange: setSelectedExp1 },
              { label: "Experiment B", value: selectedExp2, onChange: setSelectedExp2 },
            ].map(({ label, value, onChange }, i) => (
              <div key={i} className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">{i === 0 ? "A" : "B"}</Badge>
                  {label}
                </label>
                <Select value={value} onValueChange={onChange} disabled={expsLoading}>
                  <SelectTrigger aria-label={label}>
                    <SelectValue placeholder="Select experiment…" />
                  </SelectTrigger>
                  <SelectContent>
                    {experiments?.map((e: any) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!selectedExp1 || !selectedExp2 ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="text-muted-foreground">
            <Scale className="w-10 h-10 mx-auto mb-3 opacity-20" aria-hidden="true" />
            <p className="text-sm">Select two experiments to compare their metrics</p>
          </div>
        </Card>
      ) : id1 === id2 ? (
        <Card className="border-warning/50 bg-warning/5 p-6 text-center">
          <p className="text-sm text-warning">Please select two different experiments to compare.</p>
        </Card>
      ) : compLoading ? (
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : comparison ? (
        <>
          {/* Winner banner — hidden in blind mode */}
          {!isBlind && exp1Wins !== exp2Wins && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-yellow-500/40 bg-yellow-500/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-yellow-500 shrink-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">
                    <span className="text-primary">
                      {exp1Wins > exp2Wins ? comparison.exp1.name : comparison.exp2.name}
                    </span>{" "}
                    wins {Math.max(exp1Wins, exp2Wins)} of {ALL_METRICS.length} metrics
                    {exp1Wins > exp2Wins ? " (Experiment A)" : " (Experiment B)"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Metric column selector — hidden in blind mode */}
          {!isBlind && (
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Show metrics:</span>
              {ALL_METRICS.map((m) => (
                <label key={m.key} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={visibleMetrics.has(m.key)}
                    onCheckedChange={() => toggleMetric(m.key)}
                    className="h-3.5 w-3.5"
                    aria-label={`Toggle ${m.label}`}
                  />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </label>
              ))}
            </div>
          )}

          {view === "cards" ? (
            <div className="grid grid-cols-2 gap-6">
              {[comparison.exp1, comparison.exp2].map((exp: any, idx: number) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="border-border bg-card h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold leading-tight">
                          {isBlind ? `System ${idx === 0 ? "A" : "B"}` : exp.name}
                        </CardTitle>
                        <div className="flex items-center gap-1 shrink-0">
                          {!isBlind && exp1Wins !== exp2Wins && (
                            (idx === 0 && exp1Wins > exp2Wins) || (idx === 1 && exp2Wins > exp1Wins)
                          ) && <Trophy className="w-3.5 h-3.5 text-yellow-500" aria-hidden="true" />}
                          <Badge variant="secondary" className="font-mono text-[10px]">{idx === 0 ? "A" : "B"}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Config — hidden in blind mode */}
                      {!isBlind && (
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground border border-border/50 rounded-lg p-3 bg-muted/20">
                          <div><span className="opacity-60">Chunk</span><div className="text-foreground font-bold">{exp.chunkSize}</div></div>
                          <div><span className="opacity-60">Top-K</span><div className="text-foreground font-bold">{exp.topK}</div></div>
                          <div className="col-span-2"><span className="opacity-60">Retriever</span><div className="text-foreground font-bold">{exp.retrieverType}</div></div>
                          <div className="col-span-2"><span className="opacity-60">Embedding</span><div className="text-foreground font-bold truncate">{exp.embeddingModel}</div></div>
                        </div>
                      )}

                      {/* Human rating — shown in blind mode */}
                      {isBlind && exp.latestRunId != null && (
                        <HumanRatingPanel
                          evalRunId={exp.latestRunId}
                          questionId={0}
                          label="Your rating"
                        />
                      )}

                      {/* Metrics — hidden in blind mode */}
                      {!isBlind && (
                        <div className="space-y-3">
                          {ALL_METRICS.filter((m) => visibleMetrics.has(m.key)).map((m) => {
                            const val = exp[m.key];
                            const isWinner = winner[m.key] === (idx === 0 ? "exp1" : "exp2");
                            const isTie = winner[m.key] === "tie";
                            return (
                              <div key={m.key} className={`flex items-center justify-between py-1 border-b border-border/30 last:border-0 ${isWinner ? "bg-success/5 -mx-1 px-1 rounded" : ""}`}>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">{m.label}</span>
                                <div className="flex items-center gap-1.5">
                                  {isWinner && !isTie && <Trophy className="w-3 h-3 text-yellow-500" aria-hidden="true" />}
                                  <span className={`text-lg font-bold ${
                                    m.key === "bestFaithfulness" || m.key === "bestContextRecall"
                                      ? (!val ? "text-muted-foreground" : val >= 0.8 ? "metric-green" : val >= 0.5 ? "metric-amber" : "metric-red")
                                      : "text-foreground"
                                  }`}>
                                    {val != null
                                      ? (m.key === "avgLatencyMs" ? `${Math.round(val)}ms` :
                                         m.key === "runCount" ? val :
                                         val.toFixed(3))
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Table view */
            <Card className="border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table" aria-label="Comparison table">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground">Metric</th>
                      <th className="text-right p-4 text-xs font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <Badge variant="secondary" className="text-[10px]">A</Badge>
                          {isBlind ? "System A" : comparison.exp1.name.length > 20 ? comparison.exp1.name.slice(0, 18) + "…" : comparison.exp1.name}
                        </div>
                      </th>
                      <th className="text-right p-4 text-xs font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <Badge variant="secondary" className="text-[10px]">B</Badge>
                          {isBlind ? "System B" : comparison.exp2.name.length > 20 ? comparison.exp2.name.slice(0, 18) + "…" : comparison.exp2.name}
                        </div>
                      </th>
                      <th className="text-right p-4 text-xs font-medium text-muted-foreground">Δ (B−A)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_METRICS.filter((m) => visibleMetrics.has(m.key)).map((m, i) => {
                      const v1 = (comparison.exp1 as any)[m.key];
                      const v2 = (comparison.exp2 as any)[m.key];
                      const diff = v1 != null && v2 != null ? v2 - v1 : null;
                      const fmt = (v: number) =>
                        m.key === "avgLatencyMs" ? `${Math.round(v)}ms` :
                        m.key === "runCount" ? String(v) :
                        v.toFixed(3);
                      return (
                        <tr key={m.key} className={`border-b border-border/50 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                          <td className="p-4 text-xs font-medium text-muted-foreground">{m.label}</td>
                          <td className={`p-4 text-right font-mono font-bold ${winner[m.key] === "exp1" ? "text-green-400" : ""}`}>
                            {v1 != null ? fmt(v1) : "—"}
                            {winner[m.key] === "exp1" && <Trophy className="w-3 h-3 inline ml-1 text-yellow-500" aria-hidden="true" />}
                          </td>
                          <td className={`p-4 text-right font-mono font-bold ${winner[m.key] === "exp2" ? "text-green-400" : ""}`}>
                            {v2 != null ? fmt(v2) : "—"}
                            {winner[m.key] === "exp2" && <Trophy className="w-3 h-3 inline ml-1 text-yellow-500" aria-hidden="true" />}
                          </td>
                          <td className="p-4 text-right">
                            <DiffBadge diff={diff} lowerIsBetter={!m.higherIsBetter} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Diff summary — hidden in blind mode */}
          {!isBlind && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Difference (B − A)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center space-y-1">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-widest font-medium">Faithfulness Δ</div>
                    <DiffBadge diff={comparison.diff.faithfulnessDiff} />
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-widest font-medium">Recall Δ</div>
                    <DiffBadge diff={comparison.diff.recallDiff} />
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-widest font-medium">Latency Δ</div>
                    <DiffBadge diff={comparison.diff.latencyDiff} lowerIsBetter />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts — hidden in blind mode */}
          {!isBlind && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {radarData.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Performance Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} />
                        <Radar name={comparison.exp1.name} dataKey="exp1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                        <Radar name={comparison.exp2.name} dataKey="exp2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                        <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", fontFamily: "monospace", fontSize: "12px", borderRadius: "6px" }}
                          formatter={(v: number) => `${v.toFixed(1)}%`}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {barData.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Score Comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="metric" tick={{ fontSize: 10, fontFamily: "monospace" }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 1]} tick={{ fontSize: 10, fontFamily: "monospace" }} stroke="hsl(var(--muted-foreground))" />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", fontFamily: "monospace", fontSize: "12px", borderRadius: "6px" }}
                          formatter={(v: number) => v.toFixed(3)}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                        <Bar name="Exp A" dataKey="A" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.85} />
                        <Bar name="Exp B" dataKey="B" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      ) : null}
    </motion.div>
  );
}
