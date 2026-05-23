import { useState } from "react";
import {
  useListArenaBattles,
  useCreateArenaBattle,
  useListExperiments,
  useListDocuments,
  useListQuestionSets,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Plus, Zap, Trophy } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-muted-foreground/10 text-muted-foreground",
  running: "bg-blue-500/10 text-blue-400",
  completed: "bg-green-500/10 text-green-400",
  failed: "bg-red-500/10 text-red-400",
};

export default function Arena() {
  const { data: battles, isLoading } = useListArenaBattles();
  const { data: documents } = useListDocuments();
  const { data: questionSets } = useListQuestionSets();
  const createBattle = useCreateArenaBattle();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [docId, setDocId] = useState("");
  const [qsId, setQsId] = useState("");
  const [configA, setConfigA] = useState({ chunkSize: 256, chunkOverlap: 50, embeddingModel: "text-embedding-3-small", retrieverType: "dense", topK: 5 });
  const [configB, setConfigB] = useState({ chunkSize: 1024, chunkOverlap: 100, embeddingModel: "text-embedding-3-large", retrieverType: "hybrid", topK: 10 });

  const handleCreate = async () => {
    if (!name || !docId || !qsId) {
      toast({ title: "Missing fields", description: "Name, document, and question set are required.", variant: "destructive" });
      return;
    }
    try {
      const battle = await createBattle.mutateAsync({
        data: { name, documentId: Number(docId), questionSetId: Number(qsId), configA, configB },
      });
      await queryClient.invalidateQueries({ queryKey: ["listArenaBattles"] });
      setOpen(false);
      toast({ title: "Battle created!", description: "Both sides are running…" });
      navigate(`/arena/${battle.id}`);
    } catch {
      toast({ title: "Error", description: "Failed to create battle.", variant: "destructive" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" aria-hidden="true" />
            RAG Arena
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pit two RAG configurations against each other — blind, side-by-side.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> New Battle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>New Arena Battle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="battle-name">Battle name</Label>
                <Input id="battle-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Dense vs Hybrid" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Document</Label>
                  <Select value={docId} onValueChange={setDocId}>
                    <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
                    <SelectContent>
                      {(documents ?? []).map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Question set</Label>
                  <Select value={qsId} onValueChange={setQsId}>
                    <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
                    <SelectContent>
                      {(questionSets ?? []).map((qs) => (
                        <SelectItem key={qs.id} value={String(qs.id)}>{qs.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(["A", "B"] as const).map((side, i) => {
                const config = side === "A" ? configA : configB;
                const setConfig = side === "A" ? setConfigA : setConfigB;
                return (
                  <div key={side} className="border border-border/50 rounded-lg p-3 space-y-2 bg-muted/10">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">Config {side}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {i === 0 ? "Dense + small chunks" : "Hybrid + large chunks"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Chunk</Label>
                        <Input className="h-7 text-xs" type="number" value={config.chunkSize}
                          onChange={(e) => setConfig({ ...config, chunkSize: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Overlap</Label>
                        <Input className="h-7 text-xs" type="number" value={config.chunkOverlap}
                          onChange={(e) => setConfig({ ...config, chunkOverlap: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Top-K</Label>
                        <Input className="h-7 text-xs" type="number" value={config.topK}
                          onChange={(e) => setConfig({ ...config, topK: Number(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Retriever</Label>
                        <Select value={config.retrieverType} onValueChange={(v) => setConfig({ ...config, retrieverType: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dense">Dense</SelectItem>
                            <SelectItem value="sparse">Sparse</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                            <SelectItem value="mmr">MMR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Embedding</Label>
                        <Select value={config.embeddingModel} onValueChange={(v) => setConfig({ ...config, embeddingModel: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text-embedding-3-small">OpenAI Small</SelectItem>
                            <SelectItem value="text-embedding-3-large">OpenAI Large</SelectItem>
                            <SelectItem value="text-embedding-ada-002">Ada 002</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button className="w-full" onClick={handleCreate} disabled={createBattle.isPending}>
                <Zap className="w-4 h-4 mr-2" aria-hidden="true" />
                {createBattle.isPending ? "Creating…" : "Start Battle"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Battle list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (<Skeleton key={i} className="h-32" />))}
        </div>
      ) : (battles ?? []).length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
          <div className="text-muted-foreground">
            <Swords className="w-10 h-10 mx-auto mb-3 opacity-20" aria-hidden="true" />
            <p className="text-sm">No battles yet. Start one!</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...(battles ?? [])].reverse().map((b) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className="border-border bg-card cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => navigate(`/arena/${b.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold">{b.name}</CardTitle>
                    <Badge className={`text-[10px] ${statusColors[b.status] ?? ""}`}>{b.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center gap-3 text-xs text-muted-foreground">
                  {b.metricWinner && (
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-yellow-500" aria-hidden="true" />
                      <span>Metrics: <span className="text-foreground font-semibold">{b.metricWinner}</span></span>
                    </div>
                  )}
                  {b.humanWinner && (
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-primary" aria-hidden="true" />
                      <span>Human: <span className="text-foreground font-semibold">{b.humanWinner}</span></span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
