import { Link, useLocation } from "wouter";
import { useState, useCallback } from "react";
import {
  LayoutDashboard,
  Files,
  MessageSquare,
  FlaskConical,
  Trophy,
  Zap,
  BookMarked,
  Scale,
  Moon,
  Sun,
  Keyboard,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/theme-context";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

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

const SHORTCUTS = [
  { keys: ["⌘", "N"], description: "Create new item on current page" },
  { keys: ["⌘", "K"], description: "Focus search bar" },
  { keys: ["⌘", "R"], description: "Run evaluation (experiment page)" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["Esc"], description: "Close dialog / clear search" },
];

function KbdKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-[11px] font-medium rounded border border-border bg-muted text-muted-foreground font-mono">
      {children}
    </kbd>
  );
}

function NavItems({ onClick }: { onClick?: () => void }) {
  const [location] = useLocation();
  return (
    <div className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-0.5" role="list">
      {navigation.map((item) => {
        const isActive =
          location === item.href ||
          (item.href !== "/" && location.startsWith(item.href));
        return (
          <div key={item.name} role="listitem">
            <Link href={item.href}>
              <span
                aria-current={isActive ? "page" : undefined}
                onClick={onClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-[14px]",
                  isActive
                    ? "bg-sidebar-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground font-normal"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function SidebarFooter({
  onShortcuts,
  onTheme,
  resolvedTheme,
}: {
  onShortcuts: () => void;
  onTheme: () => void;
  resolvedTheme: string;
}) {
  return (
    <div className="border-t border-sidebar-border px-3 py-3 flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={onShortcuts}
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="w-4 h-4" aria-hidden="true" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={onTheme}
        aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {resolvedTheme === "dark" ? (
          <Sun className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);

  useKeyboardShortcut("?", openShortcuts, { enabled: true, preventDefault: false });
  useKeyboardShortcut("Escape", () => {
    if (shortcutsOpen) setShortcutsOpen(false);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  }, { enabled: shortcutsOpen || mobileMenuOpen });

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex md:w-64 bg-sidebar border-r border-sidebar-border shrink-0 flex-col h-screen sticky top-0"
      >
        <div className="px-4 py-5 flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0"
            aria-hidden="true"
          >
            R
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-foreground">RAG Eval</span>
        </div>
        <NavItems />
        <SidebarFooter onShortcuts={openShortcuts} onTheme={toggleTheme} resolvedTheme={resolvedTheme} />
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0"
            aria-hidden="true"
          >
            R
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-foreground">RAG Eval</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen
              ? <X className="w-4 h-4" aria-hidden="true" />
              : <Menu className="w-4 h-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-30 bg-black/40"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <motion.nav
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-40 w-72 bg-sidebar border-r border-sidebar-border flex flex-col shadow-xl"
              aria-label="Mobile navigation"
            >
              <div className="px-4 py-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0"
                    aria-hidden="true"
                  >
                    R
                  </div>
                  <span className="font-semibold text-[15px] tracking-tight text-foreground">RAG Eval</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
              <NavItems onClick={() => setMobileMenuOpen(false)} />
              <SidebarFooter onShortcuts={() => { setMobileMenuOpen(false); openShortcuts(); }} onTheme={toggleTheme} resolvedTheme={resolvedTheme} />
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="flex-1 p-4 md:p-6 lg:p-10 overflow-y-auto">
          <div className="mx-auto max-w-5xl w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-[400px] border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-primary" aria-hidden="true" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {SHORTCUTS.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-sm text-foreground">{s.description}</span>
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  {s.keys.map((k, ki) => (
                    <KbdKey key={ki}>{k}</KbdKey>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            On Windows/Linux, use <KbdKey>Ctrl</KbdKey> in place of <KbdKey>⌘</KbdKey>.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
