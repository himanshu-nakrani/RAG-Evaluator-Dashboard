import { useState, useMemo, useCallback } from "react";
import { useParams } from "wouter";
import {
  useGetExperiment,
  useCreateEvalRun,
  useCompareExperimentRuns,
  getGetExperimentQueryKey,
  getCompareExperimentRunsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import {
  FlaskConical, ArrowLeft, ArrowRight, Play, Settings,
  BarChart2, Activity, Search, X, SortAsc, Download, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from "recharts";

function exportRunsCsv(runs: any[], expName: string) {
  const headers = ["run_id", "run_number", "status", "avg_faithfulness", "avg_context_recall", "avg_latency_ms", "created_at"];
  const rows = runs.map((r) => [
    r.id,
    r.runNumber ?? r.id,
    r.status,
    r.avgFaithfulness ?? "",
    r.avgContextRecall ?? "",
    r.avgLatencyMs != null ? Math.round(r.avgLatencyMs) : "",
    r.createdAt,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${expName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-runs.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseApiError(err: unknown): string {
  const msg = String(err);
  if (/rate limit/i.test(msg)) return "Rate limit reached. Wait a moment before starting a new run.";
  if (/network|fetch|failed to fetch/i.test(msg)) return "Network error. Check your connection and try again.";
  return msg.replace(/^Error:\s*/i, "") || "Something went wrong.";
}

export default function ExperimentDetail() {
  const { id } = useParams();
  const expId = Number(id);
  const { data: exp, isLoading: expLoading } = useGetExperiment(expId, {
    query: { enabled: !!expId, queryKey: getGetExperimentQueryKey(expId), refetchInterval: 5000 },
  });
  const { data: comparison } = useCompareExperimentRuns(expId, {
    query: { enabled: !!expId, queryKey: getCompareExperimentRunsQueryKey(expId) },
  });

  const createRun = useCreateEvalRun();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const debouncedSearch = useDebounce(searchQuery);

  const handleRunEval = useCallback(async () => {
    if (!exp) return;
    createRun.mutate(
      { id: expId, data: { questionSetId: exp.questionSetId } },
      {
        onSuccess: () => {
          toast({ title: "Evaluation run started", description: "Results will appear as they complete." });
          queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(expId) });
          queryClient.invalidateQueries({ queryKey: getCompareExperimentRunsQueryKey(expId) });
        },
        onError: (err) => {
          toast({ title: "Failed to start run", description: parseApiError(err), variant: "destructive" });
        },
      }
    );
  }, [exp, expId, createRun, queryClient, toast]);

  useKeyboardShortcut("r", handleRunEval, { meta: true, enabled: !!exp && !createRun.isPending });

  const filteredRuns = useMemo(() => {
    let runs = [...(exp?.runs ?? [])];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      runs = runs.filter(
        (r) =>
          String(r.id).includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }
    runs.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "best-faithfulness") return (b.avgFaithfulness ?? -1) - (a.avgFaithfulness ?? -1);
      if (sortBy === "best-recall") return (b.avgContextRecall ?? -1) - (a.avgContextRecall ?? -1);
      if (sortBy === "fastest") return (a.avgLatencyMs ?? Infinity) - (b.avgLatencyMs ?? Infinity);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return runs;
  }, [exp?.runs, debouncedSearch, sortBy]);

  const chartData = comparison?.runs?.map((r: any) => ({
    run: `Run ${r.runNumber}`,
    Faithfulness: r.avgFaithfulness || 0,
    ContextRecall: r.avgContextRecall || 0,
  })).reverse() ?? [];

  if (expLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!exp) {
    return (
      <div className="text-center py-20">
        <FlaskConical className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">Experiment not found or was deleted.</p>
        <Link href="/experiments"><Button variant="outline" className="mt-4">Back to Experiments</Button></Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <Link href="/experiments">
          <span className="flex items-center hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Back to Experiments
          </span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-primary" aria-hidden="true" />
            {exp.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {(exp.runs?.length ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportRunsCsv(exp.runs ?? [], exp.name)}
              aria-label="Export runs as CSV"
            >
              <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Export CSV
            </Button>
          )}
          <Button
            onClick={handleRunEval}
            disabled={createRun.isPending}
            className="shadow-md hover-elevate"
            aria-label="Run evaluation (⌘R)"
            title="Run Evaluation (⌘R)"
          >
            {createRun.isPending ? (
              <Activity className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 mr-2 fill-current" aria-hidden="true" />
            )}
            {createRun.isPending ? "Starting..." : "Run Evaluation"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <Settings className="w-4 h-4" aria-hidden="true" /> Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {[
                { label: "Embedding", value: <Badge variant="outline">{exp.embeddingModel}</Badge> },
                { label: "Retriever", value: <Badge variant="outline">{exp.retrieverType}</Badge> },
                { label: "Chunk Size", value: <span className="text-sm font-mono font-medium">{exp.chunkSize}</span> },
                { label: "Overlap", value: <span className="text-sm font-mono font-medium">{exp.chunkOverlap}</span> },
                { label: "Top K", value: <span className="text-sm font-mono font-medium">{exp.topK}</span> },
              ].map(({ label, value }, i) => (
                <div key={label} className={`p-4 flex justify-between items-center ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <span className="text-xs text-muted-foreground font-medium">{label}</span>
                  {value}
                </div>
              ))}
              <div className="p-4 text-xs text-muted-foreground flex flex-col gap-1 bg-muted/20 font-mono">
                <div>Doc ID: {exp.documentId}</div>
                <div>Questions ID: {exp.questionSetId}</div>
              </div>
            </div>
          </CardContent>

          {/* Summary stats */}
          {(exp.runs?.length ?? 0) > 0 && (
            <div className="border-t border-border/50 p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Best Results</div>
              {[
                {
                  label: "Faithfulness",
                  value: exp.bestFaithfulness,
                  cls: exp.bestFaithfulness == null ? "text-muted-foreground" :
                    exp.bestFaithfulness >= 0.8 ? "metric-green" :
                    exp.bestFaithfulness >= 0.5 ? "metric-amber" : "metric-red",
                },
                {
                  label: "Context Recall",
                  value: exp.bestContextRecall,
                  cls: exp.bestContextRecall == null ? "text-muted-foreground" :
                    exp.bestContextRecall >= 0.8 ? "metric-green" :
                    exp.bestContextRecall >= 0.5 ? "metric-amber" : "metric-red",
                },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className={`font-bold font-mono text-sm ${cls}`}>
                    {value != null ? value.toFixed(3) : "—"}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Runs</span>
                <span className="font-bold text-sm">{exp.runCount ?? exp.runs?.length}</span>
              </div>
              <Link href={`/experiments/${expId}/trends`}>
                <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                  <TrendingUp className="w-3 h-3 mr-1.5" aria-hidden="true" /> View Trends
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <div className="col-span-1 lg:col-span-2 space-y-6">
          {chartData.length > 1 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                  <BarChart2 className="w-4 h-4" aria-hidden="true" /> Metric Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="run" tick={{ fontSize: 10, fontFamily: "monospace" }} stroke="var(--color-muted-foreground)" />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10, fontFamily: "monospace" }} stroke="var(--color-muted-foreground)" />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "var(--color-popover)", borderColor: "var(--color-border)", borderRadius: "6px", fontFamily: "monospace", fontSize: "12px" }}
                      itemStyle={{ color: "var(--color-foreground)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "monospace" }} />
                    <Line type="monotone" dataKey="Faithfulness" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="ContextRecall" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Runs header + toolbar */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" aria-hidden="true" />
                Evaluation Runs
                {filteredRuns.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">({filteredRuns.length})</span>
                )}
              </h3>
              {(exp.runs?.length ?? 0) > 1 && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none sm:w-52">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
                    <Input
                      type="search"
                      placeholder="Filter runs…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs bg-background"
                      aria-label="Filter runs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear filter"
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-8 w-40 text-xs bg-background" aria-label="Sort runs">
                      <SortAsc className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" aria-hidden="true" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="best-faithfulness">Best faithfulness</SelectItem>
                      <SelectItem value="best-recall">Best recall</SelectItem>
                      <SelectItem value="fastest">Fastest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {(!exp.runs || exp.runs.length === 0) ? (
              <div className="text-center p-10 border border-dashed border-border rounded-lg bg-card/50 text-muted-foreground text-sm">
                <Play className="w-8 h-8 mx-auto mb-3 opacity-20" aria-hidden="true" />
                <p className="mb-1 font-medium">No evaluation runs yet</p>
                <p className="text-xs opacity-70">Click "Run Evaluation" (or press ⌘R) to start testing this pipeline.</p>
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-border rounded-lg bg-card/50 text-muted-foreground text-sm">
                <p>No runs match your filter.</p>
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="mt-2">Clear filter</Button>
              </div>
            ) : (
              <div className="space-y-3" role="list" aria-label="Evaluation runs">
                {filteredRuns.map((run, idx) => (
                  <motion.div key={run.id} role="listitem" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                    <Link href={`/eval-runs/${run.id}`}>
                      <div className="border border-border bg-card rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col md:flex-row md:items-center gap-4 hover-elevate group">
                        <div className="w-full md:w-1/4">
                          <div className="font-semibold text-foreground flex items-center gap-2 group-hover:text-primary transition-colors">
                            Run #{run.id}
                            {run.status === "running" && <Activity className="w-3 h-3 text-warning animate-pulse" aria-hidden="true" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(run.createdAt), "MMM d, h:mm a")}
                          </div>
                          <Badge variant="outline" className={`mt-2 text-[10px] ${
                            run.status === "completed" ? "border-success text-success bg-success/10" :
                            run.status === "failed" ? "border-destructive text-destructive bg-destructive/10" :
                            "border-warning text-warning bg-warning/10"
                          }`}>
                            {run.status.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="flex-1 flex justify-around sm:justify-start sm:gap-12 border-t md:border-t-0 md:border-l border-border/50 pt-3 md:pt-0 md:pl-6">
                          {[
                            { label: "Faithfulness", val: run.avgFaithfulness },
                            { label: "Context Recall", val: run.avgContextRecall },
                          ].map(({ label, val }) => (
                            <div key={label} className="text-center md:text-left">
                              <div className="text-[10px] text-muted-foreground mb-1 font-medium">{label}</div>
                              <div className={`font-semibold text-lg ${
                                run.status !== "completed" ? "text-muted-foreground" :
                                (val ?? 0) >= 0.8 ? "metric-green" :
                                (val ?? 0) >= 0.5 ? "metric-amber" : "metric-red"
                              }`}>
                                {run.status === "completed" && val != null ? val.toFixed(3) : "—"}
                              </div>
                            </div>
                          ))}
                          <div className="text-center md:text-left hidden sm:block">
                            <div className="text-[10px] uppercase text-muted-foreground mb-1 font-medium">Latency</div>
                            <div className="font-bold text-lg text-foreground">
                              {run.status === "completed" && run.avgLatencyMs != null ? `${Math.round(run.avgLatencyMs)}ms` : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center text-muted-foreground">
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
