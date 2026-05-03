import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useListExperiments, useCreateExperiment, useListDocuments, useListQuestionSets, useDeleteExperiment, getListExperimentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import { FlaskConical, Plus, Trash2, ArrowRight, Settings, FileText, MessageSquare, Search, X, SortAsc, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

const ITEMS_PER_PAGE = 10;

function parseApiError(err: unknown): string {
  const msg = String(err);
  if (/duplicate|unique|already exists/i.test(msg))
    return "An experiment with that name already exists. Please choose a different name.";
  if (/document.*not found|no document/i.test(msg))
    return "The selected document no longer exists. Please choose another.";
  if (/question.*not found|no question/i.test(msg))
    return "The selected question set no longer exists. Please choose another.";
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

export default function Experiments() {
  const { data: experiments, isLoading: expLoading } = useListExperiments();
  const { data: documents, isLoading: docsLoading } = useListDocuments();
  const { data: questionSets, isLoading: qsLoading } = useListQuestionSets();

  const createExperiment = useCreateExperiment();
  const deleteExperiment = useDeleteExperiment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [chunkSize, setChunkSize] = useState("1000");
  const [chunkOverlap, setChunkOverlap] = useState("200");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [retrieverType, setRetrieverType] = useState("similarity");
  const [topK, setTopK] = useState("5");
  const [documentId, setDocumentId] = useState("");
  const [questionSetId, setQuestionSetId] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [sortBy, setSortBy] = useState(() => new URLSearchParams(window.location.search).get("sort") ?? "newest");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchQuery);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (sortBy !== "newest") params.set("sort", sortBy);
    const qs = params.toString();
    history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [searchQuery, sortBy]);

  const searchRef = useRef<HTMLInputElement>(null);

  const openNew = useCallback(() => setOpen(true), []);
  const focusSearch = useCallback(() => searchRef.current?.focus(), []);
  useKeyboardShortcut("n", openNew, { meta: true });
  useKeyboardShortcut("k", focusSearch, { meta: true });
  useKeyboardShortcut("Escape", () => {
    if (searchQuery) { setSearchQuery(""); setPage(1); }
  });

  const filtered = useMemo(() => {
    let list = [...(experiments ?? [])];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.embeddingModel.toLowerCase().includes(q) ||
          e.retrieverType.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "best-score") return (b.bestFaithfulness ?? -1) - (a.bestFaithfulness ?? -1);
      if (sortBy === "most-runs") return (b.runCount ?? 0) - (a.runCount ?? 0);
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [experiments, debouncedSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const allPageSelected = paginated.length > 0 && paginated.every((e) => selectedIds.has(e.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((e) => next.add(e.id));
        return next;
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    if (!name.trim()) { setNameError("Experiment name is required."); return; }
    if (!documentId || !questionSetId) return;

    const cs = Number(chunkSize);
    const co = Number(chunkOverlap);
    const tk = Number(topK);
    if (cs < 64 || cs > 8192) { toast({ title: "Chunk size must be between 64 and 8192 tokens.", variant: "destructive" }); return; }
    if (co >= cs) { toast({ title: "Chunk overlap must be less than chunk size.", variant: "destructive" }); return; }
    if (tk < 1 || tk > 20) { toast({ title: "Top K must be between 1 and 20.", variant: "destructive" }); return; }

    createExperiment.mutate(
      {
        data: {
          name: name.trim(),
          chunkSize: cs,
          chunkOverlap: co,
          embeddingModel,
          retrieverType,
          topK: tk,
          documentId: Number(documentId),
          questionSetId: Number(questionSetId),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Experiment created" });
          queryClient.invalidateQueries({ queryKey: getListExperimentsQueryKey() });
          setOpen(false);
          setName("");
        },
        onError: (err) => {
          toast({ title: "Creation failed", description: parseApiError(err), variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId === null) return;
    deleteExperiment.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Experiment deleted" });
          queryClient.invalidateQueries({ queryKey: getListExperimentsQueryKey() });
          setSelectedIds((prev) => { const n = new Set(prev); n.delete(deleteId); return n; });
          setDeleteOpen(false);
          setDeleteId(null);
        },
        onError: (err) => {
          toast({ title: "Failed to delete", description: parseApiError(err), variant: "destructive" });
        },
      }
    );
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    let failed = 0;
    for (const id of ids) {
      await new Promise<void>((resolve) => {
        deleteExperiment.mutate({ id }, { onSuccess: resolve, onError: () => { failed++; resolve(); } });
      });
    }
    queryClient.invalidateQueries({ queryKey: getListExperimentsQueryKey() });
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    toast({
      title: failed === 0 ? `${ids.length} experiment${ids.length !== 1 ? "s" : ""} deleted` : `Deleted ${ids.length - failed} of ${ids.length}`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  const isReadyToCreate = documents?.length && questionSets?.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Experiments</h1>
          <p className="text-muted-foreground mt-1">Configure RAG pipelines and run evaluations against them.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button aria-label="Create new experiment (⌘N)">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> New Experiment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] border-border bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create RAG Experiment</DialogTitle>
            </DialogHeader>

            {!isReadyToCreate && !docsLoading && !qsLoading ? (
              <div className="p-6 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md mt-4">
                <strong>Missing prerequisites:</strong> You need at least one Document and one Question Set before creating an experiment.{" "}
                {!documents?.length && "Upload a document first. "}
                {!questionSets?.length && "Create a question set first."}
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="exp-name" className="text-xs font-medium text-muted-foreground">Experiment Name</Label>
                  <Input
                    id="exp-name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameError(""); }}
                    placeholder="e.g., Baseline 1K Chunk + Similarity"
                    className={`bg-background ${nameError ? "border-destructive" : ""}`}
                    aria-describedby={nameError ? "exp-name-error" : undefined}
                    required
                  />
                  {nameError && <p id="exp-name-error" className="text-xs text-destructive">{nameError}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border p-4 rounded-lg bg-background/50">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <FileText className="w-3 h-3" aria-hidden="true" /> Source Document
                    </Label>
                    <Select value={documentId} onValueChange={setDocumentId}>
                      <SelectTrigger aria-label="Select source document">
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
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" aria-hidden="true" /> Question Set
                    </Label>
                    <Select value={questionSetId} onValueChange={setQuestionSetId}>
                      <SelectTrigger aria-label="Select question set">
                        <SelectValue placeholder="Select Question Set" />
                      </SelectTrigger>
                      <SelectContent>
                        {questionSets?.map((qs) => (
                          <SelectItem key={qs.id} value={String(qs.id)}>{qs.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold border-b border-border pb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4" aria-hidden="true" /> Pipeline Configuration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="chunkSize" className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        Chunk Size (tokens)
                        <FieldTooltip content="How many tokens each document chunk contains. Smaller chunks (256–512) improve precision; larger chunks (1024–2048) improve context but may reduce focus. Default: 1000." />
                      </Label>
                      <Input id="chunkSize" type="number" min="64" max="8192" value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} className="bg-background font-mono" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chunkOverlap" className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        Chunk Overlap
                        <FieldTooltip content="Number of tokens shared between adjacent chunks. Overlap prevents information loss at chunk boundaries. Typically 10–20% of chunk size. Must be less than chunk size." />
                      </Label>
                      <Input id="chunkOverlap" type="number" min="0" value={chunkOverlap} onChange={(e) => setChunkOverlap(e.target.value)} className="bg-background font-mono" required />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        Embedding Model
                        <FieldTooltip content="The OpenAI model used to encode document chunks and queries into vector embeddings. text-embedding-3-small is faster and cheaper; text-embedding-3-large produces higher quality embeddings." />
                      </Label>
                      <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                        <SelectTrigger aria-label="Select embedding model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                          <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                          <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        Retriever Type
                        <FieldTooltip content="Similarity: pure vector cosine similarity. MMR (Max Marginal Relevance): balances relevance with diversity to reduce redundant chunks. Hybrid: combines BM25 keyword search with vector search." />
                      </Label>
                      <Select value={retrieverType} onValueChange={setRetrieverType}>
                        <SelectTrigger aria-label="Select retriever type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="similarity">Similarity (Vector)</SelectItem>
                          <SelectItem value="mmr">MMR (Max Marginal Relevance)</SelectItem>
                          <SelectItem value="hybrid">Hybrid (BM25 + Vector)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="topK" className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        Top K (Context size)
                        <FieldTooltip content="How many document chunks to retrieve per query and include in the LLM context. Higher values increase recall but add cost and may dilute relevance. Typical range: 3–10." />
                      </Label>
                      <Input id="topK" type="number" min="1" max="20" value={topK} onChange={(e) => setTopK(e.target.value)} className="bg-background font-mono" required />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button type="submit" disabled={createExperiment.isPending || !documentId || !questionSetId} className="w-full sm:w-auto">
                    {createExperiment.isPending ? "Creating..." : "Save Experiment Config"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete dialogs */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Experiment</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This experiment and all its evaluation runs will be permanently deleted. Historical results will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-muted/50">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Experiment{selectedIds.size !== 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {selectedIds.size} experiment{selectedIds.size !== 1 ? "s" : ""} and all their evaluation runs will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-muted/50">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selectedIds.size}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search + Sort toolbar */}
      {(experiments?.length ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              ref={searchRef}
              type="search"
              placeholder="Search experiments… (⌘K)"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 bg-background"
              aria-label="Search experiments"
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
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-52 bg-background" aria-label="Sort experiments">
              <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
              <SelectItem value="best-score">Best faithfulness</SelectItem>
              <SelectItem value="most-runs">Most runs</SelectItem>
            </SelectContent>
          </Select>
          {(searchQuery || sortBy !== "newest") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchQuery(""); setSortBy("newest"); setPage(1); }}
              className="shrink-0 text-muted-foreground hover:text-foreground text-xs h-9 px-3"
              aria-label="Clear all filters"
            >
              <X className="w-3 h-3 mr-1" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Bulk select toolbar */}
      {paginated.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={allPageSelected}
              onCheckedChange={toggleSelectAll}
              aria-label={allPageSelected ? "Deselect all on this page" : "Select all on this page"}
            />
            <span className="text-xs text-muted-foreground">
              {allPageSelected ? "Deselect all" : "Select all"}
            </span>
          </label>
          {someSelected && (
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
          )}
        </div>
      )}

      {/* List */}
      {expLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : !experiments?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center mt-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <FlaskConical className="w-12 h-12 mb-4 opacity-20" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-2">No experiments yet</h3>
            <p className="text-sm mb-6 max-w-md">Define a pipeline configuration to begin running evaluations and comparing results.</p>
            <Button onClick={() => setOpen(true)} variant="outline" disabled={!isReadyToCreate && !docsLoading && !qsLoading}>
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Create First Experiment
            </Button>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Search className="w-10 h-10 mb-4 opacity-20" aria-hidden="true" />
            <h3 className="text-base font-medium mb-2">No experiments match "{searchQuery}"</h3>
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>Clear search</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="space-y-3" role="list" aria-label="Experiments">
            {paginated.map((exp, idx) => (
              <motion.div
                key={exp.id}
                role="listitem"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <div className={`flex items-start gap-3 ${selectedIds.has(exp.id) ? "opacity-100" : ""}`}>
                  <div className="pt-5 pl-1">
                    <Checkbox
                      checked={selectedIds.has(exp.id)}
                      onCheckedChange={() => toggleSelect(exp.id)}
                      aria-label={`Select experiment "${exp.name}"`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ opacity: selectedIds.has(exp.id) ? 1 : undefined }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/experiments/${exp.id}`}>
                      <Card className={`hover-elevate bg-card border-border cursor-pointer transition-colors hover:border-primary/50 group ${selectedIds.has(exp.id) ? "border-primary/60 bg-primary/5" : ""}`}>
                        <div className="flex flex-col md:flex-row">
                          <div className="flex-1 p-5">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                  <FlaskConical className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                                  {exp.name}
                                </h3>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant="secondary" className="font-mono text-[10px] bg-muted/50 text-muted-foreground border-border">Chunk: {exp.chunkSize}</Badge>
                                  <Badge variant="secondary" className="font-mono text-[10px] bg-muted/50 text-muted-foreground border-border">{exp.embeddingModel}</Badge>
                                  <Badge variant="secondary" className="font-mono text-[10px] bg-muted/50 text-muted-foreground border-border">{exp.retrieverType} (k={exp.topK})</Badge>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => handleDelete(e, exp.id)}
                                disabled={deleteExperiment.isPending}
                                aria-label={`Delete experiment "${exp.name}"`}
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>

                          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border bg-background/30 p-5 flex flex-col justify-center">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Best Faithfulness</span>
                              <span className={`font-bold ${
                                !exp.bestFaithfulness ? "text-muted-foreground" :
                                exp.bestFaithfulness >= 0.8 ? "metric-green" :
                                exp.bestFaithfulness >= 0.5 ? "metric-amber" : "metric-red"
                              }`}>{exp.bestFaithfulness != null ? exp.bestFaithfulness.toFixed(3) : "—"}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-3">
                              <span>Best Context Recall</span>
                              <span className={`font-bold ${
                                !exp.bestContextRecall ? "text-muted-foreground" :
                                exp.bestContextRecall >= 0.8 ? "metric-green" :
                                exp.bestContextRecall >= 0.5 ? "metric-amber" : "metric-red"
                              }`}>{exp.bestContextRecall != null ? exp.bestContextRecall.toFixed(3) : "—"}</span>
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50 text-xs">
                              <span className="text-muted-foreground font-mono">{exp.runCount} Run{exp.runCount !== 1 ? "s" : ""}</span>
                              <span className="text-primary flex items-center">View <ArrowRight className="w-3 h-3 ml-1" aria-hidden="true" /></span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </div>
                </div>
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

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border shadow-lg rounded-lg px-4 py-2.5"
            role="status"
            aria-live="polite"
          >
            <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Delete {selectedIds.size}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
