import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Files, 
  MessageSquare, 
  FlaskConical,
  Trophy,
  Zap,
  BookMarked,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Documents", href: "/documents", icon: Files },
  { name: "Question Sets", href: "/question-sets", icon: MessageSquare },
  { name: "Experiments", href: "/experiments", icon: FlaskConical },
  { name: "Sweeps", href: "/sweeps", icon: Zap },
  { name: "Compare", href: "/experiments/compare", icon: Scale },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Templates", href: "/templates", icon: BookMarked },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row dark">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-card border-r border-border shrink-0 flex flex-col h-auto md:h-screen sticky top-0">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground font-mono tracking-tight">RAG_EVAL</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          <div className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider px-2">Navigation</div>
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
