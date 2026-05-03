import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  HelpCircle, 
  TestTube, 
  Activity, 
  GitMerge, 
  Trophy, 
  BookTemplate,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';

export function QuietMinimal() {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, active: true },
    { name: 'Documents', icon: FileText, active: false },
    { name: 'Question Sets', icon: HelpCircle, active: false },
    { name: 'Experiments', icon: TestTube, active: false },
    { name: 'Sweeps', icon: Activity, active: false },
    { name: 'Compare', icon: GitMerge, active: false },
    { name: 'Leaderboard', icon: Trophy, active: false },
    { name: 'Templates', icon: BookTemplate, active: false },
  ];

  const stats = [
    { label: 'Total Documents', value: '12' },
    { label: 'Question Sets', value: '4' },
    { label: 'Experiments', value: '27' },
    { label: 'Eval Runs', value: '89' },
  ];

  const recentRuns = [
    { id: 89, name: 'claude-3-opus-base', status: 'completed', time: '2m ago' },
    { id: 88, name: 'gpt-4-turbo-hyde', status: 'completed', time: '1h ago' },
    { id: 87, name: 'mixtral-8x7b-instruct', status: 'running', time: '2h ago' },
  ];

  const bestMetrics = [
    { label: 'Faithfulness', value: '0.891' },
    { label: 'Context Recall', value: '0.847' },
    { label: 'Avg Latency', value: '243ms' },
  ];

  return (
    <div className="flex min-h-screen font-sans" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-[#e2e8f0] flex flex-col py-6 px-4 shrink-0">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-6 h-6 rounded bg-[#4f46e5] flex items-center justify-center text-white font-bold text-xs">
            R
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-[#0f172a]">RAG Eval</span>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.name}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-[14px] transition-colors duration-200 ${
                item.active 
                  ? 'bg-[#f1f5f9] text-[#0f172a] font-medium' 
                  : 'text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]'
              }`}
            >
              <item.icon className={`w-4 h-4 ${item.active ? 'text-[#4f46e5]' : 'text-[#94a3b8]'}`} />
              {item.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <header>
            <h1 className="text-2xl font-semibold text-[#0f172a] tracking-tight">Overview</h1>
            <p className="text-[#64748b] text-[15px] mt-1">High-level view of your evaluation metrics and runs.</p>
          </header>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm shadow-[#f1f5f9]">
                <div className="text-[#64748b] text-[13px] font-medium mb-2">{stat.label}</div>
                <div className="text-3xl font-semibold text-[#0f172a] tracking-tight">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Recent Eval Runs */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-[#0f172a]">Recent Eval Runs</h2>
                <button className="text-[13px] text-[#4f46e5] hover:text-[#4338ca] font-medium flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              
              <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm shadow-[#f1f5f9]">
                <div className="divide-y divide-[#f1f5f9]">
                  {recentRuns.map((run) => (
                    <div key={run.id} className="p-4 flex items-center justify-between hover:bg-[#f8fafc] transition-colors group">
                      <div className="flex items-center gap-3">
                        {run.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-500" />
                        )}
                        <div>
                          <div className="text-[14px] font-medium text-[#0f172a] flex items-center gap-2">
                            <span>Run #{run.id}</span>
                            <span className="text-[#94a3b8] font-normal">—</span>
                            <span className="text-[#64748b] font-normal">{run.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[13px] text-[#94a3b8]">{run.time}</span>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[13px] text-[#64748b] hover:text-[#0f172a] font-medium">
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Best Metrics */}
            <div className="col-span-1 space-y-4">
              <h2 className="text-[16px] font-semibold text-[#0f172a]">Best Metrics</h2>
              
              <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm shadow-[#f1f5f9] space-y-6">
                {bestMetrics.map((metric, i) => (
                  <div key={i}>
                    <div className="text-[#64748b] text-[13px] font-medium mb-1">{metric.label}</div>
                    <div className="flex items-end gap-2">
                      <div className="text-2xl font-semibold text-[#0f172a] tracking-tight">{metric.value}</div>
                      {i !== 2 && <div className="text-[13px] text-emerald-600 font-medium mb-1">Top score</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
