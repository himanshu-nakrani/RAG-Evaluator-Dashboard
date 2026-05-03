import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  useListSweeps,
  useCreateSweep,
  useListDocuments,
  useListQuestionSets,
  getListSweepsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import { Zap, Plus, ArrowRight, Activity, CheckCircle2, Clock, Grid3X3, Search, X, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const ITEMS_PER_PAGE = 10;
const CHUNK_SIZE_OPTIONS = [128, 256, 512, 1024, 2048];
const EMBEDDING_MODEL_OPTIONS = [
  "text-embedding-3-small",
  "text-embedding-3-large",
  "text-embedding-ada-002",
];
const RETRIEVER_TYPE_OPTIONS = ["similarity", "mmr", "hybrid"];

type StatusFilter = "all" | "running" | "completed" | "pending";

function parseApiError(err: unknown): string {
  const msg = String(err);
  if (/duplicate|unique|already exists/i.test(msg))
    return "A sweep with that name already exists. Please choose a different name.";
  if (/network|fetch|failed to fetch/i.test(msg))
    return "Network error. Check your connection and try again.";
  return msg.replace(/^Error:\s*/i, "") || "Something went wrong. Please try again.";
}

function FieldTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label="More information" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[240px] text-xs leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Sweeps() {
  const { data: sweeps, isLoading } = useListSweeps({
    query: {
      queryKey: getListSweepsQueryKey(),
      refetchInterval: (data) =>
        Array.isArray(data) && data.some((s: any) => s.status === "running") ? 3000 : false,
    },
  });
  const { data: documents } = useListDocuments();
  const { data: questionSets } = useListQuestionSets();
  const createSweep = useCreateSweep();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [questionSetId, setQuestionSetId] = useState("");
  const [selectedChunkSizes, setSelectedChunkSizes] = useState<number[]>([256, 512]);
  const [selectedEmbeddings, setSelectedEmbeddings] = useState<string[]>(["text-embedding-3-small"]);
  const [selectedRetrievers, setSelectedRetrievers] = useState<string[]>(["similarity"]);
  const [topK, setTopK] = useState("5");
  const [chunkOverlap, setChunkOverlap] = useState("50");

  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => (new URLSearchParams(window.location.search).get("status") as StatusFilter) ?? "all");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchQuery);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const qs = params.toString();
    history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [searchQuery, statusFilter]);

  const searchRef = useRef<HTMLInputElement>(null);

  const openNew = useCallback(() => setOpen(true), []);
  const focusSearch = useCallback(() => searchRef.current?.focus(), []);
  useKeyboardShortcut("n", openNew, { meta: true });
  useKeyboardShortcut("k", focusSearch, { meta: true });
  useKeyboardShortcut("Escape", () => {
    if (searchQuery) { setSearchQuery(""); setPage(1); }
  });

  const totalCombinations = selectedChunkSizes.length * selectedEmbeddings.length * selectedRetrievers.length;

  const toggleItem = <T,>(arr: T[], item: T, set: (v: T[]) => void) => {
    set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const filtered = useMemo(() => {
    let list = [...(sweeps ?? [])];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter);
    }
    return list;
  }, [sweeps, debouncedSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const statusCounts = useMemo(() => {
    const counts = { running: 0, completed: 0, pending: 0 };
    (sweeps ?? []).forEach((s) => {
      if (s.status in counts) counts[s.status as keyof typeof counts]++;
    });
    return counts;
  }, [sweeps]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !documentId || !questionSetId) return;
    if (totalCombinations === 0) {
      toast({ title: "Select at least one option for each sweep dimension.", variant: "destructive" });
      return;
    }

    createSweep.mutate(
      {
        data: {
          name: name.trim(),
          documentId: Number(documentId),
          questionSetId: Number(questionSetId),
          chunkSizes: selectedChunkSizes,
          embeddingModels: selectedEmbeddings,
          retrieverTypes: selectedRetrievers,
          topK: Number(topK),
          chunkOverlap: Number(chunkOverlap),
          autoRun: true,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: `Sweep launched — ${totalCombinations} experiments`,
            description: "Evaluation runs will start automatically.",
          });
          queryClient.invalidateQueries({ queryKey: getListSweepsQueryKey() });
          setOpen(false);
          setName("");
        },
        onError: (err) =>
          toast({ title: "Failed to create sweep", description: parseApiError(err), variant: "destructive" }),
      }
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <Zap className="w-7 h-7 text-primary" aria-hidden="true" />
            Parameter Sweeps
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Auto-generate a grid of experiments by sweeping over multiple parameter values.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button aria-label="Create new sweep (⌘N)">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> New Sweep
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] border-border bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Parameter Sweep</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Sweep Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Chunk Size Study v2"
                  className="bg-background"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border border-border p-4 rounded-lg bg-background/50">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Document</Label>
                  <Select value={documentId} onValueChange={setDocumentId}>
                    <SelectTrigger aria-label="Select document">
                      <SelectValue placeholder="Select Document" />
                    </SelectTrigger>
                    <SelectContent>
                      {documents?.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Question Set</Label>
                  <Select value={questionSetId} onValueChange={setQuestionSetId}>
                    <SelectTrigger aria-label="Select question set">
                      <SelectValue placeholder="Select Set" />
                    </SelectTrigger>
                    <SelectContent>
                      {questionSets?.map((qs) => (
                        <SelectItem key={qs.id} value={String(qs.id)}>{qs.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 border border-border p-4 rounded-lg bg-background/50">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-primary" aria-hidden="true" /> Sweep Dimensions
                  <Badge variant="outline" className="ml-auto text-xs">
                    {totalCombinations} combination{totalCombinations !== 1 ? "s" : ""}
                  </Badge>
                </h4>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block font-medium flex items-center gap-1.5">
                    Chunk Sizes (tokens)
                    <FieldTooltip content="Select one or more chunk sizes to test. The sweep will run an experiment for each unique combination of chunk size, embedding model, and retriever type." />
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {CHUNK_SIZE_OPTIONS.map((cs) => (
                      <label key={cs} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedChunkSizes.includes(cs)}
                          onCheckedChange={() => toggleItem(selectedChunkSizes, cs, setSelectedChunkSizes)}
                          aria-label={`Chunk size ${cs}`}
                        />
                        <span className="font-mono text-sm text-foreground">{cs}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block font-medium flex items-center gap-1.5">
                    Embedding Models
                    <FieldTooltip content="Select one or more OpenAI embedding models. Each model produces different vector representations — sweeping across them reveals which model works best for your data." />
                  </Label>
                  <div className="flex flex-col gap-2">
                    {EMBEDDING_MODEL_OPTIONS.map((em) => (
                      <label key={em} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedEmbeddings.includes(em)}
                          onCheckedChange={() => toggleItem(selectedEmbeddings, em, setSelectedEmbeddings)}
                          aria-label={`Embedding model ${em}`}
                        />
                        <span className="font-mono text-sm text-foreground">{em}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block font-medium flex items-center gap-1.5">
                    Retriever Types
                    <FieldTooltip content="Similarity uses pure vector search. MMR (Max Marginal Relevance) reduces redundancy in retrieved chunks. Hybrid combines keyword and vector search." />
                  </Label>
                  <div className="flex flex-wrap gap-4">
                    {RETRIEVER_TYPE_OPTIONS.map((rt) => (
                      <label key={rt} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedRetrievers.includes(rt)}
                          onCheckedChange={() => toggleItem(selectedRetrievers, rt, setSelectedRetrievers)}
                          aria-label={`Retriever type ${rt}`}
                        />
                        <span className="font-mono text-sm text-foreground">{rt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      Top K
                      <FieldTooltip content="How many chunks to retrieve per query. Applied uniformly across all sweep experiments. Typical range: 3–10." />
                    </Label>
                    <Input
                      type="number"
                      value={topK}
                      onChange={(e) => setTopK(e.target.value)}
                      className="bg-background font-mono"
                      min="1"
                      aria-label="Top K value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      Chunk Overlap
                      <FieldTooltip content="Tokens shared between adjacent chunks. Applied uniformly across all sweep experiments. Typically 10–20% of chunk size." />
                    </Label>
                    <Input
                      type="number"
                      value={chunkOverlap}
                      onChange={(e) => setChunkOverlap(e.target.value)}
                      className="bg-background font-mono"
                      min="0"
                      aria-label="Chunk overlap value"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  type="submit"
                  disabled={createSweep.isPending || totalCombinations === 0 || !documentId || !questionSetId}
                  className="w-full sm:w-auto"
                >
                  {createSweep.isPending ? "Launching..." : `Launch ${totalCombinations} Experiment${totalCombinations !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + Status filter */}
      {(sweeps?.length ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              ref={searchRef}
              type="search"
              placeholder="Search sweeps… (⌘K)"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 bg-background"
              aria-label="Search sweeps"
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

          {/* Status filter chips */}
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter by status">
            {(["all", "running", "completed", "pending"] as StatusFilter[]).map((s) => {
              const count = s === "all" ? (sweeps?.length ?? 0) : statusCounts[s as keyof typeof statusCounts];
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  aria-pressed={statusFilter === s}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                </button>
              );
            })}
          </div>
          {(searchQuery || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); setPage(1); }}
              className="shrink-0 text-muted-foreground hover:text-foreground text-xs h-9 px-3"
              aria-label="Clear all filters"
            >
              <X className="w-3 h-3 mr-1" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : !sweeps?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center mt-8">
          <div className="flex flex-col items-center text-muted-foreground">
            <Zap className="w-12 h-12 mb-4 opacity-20" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-2">No sweeps yet</h3>
            <p className="text-sm mb-6 max-w-md">
              Create a parameter sweep to automatically generate and run a grid of experiments.
            </p>
            <Button onClick={() => setOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Create First Sweep
            </Button>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="flex flex-col items-center text-muted-foreground">
            <Search className="w-10 h-10 mb-4 opacity-20" aria-hidden="true" />
            <h3 className="text-base font-medium mb-2">
              {searchQuery ? `No sweeps match "${searchQuery}"` : `No ${statusFilter} sweeps`}
            </h3>
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
              Clear filters
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="space-y-4" role="list" aria-label="Parameter sweeps">
            {paginated.map((sweep, idx) => (
              <motion.div
                key={sweep.id}
                role="listitem"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Link href={`/sweeps/${sweep.id}`}>
                  <Card className="hover-elevate bg-card border-border cursor-pointer hover:border-primary/50 transition-colors group">
                    <div className="flex flex-col md:flex-row">
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                              <Zap className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                              {sweep.name}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge
                                variant="outline"
                                className={`font-mono text-[10px] ${
                                  sweep.status === "completed"
                                    ? "border-success text-success bg-success/10"
                                    : sweep.status === "running"
                                    ? "border-warning text-warning bg-warning/10"
                                    : "border-border"
                                }`}
                              >
                                {sweep.status === "running" && (
                                  <Activity className="w-2.5 h-2.5 mr-1 animate-pulse" aria-hidden="true" />
                                )}
                                {sweep.status === "completed" && (
                                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" aria-hidden="true" />
                                )}
                                {sweep.status.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary" className="font-mono text-[10px] bg-muted/50 text-muted-foreground">
                                {sweep.totalExperiments} experiments
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            {format(new Date(sweep.createdAt), "MMM d, h:mm a")}
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-48 border-t md:border-t-0 md:border-l border-border bg-background/30 p-5 flex flex-col justify-center gap-3">
                        <div>
                          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Progress</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={sweep.totalExperiments > 0 ? Math.round((sweep.completedExperiments / sweep.totalExperiments) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
                              <div
                                className="h-full bg-primary transition-all"
                                style={{
                                  width: `${sweep.totalExperiments > 0 ? Math.round((sweep.completedExperiments / sweep.totalExperiments) * 100) : 0}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs text-muted-foreground shrink-0">
                              {sweep.completedExperiments}/{sweep.totalExperiments}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end text-primary text-xs">
                          View <ArrowRight className="w-3 h-3 ml-1" aria-hidden="true" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
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
    </motion.div>
  );
}
