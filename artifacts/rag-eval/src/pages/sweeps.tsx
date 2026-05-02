import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Zap, Plus, ArrowRight, Activity, CheckCircle2, Clock, Grid3X3 } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const CHUNK_SIZE_OPTIONS = [128, 256, 512, 1024, 2048];
const EMBEDDING_MODEL_OPTIONS = [
  "text-embedding-3-small",
  "text-embedding-3-large",
  "text-embedding-ada-002",
];
const RETRIEVER_TYPE_OPTIONS = ["similarity", "mmr", "hybrid"];

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

  const totalCombinations = selectedChunkSizes.length * selectedEmbeddings.length * selectedRetrievers.length;

  const toggleItem = <T,>(arr: T[], item: T, set: (v: T[]) => void) => {
    set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !documentId || !questionSetId) return;
    if (totalCombinations === 0) {
      toast({ title: "Select at least one option for each dimension", variant: "destructive" });
      return;
    }

    createSweep.mutate(
      {
        data: {
          name,
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
          toast({ title: "Failed to create sweep", description: String(err), variant: "destructive" }),
      }
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            Parameter Sweeps
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Auto-generate a grid of experiments by sweeping over multiple parameter values.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono">
              <Plus className="w-4 h-4 mr-2" /> New Sweep
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] border-border bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono">Create Parameter Sweep</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase text-muted-foreground">Sweep Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Chunk Size Study v2"
                  className="bg-background font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border border-border p-4 rounded-lg bg-background/50">
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">Document</Label>
                  <Select value={documentId} onValueChange={setDocumentId} required>
                    <SelectTrigger className="font-mono">
                      <SelectValue placeholder="Select Document" />
                    </SelectTrigger>
                    <SelectContent>
                      {documents?.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">Question Set</Label>
                  <Select value={questionSetId} onValueChange={setQuestionSetId} required>
                    <SelectTrigger className="font-mono">
                      <SelectValue placeholder="Select Set" />
                    </SelectTrigger>
                    <SelectContent>
                      {questionSets?.map((qs) => (
                        <SelectItem key={qs.id} value={String(qs.id)}>
                          {qs.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 border border-border p-4 rounded-lg bg-background/50">
                <h4 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-primary" /> Sweep Dimensions
                  <Badge variant="outline" className="ml-auto font-mono text-xs">
                    {totalCombinations} combination{totalCombinations !== 1 ? "s" : ""}
                  </Badge>
                </h4>

                <div>
                  <Label className="font-mono text-xs text-muted-foreground mb-2 block">
                    Chunk Sizes (tokens)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {CHUNK_SIZE_OPTIONS.map((cs) => (
                      <label key={cs} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedChunkSizes.includes(cs)}
                          onCheckedChange={() =>
                            toggleItem(selectedChunkSizes, cs, setSelectedChunkSizes)
                          }
                        />
                        <span className="font-mono text-sm text-foreground">{cs}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="font-mono text-xs text-muted-foreground mb-2 block">
                    Embedding Models
                  </Label>
                  <div className="flex flex-col gap-2">
                    {EMBEDDING_MODEL_OPTIONS.map((em) => (
                      <label key={em} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedEmbeddings.includes(em)}
                          onCheckedChange={() =>
                            toggleItem(selectedEmbeddings, em, setSelectedEmbeddings)
                          }
                        />
                        <span className="font-mono text-sm text-foreground">{em}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="font-mono text-xs text-muted-foreground mb-2 block">
                    Retriever Types
                  </Label>
                  <div className="flex flex-wrap gap-4">
                    {RETRIEVER_TYPE_OPTIONS.map((rt) => (
                      <label key={rt} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedRetrievers.includes(rt)}
                          onCheckedChange={() =>
                            toggleItem(selectedRetrievers, rt, setSelectedRetrievers)
                          }
                        />
                        <span className="font-mono text-sm text-foreground">{rt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div className="space-y-2">
                    <Label className="font-mono text-xs text-muted-foreground">Top K</Label>
                    <Input
                      type="number"
                      value={topK}
                      onChange={(e) => setTopK(e.target.value)}
                      className="bg-background font-mono"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-xs text-muted-foreground">Chunk Overlap</Label>
                    <Input
                      type="number"
                      value={chunkOverlap}
                      onChange={(e) => setChunkOverlap(e.target.value)}
                      className="bg-background font-mono"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  type="submit"
                  disabled={createSweep.isPending || totalCombinations === 0}
                  className="font-mono w-full sm:w-auto"
                >
                  {createSweep.isPending
                    ? "Launching..."
                    : `Launch ${totalCombinations} Experiment${totalCombinations !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !sweeps?.length ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center mt-8">
          <div className="flex flex-col items-center text-muted-foreground">
            <Zap className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium font-mono mb-2">No sweeps yet</h3>
            <p className="text-sm mb-6 max-w-md">
              Create a parameter sweep to automatically generate and run a grid of experiments.
            </p>
            <Button onClick={() => setOpen(true)} variant="outline" className="font-mono">
              <Plus className="w-4 h-4 mr-2" /> Create First Sweep
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {sweeps.map((sweep, idx) => (
            <motion.div
              key={sweep.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/sweeps/${sweep.id}`}>
                <Card className="hover-elevate bg-card border-border cursor-pointer hover:border-primary/50 transition-colors group">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-mono font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                            <Zap className="w-5 h-5 text-primary" />
                            {sweep.name}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-3">
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
                                <Activity className="w-2.5 h-2.5 mr-1 animate-pulse" />
                              )}
                              {sweep.status === "completed" && (
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                              )}
                              {sweep.status.toUpperCase()}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="font-mono text-[10px] bg-muted/50 text-muted-foreground"
                            >
                              {sweep.totalExperiments} experiments
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {format(new Date(sweep.createdAt), "MMM d, h:mm a")}
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-48 border-t md:border-t-0 md:border-l border-border bg-background/30 p-5 flex flex-col justify-center gap-3">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
                          Progress
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{
                                width: `${
                                  sweep.totalExperiments > 0
                                    ? Math.round(
                                        (sweep.completedExperiments / sweep.totalExperiments) * 100
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground shrink-0">
                            {sweep.completedExperiments}/{sweep.totalExperiments}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end text-primary text-xs font-mono">
                        View <ArrowRight className="w-3 h-3 ml-1" />
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
