import { useState } from "react";
import { useListExperiments, useCreateExperiment, useListDocuments, useListQuestionSets, useDeleteExperiment, getListExperimentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Plus, Trash2, ArrowRight, Settings, FileText, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

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
  const [chunkSize, setChunkSize] = useState("1000");
  const [chunkOverlap, setChunkOverlap] = useState("200");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [retrieverType, setRetrieverType] = useState("similarity");
  const [topK, setTopK] = useState("5");
  const [documentId, setDocumentId] = useState("");
  const [questionSetId, setQuestionSetId] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !documentId || !questionSetId) return;
    
    createExperiment.mutate({ 
      data: { 
        name, 
        chunkSize: Number(chunkSize),
        chunkOverlap: Number(chunkOverlap),
        embeddingModel,
        retrieverType,
        topK: Number(topK),
        documentId: Number(documentId),
        questionSetId: Number(questionSetId)
      } 
    }, {
      onSuccess: () => {
        toast({ title: "Experiment created" });
        queryClient.invalidateQueries({ queryKey: getListExperimentsQueryKey() });
        setOpen(false);
        setName("");
      },
      onError: (err) => {
        toast({ title: "Creation failed", description: String(err), variant: "destructive" });
      }
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this experiment and all its runs?")) return;
    deleteExperiment.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Experiment deleted" });
        queryClient.invalidateQueries({ queryKey: getListExperimentsQueryKey() });
      }
    });
  };

  const isReadyToCreate = documents?.length && questionSets?.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Experiments</h1>
          <p className="text-muted-foreground mt-1">Configure RAG pipelines and run evaluations against them.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono">
              <Plus className="w-4 h-4 mr-2" /> New Experiment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] border-border bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono">Create RAG Experiment</DialogTitle>
            </DialogHeader>
            
            {!isReadyToCreate && !docsLoading && !qsLoading ? (
              <div className="p-6 bg-destructive/10 text-destructive text-sm rounded-md font-mono mt-4">
                You need at least one Document and one Question Set before creating an experiment.
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-mono text-xs uppercase text-muted-foreground">Experiment Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g., Baseline 1K Chunk + Similarity"
                    className="bg-background font-mono"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border p-4 rounded-lg bg-background/50">
                  <div className="space-y-2">
                    <Label className="font-mono text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Source Document
                    </Label>
                    <Select value={documentId} onValueChange={setDocumentId} required>
                      <SelectTrigger className="font-mono">
                        <SelectValue placeholder="Select Document" />
                      </SelectTrigger>
                      <SelectContent>
                        {documents?.map(d => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-mono text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" /> Question Set
                    </Label>
                    <Select value={questionSetId} onValueChange={setQuestionSetId} required>
                      <SelectTrigger className="font-mono">
                        <SelectValue placeholder="Select Question Set" />
                      </SelectTrigger>
                      <SelectContent>
                        {questionSets?.map(qs => (
                          <SelectItem key={qs.id} value={String(qs.id)}>{qs.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold font-mono border-b border-border pb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Pipeline Configuration
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="chunkSize" className="font-mono text-xs text-muted-foreground">Chunk Size (tokens)</Label>
                      <Input id="chunkSize" type="number" value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} className="bg-background font-mono" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chunkOverlap" className="font-mono text-xs text-muted-foreground">Chunk Overlap</Label>
                      <Input id="chunkOverlap" type="number" value={chunkOverlap} onChange={(e) => setChunkOverlap(e.target.value)} className="bg-background font-mono" required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="font-mono text-xs text-muted-foreground">Embedding Model</Label>
                      <Select value={embeddingModel} onValueChange={setEmbeddingModel} required>
                        <SelectTrigger className="font-mono">
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
                      <Label className="font-mono text-xs text-muted-foreground">Retriever Type</Label>
                      <Select value={retrieverType} onValueChange={setRetrieverType} required>
                        <SelectTrigger className="font-mono">
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
                      <Label htmlFor="topK" className="font-mono text-xs text-muted-foreground">Top K (Context size)</Label>
                      <Input id="topK" type="number" value={topK} onChange={(e) => setTopK(e.target.value)} className="bg-background font-mono" required />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button type="submit" disabled={createExperiment.isPending} className="font-mono w-full sm:w-auto">
                    {createExperiment.isPending ? "Creating..." : "Save Experiment Config"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {expLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : !experiments?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center mt-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <FlaskConical className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium font-mono mb-2">No experiments yet</h3>
            <p className="text-sm mb-6 max-w-md">Define a pipeline configuration to begin running evaluations and comparing results.</p>
            <Button onClick={() => setOpen(true)} variant="outline" className="font-mono" disabled={!isReadyToCreate && !docsLoading && !qsLoading}>
              <Plus className="w-4 h-4 mr-2" /> Create First Experiment
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp, idx) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/experiments/${exp.id}`}>
                <Card className="hover-elevate bg-card border-border cursor-pointer transition-colors hover:border-primary/50 group">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-5">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="text-lg font-mono font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                            <FlaskConical className="w-5 h-5 text-primary" />
                            {exp.name}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-3">
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
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border bg-background/30 p-5 flex flex-col justify-center">
                      <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
                        <span>Best Faithfulness</span>
                        <span className={`font-bold ${
                          !exp.bestFaithfulness ? 'text-muted-foreground' :
                          exp.bestFaithfulness >= 0.8 ? 'metric-green' :
                          exp.bestFaithfulness >= 0.5 ? 'metric-amber' : 'metric-red'
                        }`}>{exp.bestFaithfulness != null ? exp.bestFaithfulness.toFixed(3) : '-'}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono text-muted-foreground mb-3">
                        <span>Best Context Recall</span>
                        <span className={`font-bold ${
                          !exp.bestContextRecall ? 'text-muted-foreground' :
                          exp.bestContextRecall >= 0.8 ? 'metric-green' :
                          exp.bestContextRecall >= 0.5 ? 'metric-amber' : 'metric-red'
                        }`}>{exp.bestContextRecall != null ? exp.bestContextRecall.toFixed(3) : '-'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50 text-xs font-mono">
                        <span className="text-muted-foreground">{exp.runCount} Runs</span>
                        <span className="text-primary flex items-center">View <ArrowRight className="w-3 h-3 ml-1" /></span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
