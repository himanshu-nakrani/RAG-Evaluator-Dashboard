import { useState } from "react";
import { useParams } from "wouter";
import { useGetQuestionSet, useAddQuestion, getGetQuestionSetQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, ArrowLeft, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function QuestionSetDetail() {
  const { id } = useParams();
  const setId = Number(id);
  const { data: set, isLoading } = useGetQuestionSet(setId, { query: { enabled: !!setId, queryKey: getGetQuestionSetQueryKey(setId) } });
  const addQuestion = useAddQuestion();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [groundTruth, setGroundTruth] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text) return;
    
    addQuestion.mutate({ id: setId, data: { text, groundTruth: groundTruth || undefined } }, {
      onSuccess: () => {
        toast({ title: "Question added" });
        queryClient.invalidateQueries({ queryKey: getGetQuestionSetQueryKey(setId) });
        setOpen(false);
        setText("");
        setGroundTruth("");
      },
      onError: (err) => {
        toast({ title: "Failed to add", description: String(err), variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  if (!set) return <div>Question set not found</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground mb-4">
        <Link href="/question-sets">
          <span className="flex items-center hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sets
          </span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            {set.name}
          </h1>
          {set.description && <p className="text-muted-foreground mt-2 max-w-2xl">{set.description}</p>}
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono">
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-mono">Add Question to Set</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="text" className="font-mono text-xs uppercase text-muted-foreground">Question Text</Label>
                <Textarea 
                  id="text" 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  placeholder="e.g., What are the main authentication methods supported?"
                  className="bg-background font-mono min-h-[100px] resize-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groundTruth" className="font-mono text-xs uppercase text-muted-foreground">Ground Truth Answer (Optional)</Label>
                <Textarea 
                  id="groundTruth" 
                  value={groundTruth} 
                  onChange={(e) => setGroundTruth(e.target.value)} 
                  placeholder="Ideal expected answer for faithfulness evaluation..."
                  className="min-h-[150px] bg-background font-mono text-sm resize-none"
                />
                <p className="text-[10px] text-muted-foreground font-mono">Used to evaluate Context Recall metrics.</p>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={addQuestion.isPending} className="font-mono">
                  {addQuestion.isPending ? "Adding..." : "Add Question"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!set.questions?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center mt-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <HelpCircle className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium font-mono mb-2">No questions in this set</h3>
            <p className="text-sm mb-6 max-w-md">Add specific questions you want your RAG pipeline to be able to answer correctly.</p>
            <Button onClick={() => setOpen(true)} variant="outline" className="font-mono">
              <Plus className="w-4 h-4 mr-2" /> Add First Question
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4 mt-8">
          <div className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-2">
            {set.questions.length} Questions
          </div>
          {set.questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center font-mono text-muted-foreground text-sm shrink-0">
                      Q{idx + 1}
                    </div>
                    <div className="font-medium text-foreground text-base pt-1">
                      {q.text}
                    </div>
                  </div>
                  
                  {q.groundTruth && (
                    <div className="ml-12 pl-4 border-l-2 border-primary/30 py-1">
                      <div className="text-[10px] font-mono text-primary uppercase mb-1">Ground Truth</div>
                      <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-md font-mono">
                        {q.groundTruth}
                      </div>
                    </div>
                  )}
                  
                  <div className="ml-12 flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-2">
                    <span>ID: {q.id}</span>
                    <span>•</span>
                    <span>Added {format(new Date(q.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
