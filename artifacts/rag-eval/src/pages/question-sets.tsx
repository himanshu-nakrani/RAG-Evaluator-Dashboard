import { useState } from "react";
import { useListQuestionSets, useCreateQuestionSet, useDeleteQuestionSet, getListQuestionSetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Trash2, HelpCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function QuestionSets() {
  const { data: sets, isLoading } = useListQuestionSets();
  const createSet = useCreateQuestionSet();
  const deleteSet = useDeleteQuestionSet();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    createSet.mutate({ data: { name, description: description || undefined } }, {
      onSuccess: () => {
        toast({ title: "Question set created" });
        queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey() });
        setOpen(false);
        setName("");
        setDescription("");
      },
      onError: (err) => {
        toast({ title: "Failed to create", description: String(err), variant: "destructive" });
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId === null) return;
    deleteSet.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast({ title: "Deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey() });
        setDeleteOpen(false);
        setDeleteId(null);
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Question Sets</h1>
          <p className="text-muted-foreground mt-1">Curated test suites for evaluating retrieval and generation.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Set
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-border bg-card">
            <DialogHeader>
              <DialogTitle>Create Question Set</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., Security Policy Q&A"
                  className="bg-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">Description (Optional)</Label>
                <Textarea 
                  id="description" 
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
              This question set will be permanently deleted. This action cannot be undone.
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
      ) : !sets?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">No question sets</h3>
            <p className="text-sm mb-6 max-w-md">Create sets of questions (with optional ground truth answers) to evaluate your RAG pipelines against.</p>
            <Button onClick={() => setOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Create First Set
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map((set, idx) => (
            <motion.div
              key={set.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/question-sets/${set.id}`}>
                <Card className="hover-elevate bg-card border-border flex flex-col h-full cursor-pointer transition-colors hover:border-primary/50 group">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg font-mono leading-tight flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{set.name}</span>
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDelete(e, set.id)}
                        disabled={deleteSet.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {set.description || <span className="italic opacity-50">No description</span>}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-border/50 text-xs font-mono text-muted-foreground flex justify-between items-center bg-muted/20">
                    <div className="flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      {set.questionCount} {set.questionCount === 1 ? 'Question' : 'Questions'}
                    </div>
                    <span className="flex items-center text-primary group-hover:underline">
                      Manage <ArrowRight className="w-3 h-3 ml-1" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
