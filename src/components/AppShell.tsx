import { useState, type ReactNode } from 'react';
import { BookOpen, Brain, ListChecks, GraduationCap, BarChart3, RotateCcw, Menu, X } from 'lucide-react';

export type SectionId = 'overview' | 'practice' | 'mistakes' | 'coach' | 'progress';

interface NavItem {
  id: SectionId;
  label: string;
  icon: typeof BookOpen;
  hint: string;
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen, hint: 'Your next action and key metrics' },
  { id: 'practice', label: 'Practice', icon: Brain, hint: 'Attempt UPSC Polity questions' },
  { id: 'mistakes', label: 'My Mistakes', icon: ListChecks, hint: 'Errors grouped by concept' },
  { id: 'coach', label: 'Revision Coach', icon: GraduationCap, hint: 'Adaptive learning tasks' },
  { id: 'progress', label: 'My Progress', icon: BarChart3, hint: 'History and comparisons' },
];

interface Props {
  active: SectionId;
  onNavigate: (s: SectionId) => void;
  onReset: () => void;
  children: ReactNode;
  pendingCount: number;
}

export function AppShell({ active, onNavigate, onReset, children, pendingCount }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = NAV.find((n) => n.id === active)!;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden rounded-md p-1.5 text-stone-600 hover:bg-stone-100"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <GraduationCap size={18} />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight">Mistake to Mastery</div>
                <div className="text-[11px] text-stone-500">UPSC Polity — study workspace</div>
              </div>
            </div>
          </div>
          <button
            onClick={onReset}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
          >
            <RotateCcw size={14} /> Reset demo
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block w-60 shrink-0">
          <nav className="sticky top-20 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === active;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    isActive ? 'bg-emerald-50 text-emerald-900' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-emerald-700' : 'text-stone-400 group-hover:text-stone-600'} />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium">{item.label}
                      {item.id === 'coach' && pendingCount > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">{pendingCount}</span>
                      )}
                    </span>
                    <span className="block text-[11px] leading-snug text-stone-400">{item.hint}</span>
                  </span>
                </button>
              );
            })}
            <button
              onClick={onReset}
              className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-stone-500 transition hover:bg-stone-100"
            >
              <RotateCcw size={14} /> Reset demo
            </button>
          </nav>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-stone-900/30" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-white p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Menu</span>
                <button onClick={() => setMobileOpen(false)} className="rounded p-1 hover:bg-stone-100"><X size={18} /></button>
              </div>
              <div className="space-y-1">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === active;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${isActive ? 'bg-emerald-50 text-emerald-900' : 'text-stone-700 hover:bg-stone-100'}`}
                    >
                      <Icon size={18} />
                      {item.label}
                      {item.id === 'coach' && pendingCount > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">{pendingCount}</span>
                      )}
                    </button>
                  );
                })}
                <button onClick={onReset} className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-100">
                  <RotateCcw size={14} /> Reset demo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main */}
        <main className="min-w-0 flex-1">
          <div className="mb-5">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{current.label}</h1>
            <p className="text-sm text-stone-500">{current.hint}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: typeof BookOpen; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
        <Icon size={22} />
      </div>
      <h3 className="text-base font-semibold text-stone-700">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-stone-500">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Button({ children, onClick, variant = 'primary', className = '', disabled, type = 'button' }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
  const styles = {
    primary: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm',
    secondary: 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
    ghost: 'text-stone-600 hover:bg-stone-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>{children}</button>;
}
