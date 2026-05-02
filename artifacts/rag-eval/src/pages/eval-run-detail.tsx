import { useParams } from "wouter";
import { useGetEvalRun, getGetEvalRunQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

function ResultRow({ result }: { result: any }) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number | null | undefined) => {
    if (score == null) return "text-muted-foreground";
    if (score >= 0.8) return "metric-green";
    if (score >= 0.5) return "metric-amber";
    return "metric-red";
  };

  return (
    <div className="border-b border-border/50 last:border-0 bg-card hover:bg-muted/5 transition-colors">
      <div 
        className="p-4 flex flex-col md:flex-row gap-4 cursor-pointer items-start md:items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className="text-xs font-mono text-muted-foreground shrink-0">Q{result.questionId}</span>
          </div>
          <p className="font-medium text-sm text-foreground pl-6 line-clamp-2">{result.questionText}</p>
        </div>
        
        <div className="flex gap-6 w-full md:w-auto pl-6 md:pl-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/30">
          <div className="text-center w-20">
            <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">Faithful</div>
            <div className={`font-mono font-bold text-sm ${getScoreColor(result.faithfulness)}`}>
              {result.faithfulness != null ? result.faithfulness.toFixed(2) : '-'}
            </div>
          </div>
          <div className="text-center w-20">
            <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">Recall</div>
            <div className={`font-mono font-bold text-sm ${getScoreColor(result.contextRecall)}`}>
              {result.contextRecall != null ? result.contextRecall.toFixed(2) : '-'}
            </div>
          </div>
          <div className="text-center w-16 hidden sm:block">
            <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">Time</div>
            <div className="font-mono text-sm text-muted-foreground">
              {result.latencyMs != null ? `${Math.round(result.latencyMs)}ms` : '-'}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 bg-muted/10 grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-border/50">
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                  Generated Answer
                  {result.faithfulness != null && result.faithfulness < 0.5 && (
                    <Badge variant="outline" className="text-[9px] border-destructive text-destructive h-4 px-1 py-0 rounded-sm ml-auto">Low Faithfulness</Badge>
                  )}
                </div>
                <div className="bg-background border border-border rounded-md p-4 text-sm font-sans whitespace-pre-wrap text-foreground/90 h-64 overflow-y-auto">
                  {result.generatedAnswer || <span className="italic text-muted-foreground">No answer generated</span>}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                  Retrieved Context
                  {result.contextRecall != null && result.contextRecall < 0.5 && (
                    <Badge variant="outline" className="text-[9px] border-warning text-warning h-4 px-1 py-0 rounded-sm ml-auto">Low Recall</Badge>
                  )}
                </div>
                <div className="bg-background border border-border rounded-md p-4 text-xs font-mono whitespace-pre-wrap text-muted-foreground h-64 overflow-y-auto opacity-80 leading-relaxed">
                  {result.retrievedContext || <span className="italic">No context retrieved</span>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EvalRunDetail() {
  const { id } = useParams();
  const runId = Number(id);
  const { data: run, isLoading } = useGetEvalRun(runId, { query: { enabled: !!runId, queryKey: getGetEvalRunQueryKey(runId), refetchInterval: (data) => data?.status === 'running' || data?.status === 'pending' ? 2000 : false } });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  if (!run) return <div>Run not found</div>;

  const isRunning = run.status === 'running' || run.status === 'pending';
  const isFailed = run.status === 'failed';
  
  // Calculate progress if running
  const progress = isRunning && run.results?.length && run.results.length > 0 
    ? Math.round((run.results.filter(r => r.generatedAnswer != null).length / run.results.length) * 100) 
    : isRunning ? 5 : 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground mb-4">
        <Link href={`/experiments/${run.experimentId}`}>
          <span className="flex items-center hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Experiment
          </span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-3">
            Run #{run.id}
            {isRunning && <Activity className="w-6 h-6 text-warning animate-pulse" />}
            {run.status === 'completed' && <CheckCircle2 className="w-6 h-6 text-success" />}
            {isFailed && <XCircle className="w-6 h-6 text-destructive" />}
          </h1>
          <div className="text-sm font-mono text-muted-foreground mt-2 flex items-center gap-4">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(run.createdAt), 'MMM d, yyyy h:mm a')}</span>
            {run.completedAt && (
              <span>Completed: {format(new Date(run.completedAt), 'h:mm:ss a')}</span>
            )}
          </div>
        </div>
      </div>

      {isRunning && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-6">
            <div className="flex justify-between font-mono text-sm mb-2 text-warning">
              <span>Evaluation in progress...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-warning/20" />
            <p className="text-xs font-mono text-muted-foreground mt-4 opacity-70">
              Evaluating pipeline against question set. This process runs inference and LLM-as-a-judge metrics.
            </p>
          </CardContent>
        </Card>
      )}

      {isFailed && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
            <div>
              <h3 className="font-mono font-bold text-destructive">Evaluation Run Failed</h3>
              <p className="text-sm font-mono text-muted-foreground mt-1">
                The pipeline encountered an error during evaluation. Check experiment configuration and document accessibility.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isFailed && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-xs font-mono uppercase text-muted-foreground mb-2">Avg Faithfulness</div>
              <div className={`text-3xl font-bold font-mono ${
                !run.avgFaithfulness ? 'text-muted-foreground' :
                run.avgFaithfulness >= 0.8 ? 'metric-green' :
                run.avgFaithfulness >= 0.5 ? 'metric-amber' : 'metric-red'
              }`}>
                {run.avgFaithfulness != null ? run.avgFaithfulness.toFixed(3) : (isRunning ? '...' : '-')}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-xs font-mono uppercase text-muted-foreground mb-2">Avg Context Recall</div>
              <div className={`text-3xl font-bold font-mono ${
                !run.avgContextRecall ? 'text-muted-foreground' :
                run.avgContextRecall >= 0.8 ? 'metric-green' :
                run.avgContextRecall >= 0.5 ? 'metric-amber' : 'metric-red'
              }`}>
                {run.avgContextRecall != null ? run.avgContextRecall.toFixed(3) : (isRunning ? '...' : '-')}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-xs font-mono uppercase text-muted-foreground mb-2">Avg Latency</div>
              <div className="text-3xl font-bold font-mono text-foreground">
                {run.avgLatencyMs != null ? `${Math.round(run.avgLatencyMs)}ms` : (isRunning ? '...' : '-')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {run.results && run.results.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-muted-foreground mb-4 pl-2 border-l-2 border-primary">
            Per-Question Breakdown
          </h3>
          <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
            {run.results.map((result) => (
              <ResultRow key={result.id} result={result} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
