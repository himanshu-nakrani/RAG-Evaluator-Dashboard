import { AppLayout } from "./components/layout/app-layout";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Documents from "@/pages/documents";
import QuestionSets from "@/pages/question-sets";
import QuestionSetDetail from "@/pages/question-set-detail";
import Experiments from "@/pages/experiments";
import ExperimentDetail from "@/pages/experiment-detail";
import EvalRunDetail from "@/pages/eval-run-detail";
import Leaderboard from "@/pages/leaderboard";
import Sweeps from "@/pages/sweeps";
import SweepDetail from "@/pages/sweep-detail";
import ExperimentTrends from "@/pages/experiment-trends";
import ExperimentComparison from "@/pages/experiment-comparison";
import TemplatesLibrary from "@/pages/templates-library";
import Presets from "@/pages/presets";
import Challenge from "@/pages/challenge";
import Arena from "@/pages/arena";
import ArenaDetail from "@/pages/arena-detail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/documents" component={Documents} />
        <Route path="/question-sets" component={QuestionSets} />
        <Route path="/question-sets/:id" component={QuestionSetDetail} />
        <Route path="/experiments" component={Experiments} />
        <Route path="/experiments/compare" component={ExperimentComparison} />
        <Route path="/experiments/:id/trends" component={ExperimentTrends} />
        <Route path="/experiments/:id" component={ExperimentDetail} />
        <Route path="/eval-runs/:id" component={EvalRunDetail} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/sweeps" component={Sweeps} />
        <Route path="/sweeps/:id" component={SweepDetail} />
        <Route path="/templates" component={TemplatesLibrary} />
        <Route path="/presets" component={Presets} />
        <Route path="/challenge" component={Challenge} />
        <Route path="/arena" component={Arena} />
        <Route path="/arena/:id" component={ArenaDetail} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
