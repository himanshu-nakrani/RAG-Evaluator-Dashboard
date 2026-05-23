import { useParams } from "wouter";
import { useGetEvalRun, getGetEvalRunQueryKey, useListChallengeAttempts } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import {
  ArrowLeft, Activity, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronRight, AlertTriangle, Download, Search, X, SortAsc, Copy, Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useState, useMemo, useRef, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 20;

function exportRunCsv(run: any) {
  const headers = ["question_id", "question", "faithfulness", "context_recall", "latency_ms", "generated_answer", "retrieved_context"];
  const rows = (run.results ?? []).map((r: any) => [
    r.questionId,
    `"${(r.questionText ?? "").replace(/"/g, '""')}"`,
    r.faithfulness ?? "",
    r.contextRecall ?? "",
    r.latencyMs ?? "",
    `"${(r.generatedAnswer ?? "").replace(/"/g, '""')}"`,
    `"${(r.retrievedContext ?? "").replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eval-run-${run.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ResultRow({ result, onCopy }: { result: any; onCopy: (r: any) => void }) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number | null | undefined) => {
    if (score == null) return "text-muted-foreground";
    if (score >= 0.8) return "metric-green";
    if (score >= 0.5) return "metric-amber";
    return "metric-red";
  };

  return (
    <div className="border-b border-border/50 last:border-0 bg-card hover:bg-muted/5 transition-colors">
      <div
        className="p-4 flex flex-col md:flex-row gap-4 cursor-pointer items-start md:items-center"
        onClick={() => setExpanded(!expanded)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            {expanded
              ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />}
            <span className="text-xs text-muted-foreground shrink-0 font-mono">Q{result.questionId}</span>
          </div>
          <p className="font-medium text-sm text-foreground pl-6 line-clamp-2">{result.questionText}</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto pl-6 md:pl-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/30">
          <div className="flex gap-4 flex-1">
            <div className="text-center w-20">
              <div className="text-[10px] text-muted-foreground mb-1 font-medium">Faithful</div>
              <div className={`font-bold text-sm ${getScoreColor(result.faithfulness)}`}>
                {result.faithfulness != null ? result.faithfulness.toFixed(2) : "—"}
              </div>
            </div>
            <div className="text-center w-20">
              <div className="text-[10px] text-muted-foreground mb-1 font-medium">Recall</div>
              <div className={`font-mono font-bold text-sm ${getScoreColor(result.contextRecall)}`}>
                {result.contextRecall != null ? result.contextRecall.toFixed(2) : "—"}
              </div>
            </div>
            <div className="text-center w-16 hidden sm:block">
              <div className="text-[10px] text-muted-foreground mb-1 font-medium">Time</div>
              <div className="text-sm text-muted-foreground font-mono">
                {result.latencyMs != null ? `${Math.round(result.latencyMs)}ms` : "—"}
              </div>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(result); }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 rounded hover:bg-muted"
            aria-label="Copy result as JSON"
            title="Copy as JSON"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 bg-muted/10 grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-border/50">
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                  Generated Answer
                  {result.faithfulness != null && result.faithfulness < 0.5 && (
                    <Badge variant="outline" className="text-[9px] border-destructive text-destructive h-4 px-1 py-0 rounded-sm ml-auto">
                      Low Faithfulness
                    </Badge>
                  )}
                </div>
                <div className="bg-background border border-border rounded-md p-4 text-sm font-sans whitespace-pre-wrap text-foreground/90 h-56 overflow-y-auto">
                  {result.generatedAnswer || <span className="italic text-muted-foreground">No answer generated</span>}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                  Retrieved Context
                  {result.contextRecall != null && result.contextRecall < 0.5 && (
                    <Badge variant="outline" className="text-[9px] border-warning text-warning h-4 px-1 py-0 rounded-sm ml-auto">
                      Low Recall
                    </Badge>
                  )}
                </div>
                <div className="bg-background border border-border rounded-md p-4 text-xs font-mono whitespace-pre-wrap text-muted-foreground h-56 overflow-y-auto opacity-80 leading-relaxed">
                  {result.retrievedContext || <span className="italic">No context retrieved</span>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EvalRunDetail() {
  const { id } = useParams();
  const runId = Number(id);
  const { toast } = useToast();

  const challengeId = new URLSearchParams(window.location.search).get("challenge");
  const { data: attempts } = useListChallengeAttempts();
  const challengeAttempt = challengeId
    ? (attempts ?? []).find((a) => a.id === Number(challengeId))
    : null;

  const { data: run, isLoading } = useGetEvalRun(runId, {
    query: {
      enabled: !!runId,
      queryKey: getGetEvalRunQueryKey(runId),
      refetchInterval: (data: any) =>
        data?.status === "running" || data?.status === "pending" ? 2000 : false,
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("question-id");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchQuery);
  const searchRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcut("k", () => searchRef.current?.focus(), { meta: true });
  useKeyboardShortcut("Escape", () => { if (searchQuery) setSearchQuery(""); });

  const handleCopy = useCallback((result: any) => {
    const json = JSON.stringify({
      questionId: result.questionId,
      question: result.questionText,
      faithfulness: result.faithfulness,
      contextRecall: result.contextRecall,
      latencyMs: result.latencyMs,
      generatedAnswer: result.generatedAnswer,
      retrievedContext: result.retrievedContext,
    }, null, 2);
    navigator.clipboard.writeText(json).then(() =>
      toast({ title: "Copied result as JSON" })
    ).catch(() =>
      toast({ title: "Copy failed", variant: "destructive" })
    );
  }, [toast]);

  const filteredResults = useMemo(() => {
    let results = [...(run?.results ?? [])];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      results = results.filter(
        (r) =>
          (r.questionText ?? "").toLowerCase().includes(q) ||
          String(r.questionId).includes(q)
      );
    }

    if (scoreFilter === "high") results = results.filter((r) => (r.faithfulness ?? 0) >= 0.8);
    else if (scoreFilter === "mid") results = results.filter((r) => r.faithfulness != null && r.faithfulness >= 0.5 && r.faithfulness < 0.8);
    else if (scoreFilter === "low") results = results.filter((r) => (r.faithfulness ?? 1) < 0.5);

    results.sort((a, b) => {
      if (sortBy === "faithfulness-desc") return (b.faithfulness ?? -1) - (a.faithfulness ?? -1);
      if (sortBy === "faithfulness-asc") return (a.faithfulness ?? 2) - (b.faithfulness ?? 2);
      if (sortBy === "recall-desc") return (b.contextRecall ?? -1) - (a.contextRecall ?? -1);
      if (sortBy === "latency-asc") return (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity);
      return a.questionId - b.questionId;
    });

    return results;
  }, [run?.results, debouncedSearch, sortBy, scoreFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredResults.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  if (!run) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>Run not found.</p>
      <Link href="/experiments"><Button variant="outline" className="mt-4">Back to Experiments</Button></Link>
    </div>
  );

  const isRunning = run.status === "running" || run.status === "pending";
  const isFailed = run.status === "failed";
  const progress = isRunning && run.results?.length
    ? Math.round((run.results.filter((r: any) => r.generatedAnswer != null).length / run.results.length) * 100)
    : isRunning ? 5 : 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <Link href={`/experiments/${run.experimentId}`}>
          <span className="flex items-center hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Back to Experiment
          </span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            Run #{run.id}
            {isRunning && <Activity className="w-6 h-6 text-warning animate-pulse" aria-hidden="true" />}
            {run.status === "completed" && <CheckCircle2 className="w-6 h-6 text-success" aria-hidden="true" />}
            {isFailed && <XCircle className="w-6 h-6 text-destructive" aria-hidden="true" />}
          </h1>
          <div className="text-sm text-muted-foreground mt-2 flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {format(new Date(run.createdAt), "MMM d, yyyy h:mm a")}
            </span>
            {run.completedAt && <span>Completed: {format(new Date(run.completedAt), "h:mm:ss a")}</span>}
          </div>
        </div>
        {challengeAttempt && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Daily Challenge — {challengeAttempt.challengeDate}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {challengeAttempt.score != null ? (
                    <span className="text-amber-400 font-bold text-base">{challengeAttempt.score}/100</span>
                  ) : (
                    <span>Evaluating…</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {run.results && run.results.length > 0 && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => exportRunCsv(run)} aria-label="Export run results as CSV">
            <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Export CSV
          </Button>
        )}
      </div>

      {isRunning && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-6">
            <div className="flex justify-between text-sm mb-2 text-warning">
              <span>Evaluation in progress…</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-warning/20" />
            <p className="text-xs text-muted-foreground mt-4 opacity-70">
              Running inference and LLM-as-a-judge metrics. This page auto-refreshes.
            </p>
          </CardContent>
        </Card>
      )}

      {isFailed && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-destructive shrink-0" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-destructive">Evaluation Run Failed</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The pipeline encountered an error. Check your experiment configuration and document accessibility, then try running again.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isFailed && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Avg Faithfulness", val: run.avgFaithfulness, fmt: (v: number) => v.toFixed(3), colorize: true },
            { label: "Avg Context Recall", val: run.avgContextRecall, fmt: (v: number) => v.toFixed(3), colorize: true },
            { label: "Avg Latency", val: run.avgLatencyMs, fmt: (v: number) => `${Math.round(v)}ms`, colorize: false },
          ].map(({ label, val, fmt, colorize }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-xs font-medium uppercase text-muted-foreground mb-2">{label}</div>
                <div className={`text-3xl font-bold ${
                  colorize ? (
                    !val ? "text-muted-foreground" :
                    val >= 0.8 ? "metric-green" :
                    val >= 0.5 ? "metric-amber" : "metric-red"
                  ) : "text-foreground"
                }`}>
                  {val != null ? fmt(val) : (isRunning ? "…" : "—")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {run.results && run.results.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground pl-2 border-l-2 border-primary">
              Per-Question Breakdown
              <span className="ml-2 text-xs text-muted-foreground/60 normal-case tracking-normal">
                ({filteredResults.length} of {run.results.length})
              </span>
            </h3>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <Input
                ref={searchRef}
                type="search"
                placeholder="Search questions… (⌘K)"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9 bg-background"
                aria-label="Search questions"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Score filter chips */}
            <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by score">
              {[
                { value: "all", label: "All" },
                { value: "high", label: "High (≥0.8)" },
                { value: "mid", label: "Mid (0.5–0.8)" },
                { value: "low", label: "Low (<0.5)" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setScoreFilter(f.value); setPage(1); }}
                  aria-pressed={scoreFilter === f.value}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    scoreFilter === f.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48 bg-background" aria-label="Sort results">
                <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="question-id">Question order</SelectItem>
                <SelectItem value="faithfulness-desc">Best faithfulness</SelectItem>
                <SelectItem value="faithfulness-asc">Worst faithfulness</SelectItem>
                <SelectItem value="recall-desc">Best recall</SelectItem>
                <SelectItem value="latency-asc">Fastest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredResults.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-border rounded-lg bg-card/50 text-muted-foreground text-sm">
              <p>No results match your filters.</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setScoreFilter("all"); }} className="mt-2">
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
                {paginated.map((result: any) => (
                  <ResultRow key={result.id} result={result} onCopy={handleCopy} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">
                    Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredResults.length)} of {filteredResults.length}
                  </p>
                  <Pagination className="w-auto mx-0">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          aria-disabled={safePage === 1}
                          className={safePage === 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <span className="text-xs text-muted-foreground px-3 py-2">{safePage} / {totalPages}</span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          aria-disabled={safePage === totalPages}
                          className={safePage === totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
