import React from "react";
import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  FlaskConical,
  FastForward,
  GitCompare,
  Trophy,
  Layers,
  CheckCircle2,
  Loader2,
  ArrowRight,
  BarChart3,
  Search,
  Bell,
  Settings
} from "lucide-react";

export function MidnightStudio() {
  return (
    <div className="flex min-h-screen bg-[#0a0f1e] text-slate-300 font-sans selection:bg-cyan-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0d1424] flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-600 p-[1px]">
            <div className="w-full h-full bg-[#0d1424] rounded-[7px] flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <span className="text-white font-semibold tracking-wide text-sm">EvalStudio</span>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1">
          <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" active />
          <SidebarItem icon={<FileText size={18} />} label="Documents" />
          <SidebarItem icon={<HelpCircle size={18} />} label="Question Sets" />
          <SidebarItem icon={<FlaskConical size={18} />} label="Experiments" />
          <SidebarItem icon={<FastForward size={18} />} label="Sweeps" />
          <SidebarItem icon={<GitCompare size={18} />} label="Compare" />
          <SidebarItem icon={<Trophy size={18} />} label="Leaderboard" />
          <SidebarItem icon={<Layers size={18} />} label="Templates" />
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
              <span className="text-xs text-white">AD</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-white font-medium">Admin User</span>
              <span className="text-xs text-slate-500">Pro Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
          <div className="flex items-center text-sm text-slate-400">
            <span>Project</span>
            <span className="mx-2">/</span>
            <span className="text-white">Core Evaluation</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Search size={18} className="hover:text-white cursor-pointer transition-colors" />
            <Bell size={18} className="hover:text-white cursor-pointer transition-colors" />
            <Settings size={18} className="hover:text-white cursor-pointer transition-colors" />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Overview</h1>
              <p className="text-slate-400 mt-2 text-sm">
                Real-time insights into your retrieval-augmented generation systems.
              </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard label="Total Documents" value="12" />
              <StatCard label="Question Sets" value="4" />
              <StatCard label="Experiments" value="27" />
              <StatCard label="Eval Runs" value="89" />
            </div>

            {/* Main Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Eval Runs */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Recent Eval Runs</h2>
                  <button className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                    View all <ArrowRight size={14} />
                  </button>
                </div>
                <div className="bg-[#ffffff03] border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
                  <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <div className="col-span-2">Run ID</div>
                    <div className="col-span-5">Experiment</div>
                    <div className="col-span-3">Status</div>
                    <div className="col-span-2 text-right">Time</div>
                  </div>
                  <div className="divide-y divide-white/5">
                    <RunRow id="89" experiment="gpt-4-baseline-v2" status="running" time="Just now" />
                    <RunRow id="88" experiment="claude-3-haiku-search" status="completed" time="2h ago" />
                    <RunRow id="87" experiment="mistral-hybrid-search" status="completed" time="5h ago" />
                  </div>
                </div>
              </div>

              {/* Best Metrics */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Best Metrics</h2>
                <div className="bg-[#ffffff03] border border-white/10 rounded-xl p-5 backdrop-blur-sm space-y-6">
                  <MetricRow label="Faithfulness" value="0.891" />
                  <MetricRow label="Context Recall" value="0.847" />
                  <MetricRow label="Avg Latency" value="243ms" isLatency />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active 
          ? "bg-gradient-to-r from-cyan-500/10 to-violet-500/10 text-white border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" 
          : "text-slate-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <div className={active ? "text-cyan-400" : "text-slate-500"}>{icon}</div>
      {label}
    </a>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#ffffff03] border border-white/10 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100" />
      <span className="text-slate-400 text-sm font-medium relative z-10">{label}</span>
      <div className="mt-2 text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500 relative z-10">
        {value}
      </div>
    </div>
  );
}

function RunRow({ id, experiment, status, time }: { id: string; experiment: string; status: "completed" | "running"; time: string }) {
  return (
    <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/[0.02] transition-colors cursor-pointer group">
      <div className="col-span-2 text-sm font-mono text-slate-300">#{id}</div>
      <div className="col-span-5 text-sm text-slate-200 font-medium group-hover:text-cyan-400 transition-colors">
        {experiment}
      </div>
      <div className="col-span-3">
        {status === "completed" ? (
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2 py-1 rounded-md w-fit border border-emerald-400/20">
            <CheckCircle2 size={12} />
            Completed
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-medium bg-cyan-400/10 px-2 py-1 rounded-md w-fit border border-cyan-400/20">
            <Loader2 size={12} className="animate-spin" />
            Running
          </div>
        )}
      </div>
      <div className="col-span-2 text-right text-sm text-slate-500">{time}</div>
    </div>
  );
}

function MetricRow({ label, value, isLatency = false }: { label: string; value: string; isLatency?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-300 font-medium">{label}</span>
        <span className="text-sm font-bold text-white">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-[#0d1424] rounded-full overflow-hidden border border-white/5">
        <div 
          className={`h-full rounded-full ${isLatency ? 'bg-gradient-to-r from-violet-500 to-cyan-400' : 'bg-gradient-to-r from-cyan-400 to-violet-500'}`}
          style={{ width: isLatency ? '65%' : '85%' }}
        />
      </div>
    </div>
  );
}
