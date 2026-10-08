import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  GitFork,
  Milestone,
  Briefcase,
  BarChart3,
  Bot,
  User,
  Settings,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/graph', label: 'Graph', icon: GitFork },
  { to: '/app/path', label: 'Path', icon: Milestone },
  { to: '/app/careers', label: 'Careers', icon: Briefcase },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/assistant', label: 'Assistant', icon: Bot },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

/**
 * Sidebar navigation component.
 * Static desktop sidebar on >= 1024px; slide-over drawer below 1024px.
 *
 * @param {Object} props
 * @param {boolean} [props.isOpen=false] - Drawer open state on mobile/tablet
 * @param {Function} [props.onClose] - Drawer close callback
 */
export function Sidebar({ isOpen = false, onClose }) {
  const content = (
    <div className="flex flex-col h-full bg-paper">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b-2 border-ink">
        <NavLink to="/app/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-display font-black text-sm border-2 border-ink shadow-sm shrink-0">
            SG
          </div>
          <span className="font-display text-lg tracking-tight text-ink font-bold">
            SKILLGRAPH
          </span>
        </NavLink>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 text-ink hover:bg-brand-soft border-2 border-ink shadow-sm transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-brand text-white border-2 border-ink shadow-sm'
                  : 'text-ink hover:bg-brand-soft border-2 border-transparent hover:border-ink hover:shadow-sm'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t-2 border-ink text-xs font-mono text-muted flex items-center justify-between">
        <span>STUDENT PORTAL</span>
        <span className="px-1.5 py-0.5 bg-brand-soft text-ink border border-ink text-[10px] font-bold">
          v1.0
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar (>= 1024px) */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r-2 border-ink bg-paper h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile/Tablet Drawer (< 1024px) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-ink/50 transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer card */}
          <aside className="relative w-64 max-w-[80vw] h-full bg-paper border-r-2 border-ink shadow-lg flex flex-col z-10 animate-in slide-in-from-left duration-150">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

export default Sidebar;
