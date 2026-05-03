import React from "react";
import { 
  LayoutDashboard, 
  FileText, 
  ListOrdered, 
  FlaskConical, 
  GitMerge, 
  Trophy, 
  Library, 
  Activity,
  CheckCircle2,
  Loader2,
  ChevronRight
} from "lucide-react";

export function WarmScientific() {
  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: FileText, label: "Documents", active: false },
    { icon: ListOrdered, label: "Question Sets", active: false },
    { icon: FlaskConical, label: "Experiments", active: false },
    { icon: Activity, label: "Sweeps", active: false },
    { icon: GitMerge, label: "Compare", active: false },
    { icon: Trophy, label: "Leaderboard", active: false },
    { icon: Library, label: "Templates", active: false },
  ];

  const stats = [
    { label: "Total Documents", value: "12" },
    { label: "Question Sets", value: "4" },
    { label: "Experiments", value: "27" },
    { label: "Eval Runs", value: "89" },
  ];

  const recentRuns = [
    { id: 89, experiment: "Exp-027", dataset: "QS-004", status: "completed", time: "2h ago" },
    { id: 88, experiment: "Exp-027", dataset: "QS-003", status: "completed", time: "5h ago" },
    { id: 87, experiment: "Exp-026", dataset: "QS-004", status: "running", time: "1d ago" },
  ];

  return (
    <div 
      className="min-h-screen flex w-full"
      style={{ 
        backgroundColor: "#1c1510", 
        color: "#fdf8f0",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      {/* Sidebar */}
      <div 
        className="w-64 border-r flex flex-col"
        style={{ 
          backgroundColor: "#2a1f16", 
          borderColor: "#3d2e21" 
        }}
      >
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded flex items-center justify-center font-serif text-lg font-bold"
              style={{ backgroundColor: "#d97706", color: "#fff" }}
            >
              R
            </div>
            <span className="font-serif text-xl tracking-wide" style={{ color: "#f59e0b" }}>RAG Eval</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          {sidebarItems.map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-sm ${
                item.active ? "bg-opacity-20 font-medium" : "hover:bg-opacity-10 opacity-70 hover:opacity-100"
              }`}
              style={{
                backgroundColor: item.active ? "#d97706" : "transparent",
                color: item.active ? "#f59e0b" : "inherit"
              }}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <header>
            <h1 className="font-serif text-4xl mb-2" style={{ color: "#fdf8f0" }}>Overview</h1>
            <p className="opacity-60 text-lg">System evaluation metrics and recent experiment runs.</p>
          </header>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div 
                key={i} 
                className="p-6 rounded-lg border shadow-sm relative overflow-hidden"
                style={{ 
                  backgroundColor: "#2a1f16",
                  borderColor: "#3d2e21",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
                }}
              >
                <div 
                  className="absolute top-0 right-0 w-16 h-16 opacity-10 transform translate-x-4 -translate-y-4 rounded-full"
                  style={{ backgroundColor: "#d97706" }}
                ></div>
                <div className="text-sm opacity-70 mb-3">{stat.label}</div>
                <div className="text-4xl font-mono text-amber-500" style={{ color: "#f59e0b" }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-3 gap-6">
            
            {/* Recent Runs (2/3) */}
            <div 
              className="col-span-2 p-6 rounded-lg border shadow-sm"
              style={{ 
                backgroundColor: "#2a1f16",
                borderColor: "#3d2e21",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
              }}
            >
              <div className="flex justify-between items-end mb-6 border-b pb-4" style={{ borderColor: "#3d2e21" }}>
                <h2 className="font-serif text-2xl">Recent Eval Runs</h2>
                <button className="text-sm opacity-70 hover:opacity-100 flex items-center gap-1 transition-opacity">
                  View all <ChevronRight size={14} />
                </button>
              </div>
              
              <div className="space-y-3">
                {recentRuns.map((run, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-4 rounded border transition-colors cursor-pointer"
                    style={{ 
                      backgroundColor: "#1c1510",
                      borderColor: "#3d2e21"
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {run.status === "completed" ? (
                        <CheckCircle2 size={20} style={{ color: "#d97706" }} />
                      ) : (
                        <Loader2 size={20} className="animate-spin" style={{ color: "#f59e0b" }} />
                      )}
                      <div>
                        <div className="font-mono text-lg mb-1">Run #{run.id}</div>
                        <div className="text-xs opacity-60 flex gap-3">
                          <span>{run.experiment}</span>
                          <span>&bull;</span>
                          <span>{run.dataset}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm opacity-60 mb-1">{run.time}</div>
                      <div className="text-xs tracking-widest uppercase opacity-40">
                        {run.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Metrics (1/3) */}
            <div 
              className="col-span-1 p-6 rounded-lg border shadow-sm"
              style={{ 
                backgroundColor: "#2a1f16",
                borderColor: "#3d2e21",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
              }}
            >
              <h2 className="font-serif text-2xl mb-6 border-b pb-4" style={{ borderColor: "#3d2e21" }}>Best Metrics</h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm opacity-70">Faithfulness</span>
                    <span className="font-mono text-xl" style={{ color: "#f59e0b" }}>0.891</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: "89.1%", backgroundColor: "#d97706" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm opacity-70">Context Recall</span>
                    <span className="font-mono text-xl" style={{ color: "#f59e0b" }}>0.847</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: "84.7%", backgroundColor: "#d97706" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm opacity-70">Avg Latency</span>
                    <span className="font-mono text-xl" style={{ color: "#f59e0b" }}>243ms</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: "75%", backgroundColor: "#d97706" }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
