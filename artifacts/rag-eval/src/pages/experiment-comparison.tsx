import { useState } from "react";
import { useCompareExperiments, useListExperiments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";

function DiffBadge({ diff, lowerIsBetter = false }: { diff: number | null; lowerIsBetter?: boolean }) {
  if (diff === null) return <span className="text-muted-foreground">—</span>;
  const isPositive = lowerIsBetter ? diff < 0 : diff > 0;
  const isNegative = lowerIsBetter ? diff > 0 : diff < 0;
  return (
    <div className={`flex items-center gap-1 font-mono font-bold text-sm ${isPositive ? "text-green-400" : isNegative ? "text-red-400" : "text-muted-foreground"}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {diff > 0 ? "+" : ""}{typeof diff === "number" && Math.abs(diff) < 1 ? diff.toFixed(3) : Math.round(diff)}
      {lowerIsBetter && diff !== 0 ? "ms" : ""}
    </div>
  );
}

export default function ExperimentComparison() {
  const { data: experiments, isLoading: expsLoading } = useListExperiments();
  const [selectedExp1, setSelectedExp1] = useState("");
  const [selectedExp2, setSelectedExp2] = useState("");

  const id1 = Number(selectedExp1);
  const id2 = Number(selectedExp2);

  const { data: comparison, isLoading: compLoading } = useCompareExperiments(id1, id2, {
    query: { enabled: !!id1 && !!id2 && id1 !== id2 },
  });

  const radarData = comparison
    ? [
        {
          metric: "Faithfulness",
          exp1: (comparison.exp1.bestFaithfulness ?? 0) * 100,
          exp2: (comparison.exp2.bestFaithfulness ?? 0) * 100,
        },
        {
          metric: "Recall",
          exp1: (comparison.exp1.bestContextRecall ?? 0) * 100,
          exp2: (comparison.exp2.bestContextRecall ?? 0) * 100,
        },
        {
          metric: "Speed",
          exp1: comparison.exp1.avgLatencyMs
            ? Math.max(0, 100 - comparison.exp1.avgLatencyMs / 10)
            : 0,
          exp2: comparison.exp2.avgLatencyMs
            ? Math.max(0, 100 - comparison.exp2.avgLatencyMs / 10)
            : 0,
        },
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-3">
          <Scale className="w-8 h-8 text-primary" />
          Compare Experiments
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">
          Side-by-side experiment metrics comparison
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Experiment A
              </label>
              <Select value={selectedExp1} onValueChange={setSelectedExp1} disabled={expsLoading}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Experiment B
              </label>
              <Select value={selectedExp2} onValueChange={setSelectedExp2} disabled={expsLoading}>
                <SelectTrigger>
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
          </div>
        </CardContent>
      </Card>

      {!selectedExp1 || !selectedExp2 ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="text-muted-foreground font-mono">
            <Scale className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Select two experiments to compare their metrics</p>
          </div>
        </Card>
      ) : compLoading ? (
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : comparison ? (
        <>
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
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-semibold">{exp.name}</CardTitle>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {idx === 0 ? "A" : "B"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground border border-border/50 rounded-lg p-3 bg-muted/20">
                      <div>
                        <span className="opacity-60">Chunk</span>
                        <div className="text-foreground font-bold">{exp.chunkSize}</div>
                      </div>
                      <div>
                        <span className="opacity-60">Top-K</span>
                        <div className="text-foreground font-bold">{exp.topK}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="opacity-60">Retriever</span>
                        <div className="text-foreground font-bold">{exp.retrieverType}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="opacity-60">Embedding</span>
                        <div className="text-foreground font-bold truncate">{exp.embeddingModel}</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-xs text-muted-foreground uppercase tracking-widest">
                          Faithfulness
                        </span>
                        <span className="text-2xl font-bold text-green-400">
                          {exp.bestFaithfulness != null ? exp.bestFaithfulness.toFixed(3) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-xs text-muted-foreground uppercase tracking-widest">
                          Recall
                        </span>
                        <span className="text-2xl font-bold text-blue-400">
                          {exp.bestContextRecall != null ? exp.bestContextRecall.toFixed(3) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-xs text-muted-foreground uppercase tracking-widest">
                          Latency
                        </span>
                        <span className="text-lg font-bold text-muted-foreground">
                          {exp.avgLatencyMs != null ? `${Math.round(exp.avgLatencyMs)}ms` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-xs text-muted-foreground uppercase tracking-widest">
                          Runs
                        </span>
                        <span className="text-lg font-bold">{exp.runCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Difference (B − A)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center space-y-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
                    Faithfulness Δ
                  </div>
                  <DiffBadge diff={comparison.diff.faithfulnessDiff} />
                </div>
                <div className="text-center space-y-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
                    Recall Δ
                  </div>
                  <DiffBadge diff={comparison.diff.recallDiff} />
                </div>
                <div className="text-center space-y-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
                    Latency Δ
                  </div>
                  <DiffBadge diff={comparison.diff.latencyDiff} lowerIsBetter />
                </div>
              </div>
            </CardContent>
          </Card>

          {radarData.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Performance Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 11, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      name={comparison.exp1.name}
                      dataKey="exp1"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                    />
                    <Radar
                      name={comparison.exp2.name}
                      dataKey="exp2"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.2}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        borderRadius: "6px",
                      }}
                      formatter={(v: number) => `${v.toFixed(1)}%`}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </motion.div>
  );
}
