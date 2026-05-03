import { useState } from "react";
import { useListDocuments, useCreateDocument, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, HardDrive } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !content) return;
    
    createDocument.mutate({ data: { name, content } }, {
      onSuccess: () => {
        toast({ title: "Document created successfully" });
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        setOpen(false);
        setName("");
        setContent("");
      },
      onError: (err) => {
        toast({ title: "Failed to create document", description: String(err), variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId === null) return;
    deleteDocument.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast({ title: "Document deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        setDeleteOpen(false);
        setDeleteId(null);
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage the corpus text available for retrieval experiments.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] border-border bg-card">
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Document Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., ACME Corp Q3 Financials"
                  className="bg-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content" className="text-xs font-medium text-muted-foreground">Content</Label>
                <Textarea 
                  id="content" 
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This document will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-muted/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !documents?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <HardDrive className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">No documents found</h3>
            <p className="text-sm mb-6 max-w-md">Upload text documents to serve as the knowledge base for your RAG retrieval experiments.</p>
            <Button onClick={() => setOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add First Document
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc, idx) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="hover-elevate bg-card border-border flex flex-col h-full relative group transition-colors hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-semibold leading-tight truncate" title={doc.name}>
                      <FileText className="w-4 h-4 inline-block mr-2 text-primary" />
                      {doc.name}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleteDocument.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed opacity-70">
                    {doc.content}
                  </p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border text-xs text-muted-foreground flex justify-between">
                  <span>{formatBytes(doc.sizeBytes)}</span>
                  <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
