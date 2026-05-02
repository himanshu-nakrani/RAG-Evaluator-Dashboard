import { useState } from "react";
import { useListDocuments, useCreateDocument, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    deleteDocument.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Document deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage the corpus text available for retrieval experiments.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono">
              <Plus className="w-4 h-4 mr-2" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-mono">Upload New Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-mono text-xs uppercase text-muted-foreground">Document Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., ACME Corp Q3 Financials"
                  className="bg-background font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content" className="font-mono text-xs uppercase text-muted-foreground">Content</Label>
                <Textarea 
                  id="content" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="Paste document content here..."
                  className="min-h-[300px] bg-background font-mono text-sm resize-none"
                  required
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createDocument.isPending} className="font-mono">
                  {createDocument.isPending ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !documents?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <HardDrive className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium font-mono mb-2">No documents found</h3>
            <p className="text-sm mb-6 max-w-md">Upload text documents to serve as the knowledge base for your RAG retrieval experiments.</p>
            <Button onClick={() => setOpen(true)} variant="outline" className="font-mono">
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
                    <CardTitle className="text-lg font-mono leading-tight truncate" title={doc.name}>
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
                  <p className="text-xs text-muted-foreground font-mono line-clamp-3 leading-relaxed opacity-70">
                    {doc.content}
                  </p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border/50 text-xs font-mono text-muted-foreground flex justify-between">
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
