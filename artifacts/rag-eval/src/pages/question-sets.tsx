import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useListQuestionSets, useCreateQuestionSet, useDeleteQuestionSet, getListQuestionSetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import { MessageSquare, Plus, Trash2, HelpCircle, ArrowRight, Search, X, SortAsc } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const ITEMS_PER_PAGE = 12;

function parseApiError(err: unknown): string {
  const msg = String(err);
  if (/duplicate|unique|already exists/i.test(msg))
    return "A question set with that name already exists. Please choose a different name.";
  if (/network|fetch|failed to fetch/i.test(msg))
    return "Network error. Check your connection and try again.";
  return msg.replace(/^Error:\s*/i, "") || "Something went wrong. Please try again.";
}

export default function QuestionSets() {
  const { data: sets, isLoading } = useListQuestionSets();
  const createSet = useCreateQuestionSet();
  const deleteSet = useDeleteQuestionSet();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [sortBy, setSortBy] = useState(() => new URLSearchParams(window.location.search).get("sort") ?? "newest");
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
    let list = [...(sets ?? [])];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "questions-desc") return (b.questionCount ?? 0) - (a.questionCount ?? 0);
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [sets, debouncedSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    if (!name.trim()) { setNameError("Question set name is required."); return; }

    createSet.mutate(
      { data: { name: name.trim(), description: description.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Question set created" });
          queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey() });
          setOpen(false);
          setName("");
          setDescription("");
        },
        onError: (err) => {
          toast({ title: "Failed to create", description: parseApiError(err), variant: "destructive" });
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
    deleteSet.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Question set deleted" });
          queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey() });
          setDeleteOpen(false);
          setDeleteId(null);
        },
        onError: (err) => {
          toast({ title: "Failed to delete", description: parseApiError(err), variant: "destructive" });
        },
      }
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Question Sets</h1>
          <p className="text-muted-foreground mt-1">Curated test suites for evaluating retrieval and generation.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button aria-label="Create new question set (⌘N)">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> New Set
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-border bg-card">
            <DialogHeader>
              <DialogTitle>Create Question Set</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="qs-name" className="text-xs font-medium text-muted-foreground">Name</Label>
                <Input
                  id="qs-name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(""); }}
                  placeholder="e.g., Security Policy Q&A"
                  className={`bg-background ${nameError ? "border-destructive" : ""}`}
                  aria-describedby={nameError ? "qs-name-error" : undefined}
                  required
                />
                {nameError && (
                  <p id="qs-name-error" className="text-xs text-destructive">{nameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="qs-desc" className="text-xs font-medium text-muted-foreground">Description (Optional)</Label>
                <Textarea
                  id="qs-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this test suite..."
                  className="min-h-[100px] bg-background text-sm resize-none"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createSet.isPending}>
                  {createSet.isPending ? "Creating..." : "Create Set"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question Set</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This question set and all its questions will be permanently deleted. Any experiments using it may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-muted/50">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search + Sort */}
      {(sets?.length ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              ref={searchRef}
              type="search"
              placeholder="Search question sets… (⌘K)"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 bg-background"
              aria-label="Search question sets"
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
            <SelectTrigger className="w-full sm:w-52 bg-background" aria-label="Sort question sets">
              <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
              <SelectItem value="questions-desc">Most questions</SelectItem>
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !sets?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-2">No question sets yet</h3>
            <p className="text-sm mb-6 max-w-md">Create sets of questions (with optional ground truth answers) to evaluate your RAG pipelines against.</p>
            <Button onClick={() => setOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Create First Set
            </Button>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Search className="w-10 h-10 mb-4 opacity-20" aria-hidden="true" />
            <h3 className="text-base font-medium mb-2">No results for "{searchQuery}"</h3>
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>Clear search</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Question sets">
            {paginated.map((set, idx) => (
              <motion.div
                key={set.id}
                role="listitem"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Link href={`/question-sets/${set.id}`}>
                  <Card className="hover-elevate bg-card border-border flex flex-col h-full cursor-pointer transition-colors hover:border-primary/50 group">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base font-semibold leading-tight flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                          <span className="truncate">{set.name}</span>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDelete(e, set.id)}
                          disabled={deleteSet.isPending}
                          aria-label={`Delete "${set.name}"`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {set.description || <span className="italic opacity-50">No description</span>}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-4 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center bg-muted/20">
                      <div className="flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" aria-hidden="true" />
                        {set.questionCount} {set.questionCount === 1 ? "Question" : "Questions"}
                      </div>
                      <span className="flex items-center text-primary group-hover:underline">
                        Manage <ArrowRight className="w-3 h-3 ml-1" aria-hidden="true" />
                      </span>
                    </CardFooter>
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
