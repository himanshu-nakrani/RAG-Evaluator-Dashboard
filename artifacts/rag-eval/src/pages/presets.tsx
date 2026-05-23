import { useState } from "react";
import { useListPresets, useUsePreset } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { BookMarked, Play, Code2, Shield, Headphones, ScrollText } from "lucide-react";

const categoryIcons: Record<string, typeof Code2> = {
  technical: Code2,
  legal: Shield,
  support: Headphones,
  fantasy: ScrollText,
};

const categoryColors: Record<string, string> = {
  technical: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  legal: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  support: "bg-green-500/10 text-green-400 border-green-500/30",
  fantasy: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

export default function Presets() {
  const { data: presets, isLoading } = useListPresets();
  const [, navigate] = useLocation();
  const usePreset = useUsePreset();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [usingId, setUsingId] = useState<number | null>(null);

  const handleUse = async (id: number, name: string) => {
    setUsingId(id);
    try {
      const result = await usePreset.mutateAsync({ id, data: { name: `${name} Run` } });
      await queryClient.invalidateQueries({ queryKey: ["listExperiments"] });
      toast({ title: "Preset launched", description: "Experiment and eval run created." });
      navigate(`/eval-runs/${result.evalRunId}`);
    } catch {
      toast({ title: "Error", description: "Failed to launch preset.", variant: "destructive" });
      setUsingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <BookMarked className="w-8 h-8 text-primary" aria-hidden="true" />
          Preset Scenarios
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Curated document + question combinations — one click to run an evaluation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(presets ?? []).map((p) => {
          const CatIcon = categoryIcons[p.category] ?? Code2;
          const colorClass = categoryColors[p.category] ?? "";
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-border bg-card h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-tight">{p.name}</CardTitle>
                    <Badge variant="outline" className={`text-[10px] border ${colorClass}`}>
                      <CatIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                      {p.category}
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end gap-3">
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground border border-border/50 rounded-lg p-2.5 bg-muted/20">
                    <div>
                      <span className="opacity-60">Chunk</span>
                      <div className="text-foreground font-bold">{p.defaultChunkSize}</div>
                    </div>
                    <div>
                      <span className="opacity-60">Top-K</span>
                      <div className="text-foreground font-bold">{p.defaultTopK}</div>
                    </div>
                    <div>
                      <span className="opacity-60">Retriever</span>
                      <div className="text-foreground font-bold text-[9px]">{p.defaultRetrieverType}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={usePreset.isPending && usingId === p.id}
                    onClick={() => handleUse(p.id, p.name)}
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    {usingId === p.id ? "Launching…" : "Use Preset"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
