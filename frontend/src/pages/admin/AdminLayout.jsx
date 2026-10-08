import { NavLink, Outlet } from 'react-router';
import { Database, GitFork, Briefcase, ShieldCheck } from 'lucide-react';

export function AdminLayout() {
  const navItems = [
    { to: '/admin/skills', label: 'SKILLS', icon: Database },
    { to: '/admin/relationships', label: 'RELATIONSHIPS', icon: GitFork },
    { to: '/admin/careers', label: 'CAREERS', icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      {/* Admin Top Header */}
      <header className="border-b-2 border-ink bg-surface px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-ink bg-brand text-white flex items-center justify-center font-display font-black text-lg shadow-badge">
              KB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black text-xl tracking-tight">KNOWLEDGE BASE</h1>
                <span className="inline-flex items-center gap-1 border-2 border-ink bg-brand-light px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider text-ink shadow-badge">
                  <ShieldCheck size={12} />
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-ink-muted font-mono">
                Manage curriculum graph, skill relationships, and career closure models
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/app/dashboard"
              className="inline-block border-2 border-ink bg-paper px-3 py-1.5 text-xs font-mono font-bold tracking-wider hover:bg-surface transition-colors shadow-button active:translate-x-0.5 active:translate-y-0.5"
            >
              ← BACK TO APP
            </a>
          </div>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="border-b-2 border-ink bg-surface px-6">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 border-2 border-ink px-4 py-2 font-display text-xs font-black tracking-wider transition-all shadow-button ${
                    isActive
                      ? 'bg-brand text-white translate-x-0.5 translate-y-0.5 shadow-none'
                      : 'bg-paper text-ink hover:bg-surface'
                  }`
                }
              >
                <Icon size={14} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Main Content View */}
      <main className="max-w-7xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
