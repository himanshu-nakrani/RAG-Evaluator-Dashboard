import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useListDocuments, useCreateDocument, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import { FileText, Plus, Trash2, HardDrive, Search, X, SortAsc } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 12;

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function parseApiError(err: unknown): string {
  const msg = String(err);
  if (/duplicate|unique|already exists/i.test(msg))
    return "A document with that name already exists. Please choose a different name.";
  if (/too large|size/i.test(msg))
    return "Document content is too large. Try splitting it into smaller chunks.";
  if (/network|fetch|failed to fetch/i.test(msg))
    return "Network error. Check your connection and try again.";
  return msg.replace(/^Error:\s*/i, "") || "Something went wrong. Please try again.";
}

export default function Documents() {
  const { data: documents, isLoading } = useListDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [nameError, setNameError] = useState("");
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
    let list = [...(documents ?? [])];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [documents, debouncedSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const allPageSelected = paginated.length > 0 && paginated.every((d) => selectedIds.has(d.id));
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
        paginated.forEach((d) => next.delete(d.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((d) => next.add(d.id));
        return next;
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    if (!name.trim()) { setNameError("Document name is required."); return; }
    if (!content.trim()) return;

    createDocument.mutate(
      { data: { name: name.trim(), content } },
      {
        onSuccess: () => {
          toast({ title: "Document created successfully" });
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          setOpen(false);
          setName("");
          setContent("");
        },
        onError: (err) => {
          toast({ title: "Failed to create document", description: parseApiError(err), variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId === null) return;
    deleteDocument.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Document deleted" });
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
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
        deleteDocument.mutate({ id }, { onSuccess: resolve, onError: () => { failed++; resolve(); } });
      });
    }
    queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    toast({
      title: failed === 0 ? `${ids.length} document${ids.length !== 1 ? "s" : ""} deleted` : `Deleted ${ids.length - failed} of ${ids.length}`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage the corpus text available for retrieval experiments.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button aria-label="Upload new document (⌘N)">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] border-border bg-card">
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="doc-name" className="text-xs font-medium text-muted-foreground">
                  Document Name
                </Label>
                <Input
                  id="doc-name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(""); }}
                  placeholder="e.g., ACME Corp Q3 Financials"
                  className={`bg-background ${nameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  aria-describedby={nameError ? "doc-name-error" : undefined}
                  required
                />
                {nameError && (
                  <p id="doc-name-error" className="text-xs text-destructive">{nameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-content" className="text-xs font-medium text-muted-foreground">
                  Content
                </Label>
                <Textarea
                  id="doc-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste document content here..."
                  className="min-h-[300px] bg-background text-sm resize-none"
                  required
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createDocument.isPending}>
                  {createDocument.isPending ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + Sort toolbar */}
      {(documents?.length ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              ref={searchRef}
              type="search"
              placeholder="Search documents… (⌘K)"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 bg-background"
              aria-label="Search documents"
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
            <SelectTrigger className="w-full sm:w-44 bg-background" aria-label="Sort documents">
              <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
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
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Delete dialogs */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This document will be permanently deleted and cannot be recovered. Any experiments referencing it may be affected.
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
            <AlertDialogTitle>Delete {selectedIds.size} Document{selectedIds.size !== 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {selectedIds.size} document{selectedIds.size !== 1 ? "s" : ""} will be permanently deleted. This cannot be undone.
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

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !documents?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <HardDrive className="w-12 h-12 mb-4 opacity-20" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-sm mb-6 max-w-md">Upload text documents to serve as the knowledge base for your RAG retrieval experiments.</p>
            <Button onClick={() => setOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Add First Document
            </Button>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Search className="w-10 h-10 mb-4 opacity-20" aria-hidden="true" />
            <h3 className="text-base font-medium mb-2">No documents match "{searchQuery}"</h3>
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>Clear search</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Documents">
            {paginated.map((doc, idx) => (
              <motion.div
                key={doc.id}
                role="listitem"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card className={`hover-elevate bg-card border-border flex flex-col h-full relative group transition-colors hover:border-primary/50 ${selectedIds.has(doc.id) ? "border-primary/60 bg-primary/5" : ""}`}>
                  <div
                    className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ opacity: selectedIds.has(doc.id) ? 1 : undefined }}
                  >
                    <Checkbox
                      checked={selectedIds.has(doc.id)}
                      onCheckedChange={() => toggleSelect(doc.id)}
                      aria-label={`Select ${doc.name}`}
                    />
                  </div>
                  <CardHeader className="pb-2 pl-9">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base font-semibold leading-tight truncate" title={doc.name}>
                        <FileText className="w-4 h-4 inline-block mr-2 text-primary" aria-hidden="true" />
                        {doc.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleteDocument.isPending}
                        aria-label={`Delete "${doc.name}"`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed opacity-70">{doc.content}</p>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-border text-xs text-muted-foreground flex justify-between">
                    <span>{formatBytes(doc.sizeBytes)}</span>
                    <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
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
                    <span className="text-xs text-muted-foreground px-3 py-2">
                      {safePage} / {totalPages}
                    </span>
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
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Delete {selectedIds.size}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
