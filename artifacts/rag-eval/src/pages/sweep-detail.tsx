import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useGetSweep, getGetSweepQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  ArrowLeft, Zap, Activity, CheckCircle2, Clock,
  FlaskConical, ArrowRight, Download, Search, X, SortAsc,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import { useRef, useCallback } from "react";

type StatusFilter = "all" | "evaluated" | "pending";

function exportSweepCsv(sweep: any) {
  const headers = ["experiment_id", "name", "chunk_size", "embedding_model", "retriever_type", "top_k", "best_faithfulness", "best_context_recall", "run_count"];
  const rows = (sweep.experiments ?? []).map((e: any) => [
    e.id,
    `"${(e.name ?? "").replace(/"/g, '""')}"`,
    e.chunkSize,
    e.embeddingModel,
    e.retrieverType,
    e.topK,
    e.bestFaithfulness ?? "",
    e.bestContextRecall ?? "",
    e.runCount,
  ]);
  const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sweep-${sweep.id}-results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const debouncedSearch = useDebounce(searchQuery);
  const searchRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => searchRef.current?.focus(), []);
  useKeyboardShortcut("k", focusSearch, { meta: true });
  useKeyboardShortcut("Escape", () => { if (searchQuery) setSearchQuery(""); });

  const filteredExps = useMemo(() => {
    let list = [...(sweep?.experiments ?? [])];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          (e.name ?? "").toLowerCase().includes(q) ||
          (e.embeddingModel ?? "").toLowerCase().includes(q) ||
          (e.retrieverType ?? "").toLowerCase().includes(q) ||
          String(e.chunkSize).includes(q)
      );
    }

    if (statusFilter === "evaluated") list = list.filter((e) => e.bestFaithfulness != null);
    else if (statusFilter === "pending") list = list.filter((e) => e.bestFaithfulness == null);

    list.sort((a, b) => {
      if (sortBy === "best-faithfulness") return (b.bestFaithfulness ?? -1) - (a.bestFaithfulness ?? -1);
      if (sortBy === "best-recall") return (b.bestContextRecall ?? -1) - (a.bestContextRecall ?? -1);
      if (sortBy === "chunk-asc") return a.chunkSize - b.chunkSize;
      if (sortBy === "chunk-desc") return b.chunkSize - a.chunkSize;
      if (sortBy === "name-asc") return (a.name ?? "").localeCompare(b.name ?? "");
      return 0;
    });

    return list;
  }, [sweep?.experiments, debouncedSearch, sortBy, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!sweep) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>Sweep not found.</p>
      <Link href="/sweeps"><Button variant="outline" className="mt-4">Back to Sweeps</Button></Link>
    </div>
  );

  const progress = sweep.totalExperiments > 0
    ? Math.round((sweep.completedExperiments / sweep.totalExperiments) * 100)
    : 0;

  const evaluated = (sweep.experiments ?? []).filter((e: any) => e.bestFaithfulness != null);
  const bestExp = evaluated.length > 0
    ? [...evaluated].sort((a: any, b: any) => (b.bestFaithfulness ?? 0) - (a.bestFaithfulness ?? 0))[0]
    : null;

  const statusCounts = {
    all: (sweep.experiments ?? []).length,
    evaluated: evaluated.length,
    pending: (sweep.experiments ?? []).length - evaluated.length,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="text-sm text-muted-foreground mb-4">
        <Link href="/sweeps">
          <span className="flex items-center w-fit hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Back to Sweeps
          </span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" aria-hidden="true" />
            {sweep.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className={`text-xs ${
              sweep.status === "completed" ? "border-success text-success bg-success/10" :
              sweep.status === "running" ? "border-warning text-warning bg-warning/10" : "border-border"
            }`}>
              {sweep.status === "running" && <Activity className="w-3 h-3 mr-1 animate-pulse" aria-hidden="true" />}
              {sweep.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" />}
              {sweep.status.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {format(new Date(sweep.createdAt), "MMM d, yyyy h:mm a")}
            </span>
          </div>
        </div>
        {(sweep.experiments?.length ?? 0) > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportSweepCsv(sweep)} aria-label="Export sweep results as CSV">
            <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Export CSV
          </Button>
        )}
      </div>

      {/* Progress card */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {sweep.completedExperiments} / {sweep.totalExperiments} experiments complete
            </span>
            <span className="font-bold text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {bestExp && (
            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
              <span className="text-primary font-medium">★ Best so far:</span>
              <span className="text-foreground truncate">{bestExp.name}</span>
              <span className="metric-green ml-auto shrink-0 font-mono">
                {bestExp.bestFaithfulness?.toFixed(3)} faithfulness
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best metrics */}
      {bestExp && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Best Faithfulness", val: bestExp.bestFaithfulness },
            { label: "Best Context Recall", val: bestExp.bestContextRecall },
          ].map(({ label, val }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-[10px] text-muted-foreground mb-2 font-medium">{label}</div>
                <div className={`text-2xl font-semibold ${
                  (val ?? 0) >= 0.8 ? "metric-green" : (val ?? 0) >= 0.5 ? "metric-amber" : "metric-red"
                }`}>
                  {val?.toFixed(3) ?? "—"}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-[10px] text-muted-foreground mb-2 font-medium">Total Experiments</div>
              <div className="text-2xl font-bold font-mono text-foreground">{sweep.totalExperiments}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Experiments list */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground pl-2 border-l-2 border-primary">
            Generated Experiments
            <span className="ml-2 text-xs text-muted-foreground/60 font-normal">
              ({filteredExps.length} of {sweep.experiments?.length ?? 0})
            </span>
          </h3>
        </div>

        {/* Search + status chips + sort */}
        {(sweep.experiments?.length ?? 0) > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <Input
                ref={searchRef}
                type="search"
                placeholder="Search experiments… (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
                aria-label="Search experiments"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex gap-2" role="group" aria-label="Filter by status">
              {(["all", "evaluated", "pending"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  aria-pressed={statusFilter === s}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
                </button>
              ))}
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48 bg-background" aria-label="Sort experiments">
                <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default order</SelectItem>
                <SelectItem value="best-faithfulness">Best faithfulness</SelectItem>
                <SelectItem value="best-recall">Best recall</SelectItem>
                <SelectItem value="chunk-asc">Chunk size ↑</SelectItem>
                <SelectItem value="chunk-desc">Chunk size ↓</SelectItem>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {!sweep.experiments?.length ? (
          <div className="text-center py-8 text-muted-foreground font-mono text-sm">
            Experiments are being created…
          </div>
        ) : filteredExps.length === 0 ? (
          <Card className="border-dashed border-2 border-border bg-transparent p-10 text-center">
            <div className="flex flex-col items-center text-muted-foreground">
              <Search className="w-8 h-8 mb-3 opacity-20" aria-hidden="true" />
              <p className="text-sm mb-2">No experiments match your filters.</p>
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                Clear filters
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3" role="list" aria-label="Sweep experiments">
            {filteredExps.map((exp: any, idx: number) => (
              <motion.div
                key={exp.id}
                role="listitem"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Link href={`/experiments/${exp.id}`}>
                  <div className="border border-border bg-card rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col md:flex-row md:items-center gap-4 hover-elevate group">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2 truncate">
                        <FlaskConical className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                        {exp.name}
                        {bestExp && exp.id === bestExp.id && (
                          <Badge className="text-[9px] bg-yellow-500/20 text-yellow-600 border-yellow-500/40 border ml-1">
                            ★ Best
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[
                          `chunk=${exp.chunkSize}`,
                          exp.embeddingModel.split("-").slice(-2).join("-"),
                          exp.retrieverType,
                          `k=${exp.topK}`,
                        ].map((tag) => (
                          <Badge key={tag} variant="secondary" className="font-mono text-[9px] bg-muted/50 text-muted-foreground">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-6 border-t md:border-t-0 md:border-l border-border/50 pt-3 md:pt-0 md:pl-4 shrink-0">
                      {[
                        { label: "Faithfulness", val: exp.bestFaithfulness },
                        { label: "Recall", val: exp.bestContextRecall },
                        { label: "Runs", val: null, text: String(exp.runCount) },
                      ].map(({ label, val, text }) => (
                        <div key={label} className="text-center">
                          <div className="text-[9px] font-mono uppercase text-muted-foreground mb-1">{label}</div>
                          <div className={`font-mono font-bold text-sm ${
                            text ? "text-muted-foreground" :
                            val == null ? "text-muted-foreground" :
                            val >= 0.8 ? "metric-green" :
                            val >= 0.5 ? "metric-amber" : "metric-red"
                          }`}>
                            {text ?? (val != null ? val.toFixed(3) : "…")}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:flex items-center text-muted-foreground shrink-0">
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
