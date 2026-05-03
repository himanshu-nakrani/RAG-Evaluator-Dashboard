import { useState, useRef, useMemo, useCallback, memo } from "react";
import { useParams } from "wouter";
import {
  useGetQuestionSet, useAddQuestion, useImportQuestions,
  getGetQuestionSetQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import {
  MessageSquare, Plus, ArrowLeft, HelpCircle, Upload, FileText,
  Search, X, Download, SortAsc,
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const ITEMS_PER_PAGE = 15;

function exportQuestionsCsv(questions: any[], setName: string) {
  const headers = ["id", "text", "ground_truth", "created_at"];
  const rows = questions.map((q) => [
    q.id,
    `"${(q.text ?? "").replace(/"/g, '""')}"`,
    q.groundTruth ? `"${(q.groundTruth).replace(/"/g, '""')}"` : "",
    q.createdAt,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${setName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-questions.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseApiError(err: unknown): string {
  const msg = String(err);
  if (/network|fetch|failed to fetch/i.test(msg)) return "Network error. Check your connection and try again.";
  return msg.replace(/^Error:\s*/i, "") || "Something went wrong.";
}

const QuestionCard = memo(function QuestionCard({
  q, idx,
}: {
  q: any;
  idx: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.03 }}
    >
      <Card className="bg-card border-border group hover:border-primary/30 transition-colors">
        <CardContent className="p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded bg-muted/50 flex items-center justify-center font-mono text-muted-foreground text-xs shrink-0 mt-0.5">
              Q{idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">{q.text}</div>

              {q.groundTruth && (
                <div className="mt-3 pl-4 border-l-2 border-primary/30 py-1">
                  <div className="text-[10px] text-primary uppercase mb-1 font-medium">Ground Truth</div>
                  <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-md font-mono">
                    {q.groundTruth}
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                <span>ID: {q.id}</span>
                <span>•</span>
                <span>Added {format(new Date(q.createdAt), "MMM d, yyyy")}</span>
                {!q.groundTruth && (
                  <span className="text-warning/80 ml-1">• No ground truth</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

export default function QuestionSetDetail() {
  const { id } = useParams();
  const setId = Number(id);
  const { data: set, isLoading } = useGetQuestionSet(setId, {
    query: { enabled: !!setId, queryKey: getGetQuestionSetQueryKey(setId) },
  });
  const addQuestion = useAddQuestion();
  const importQuestions = useImportQuestions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [text, setText] = useState("");
  const [groundTruth, setGroundTruth] = useState("");
  const [textError, setTextError] = useState("");
  const [csvText, setCsvText] = useState("");

  const [rawSearch, setRawSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchQuery = useDebounce(rawSearch, 250);

  const openNew = useCallback(() => setOpen(true), []);
  const focusSearch = useCallback(() => searchRef.current?.focus(), []);
  useKeyboardShortcut("n", openNew, { meta: true });
  useKeyboardShortcut("k", focusSearch, { meta: true });
  useKeyboardShortcut("Escape", () => {
    if (rawSearch) { setRawSearch(""); setPage(1); }
  });

  const filtered = useMemo(() => {
    let qs = [...(set?.questions ?? [])];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      qs = qs.filter(
        (item) =>
          item.text.toLowerCase().includes(q) ||
          (item.groundTruth ?? "").toLowerCase().includes(q)
      );
    }
    qs.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "has-answer") return (b.groundTruth ? 1 : 0) - (a.groundTruth ? 1 : 0);
      if (sortBy === "no-answer") return (a.groundTruth ? 1 : 0) - (b.groundTruth ? 1 : 0);
      if (sortBy === "longest") return b.text.length - a.text.length;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return qs;
  }, [set?.questions, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setTextError("");
    if (!text.trim()) { setTextError("Question text is required."); return; }

    addQuestion.mutate(
      { id: setId, data: { text: text.trim(), groundTruth: groundTruth.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Question added" });
          queryClient.invalidateQueries({ queryKey: getGetQuestionSetQueryKey(setId) });
          setOpen(false);
          setText("");
          setGroundTruth("");
        },
        onError: (err) => {
          toast({ title: "Failed to add", description: parseApiError(err), variant: "destructive" });
        },
      }
    );
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string ?? "");
    reader.readAsText(file);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    importQuestions.mutate(
      { id: setId, data: { csvText } },
      {
        onSuccess: (result: any) => {
          toast({
            title: `Imported ${result.imported} question${result.imported !== 1 ? "s" : ""}`,
            description: result.skipped > 0 ? `${result.skipped} rows skipped.` : undefined,
          });
          queryClient.invalidateQueries({ queryKey: getGetQuestionSetQueryKey(setId) });
          setImportOpen(false);
          setCsvText("");
        },
        onError: (err) =>
          toast({ title: "Import failed", description: parseApiError(err), variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      </div>
    );
  }

  if (!set) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>Question set not found.</p>
      <Link href="/question-sets"><Button variant="outline" className="mt-4">Back to Sets</Button></Link>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Back */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <Link href="/question-sets">
          <span className="flex items-center hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Back to Sets
          </span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" aria-hidden="true" />
            {set.name}
          </h1>
          {set.description && <p className="text-muted-foreground mt-2 max-w-2xl">{set.description}</p>}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(set.questions?.length ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportQuestionsCsv(set.questions ?? [], set.name)}
              aria-label="Export questions as CSV"
            >
              <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Export CSV
            </Button>
          )}

          {/* Import dialog */}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" aria-label="Import questions from CSV">
                <Upload className="w-4 h-4 mr-2" aria-hidden="true" /> Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-border bg-card">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" aria-hidden="true" /> Import Questions from CSV
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleImport} className="space-y-4 pt-2">
                <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Expected CSV format:</p>
                  <p>• Required column: <span className="text-primary">text</span> or <span className="text-primary">question</span></p>
                  <p>• Optional column: <span className="text-primary">ground_truth</span>, <span className="text-primary">answer</span></p>
                  <p className="pt-1 text-[10px] opacity-70 font-mono">text,ground_truth<br />"What is X?","X is..."</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Upload .csv File</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImportFile}
                    className="block text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-border file:text-xs file:bg-background file:text-foreground cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Or paste CSV text</Label>
                  <Textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder={"text,ground_truth\n\"What is RAG?\",\"RAG stands for...\""}
                    className="bg-background text-xs min-h-[120px] resize-none font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={importQuestions.isPending || !csvText.trim()}>
                    {importQuestions.isPending ? "Importing…" : "Import Questions"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add dialog */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Add question (⌘N)" title="Add Question (⌘N)">
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-border bg-card">
              <DialogHeader>
                <DialogTitle>Add Question to Set</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="q-text" className="text-xs font-medium text-muted-foreground">Question Text</Label>
                  <Textarea
                    id="q-text"
                    value={text}
                    onChange={(e) => { setText(e.target.value); setTextError(""); }}
                    placeholder="e.g., What are the main authentication methods supported?"
                    className={`bg-background font-mono min-h-[100px] resize-none ${textError ? "border-destructive" : ""}`}
                    aria-describedby={textError ? "q-text-error" : undefined}
                    required
                  />
                  {textError && <p id="q-text-error" className="text-xs text-destructive">{textError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ground-truth" className="text-xs font-medium text-muted-foreground">
                    Ground Truth Answer <span className="opacity-50">(Optional)</span>
                  </Label>
                  <Textarea
                    id="ground-truth"
                    value={groundTruth}
                    onChange={(e) => setGroundTruth(e.target.value)}
                    placeholder="Ideal expected answer for context recall evaluation…"
                    className="min-h-[150px] bg-background font-mono text-sm resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">Used to evaluate Context Recall metrics.</p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={addQuestion.isPending}>
                    {addQuestion.isPending ? "Adding…" : "Add Question"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!set.questions?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center mt-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <HelpCircle className="w-12 h-12 mb-4 opacity-20" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-2">No questions in this set</h3>
            <p className="text-sm mb-6 max-w-md">
              Add questions you want your RAG pipeline to answer. Include ground truth answers to measure Context Recall.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setOpen(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Add Question
              </Button>
              <Button onClick={() => setImportOpen(true)} variant="outline">
                <Upload className="w-4 h-4 mr-2" aria-hidden="true" /> Import CSV
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Search + Sort toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <Input
                ref={searchRef}
                type="search"
                placeholder="Search questions… (⌘K)"
                value={rawSearch}
                onChange={(e) => { setRawSearch(e.target.value); setPage(1); }}
                className="pl-9 bg-background"
                aria-label="Search questions"
              />
              {rawSearch && (
                <button
                  onClick={() => { setRawSearch(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-52 bg-background" aria-label="Sort questions">
                <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="has-answer">Has ground truth</SelectItem>
                <SelectItem value="no-answer">Missing ground truth</SelectItem>
                <SelectItem value="longest">Longest questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <Card className="border-dashed border-2 border-border bg-transparent p-10 text-center">
              <div className="flex flex-col items-center text-muted-foreground">
                <Search className="w-8 h-8 mb-3 opacity-20" aria-hidden="true" />
                <h3 className="text-base font-medium mb-2">No questions match "{rawSearch}"</h3>
                <Button variant="outline" size="sm" onClick={() => setRawSearch("")}>Clear search</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3 mt-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border pb-2 font-medium">
                {filtered.length} Question{filtered.length !== 1 ? "s" : ""}
                {rawSearch && <span className="ml-1 normal-case tracking-normal opacity-60">matching "{rawSearch}"</span>}
              </div>
              {paginated.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  idx={(safePage - 1) * ITEMS_PER_PAGE + idx}
                />
              ))}
            </div>
          )}

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
