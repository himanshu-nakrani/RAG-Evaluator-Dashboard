import { useState } from "react";
import { useParams } from "wouter";
import { useGetExperiment, useCreateEvalRun, useCompareExperimentRuns, getGetExperimentQueryKey, getCompareExperimentRunsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, ArrowLeft, ArrowRight, Play, Settings, BarChart2, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

export default function ExperimentDetail() {
  const { id } = useParams();
  const expId = Number(id);
  const { data: exp, isLoading: expLoading } = useGetExperiment(expId, { query: { enabled: !!expId, queryKey: getGetExperimentQueryKey(expId), refetchInterval: 5000 } });
  const { data: comparison } = useCompareExperimentRuns(expId, { query: { enabled: !!expId, queryKey: getCompareExperimentRunsQueryKey(expId) } });
  
  const createRun = useCreateEvalRun();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRunEval = async () => {
    if (!exp) return;
    createRun.mutate({ id: expId, data: { questionSetId: exp.questionSetId } }, {
      onSuccess: () => {
        toast({ title: "Evaluation run started", description: "This may take a few minutes." });
        queryClient.invalidateQueries({ queryKey: getGetExperimentQueryKey(expId) });
        queryClient.invalidateQueries({ queryKey: getCompareExperimentRunsQueryKey(expId) });
      },
      onError: (err) => {
        toast({ title: "Failed to start run", description: String(err), variant: "destructive" });
      }
    });
  };

  if (expLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!exp) return <div>Experiment not found</div>;

  const chartData = comparison?.runs?.map(r => ({
    run: `Run ${r.runNumber}`,
    Faithfulness: r.avgFaithfulness || 0,
    ContextRecall: r.avgContextRecall || 0,
  })).reverse() || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <Link href="/experiments">
          <span className="flex items-center hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Experiments
          </span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-primary" />
            {exp.name}
          </h1>
        </div>
        
        <Button onClick={handleRunEval} disabled={createRun.isPending} className="font-mono shadow-md hover-elevate">
          {createRun.isPending ? (
            <Activity className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2 fill-current" />
          )}
          {createRun.isPending ? "Starting Run..." : "Run Evaluation"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="font-mono text-sm flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <Settings className="w-4 h-4" /> Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              <div className="p-4 flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground">Embedding</span>
                <Badge variant="outline" className="font-mono">{exp.embeddingModel}</Badge>
              </div>
              <div className="p-4 flex justify-between items-center bg-muted/10">
                <span className="text-xs font-mono text-muted-foreground">Retriever</span>
                <Badge variant="outline" className="font-mono">{exp.retrieverType}</Badge>
              </div>
              <div className="p-4 flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground">Chunk Size</span>
                <span className="text-sm font-mono font-medium">{exp.chunkSize}</span>
              </div>
              <div className="p-4 flex justify-between items-center bg-muted/10">
                <span className="text-xs font-mono text-muted-foreground">Overlap</span>
                <span className="text-sm font-mono font-medium">{exp.chunkOverlap}</span>
              </div>
              <div className="p-4 flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground">Top K</span>
                <span className="text-sm font-mono font-medium">{exp.topK}</span>
              </div>
              <div className="p-4 text-xs font-mono text-muted-foreground flex flex-col gap-1 bg-muted/20">
                <div>Doc ID: {exp.documentId}</div>
                <div>Questions ID: {exp.questionSetId}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-1 lg:col-span-2 space-y-6">
          {chartData.length > 1 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-sm flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                  <BarChart2 className="w-4 h-4" /> Metric Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="run" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="var(--color-muted-foreground)" />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="var(--color-muted-foreground)" />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px' }} 
                      itemStyle={{ color: 'var(--color-foreground)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="Faithfulness" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="ContextRecall" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Evaluation Runs
            </h3>
            
            {(!exp.runs || exp.runs.length === 0) ? (
              <div className="text-center p-8 border border-dashed border-border rounded-lg bg-card/50 text-muted-foreground text-sm">
                No evaluation runs yet. Click "Run Evaluation" to start testing this pipeline.
              </div>
            ) : (
              <div className="space-y-3">
                {exp.runs.map((run) => (
                  <Link key={run.id} href={`/eval-runs/${run.id}`}>
                    <div className="border border-border bg-card rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col md:flex-row md:items-center gap-4 hover-elevate">
                      <div className="w-full md:w-1/4">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          Run #{run.id}
                          {run.status === 'running' && <Activity className="w-3 h-3 text-warning animate-pulse" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(run.createdAt), 'MMM d, h:mm a')}
                        </div>
                        <Badge variant="outline" className={`mt-2 text-[10px] ${
                          run.status === 'completed' ? 'border-success text-success bg-success/10' :
                          run.status === 'failed' ? 'border-destructive text-destructive bg-destructive/10' :
                          'border-warning text-warning bg-warning/10'
                        }`}>
                          {run.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex-1 flex justify-around sm:justify-start sm:gap-12 border-t md:border-t-0 md:border-l border-border/50 pt-3 md:pt-0 md:pl-6">
                        <div className="text-center md:text-left">
                          <div className="text-[10px] text-muted-foreground mb-1 font-medium">Faithfulness</div>
                          <div className={`font-semibold text-lg ${
                            run.status !== 'completed' ? 'text-muted-foreground' :
                            (run.avgFaithfulness || 0) >= 0.8 ? 'metric-green' :
                            (run.avgFaithfulness || 0) >= 0.5 ? 'metric-amber' : 'metric-red'
                          }`}>
                            {run.status === 'completed' && run.avgFaithfulness != null ? run.avgFaithfulness.toFixed(3) : '-'}
                          </div>
                        </div>
                        <div className="text-center md:text-left">
                          <div className="text-[10px] text-muted-foreground mb-1 font-medium">Context Recall</div>
                          <div className={`font-semibold text-lg ${
                            run.status !== 'completed' ? 'text-muted-foreground' :
                            (run.avgContextRecall || 0) >= 0.8 ? 'metric-green' :
                            (run.avgContextRecall || 0) >= 0.5 ? 'metric-amber' : 'metric-red'
                          }`}>
                            {run.status === 'completed' && run.avgContextRecall != null ? run.avgContextRecall.toFixed(3) : '-'}
                          </div>
                        </div>
                        <div className="text-center md:text-left hidden sm:block">
                          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Latency</div>
                          <div className="font-mono font-bold text-lg text-foreground">
                            {run.status === 'completed' && run.avgLatencyMs != null ? `${Math.round(run.avgLatencyMs)}ms` : '-'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="hidden md:flex items-center text-muted-foreground">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
