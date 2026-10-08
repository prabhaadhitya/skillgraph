import { useNavigate } from 'react-router';
import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../ui/Button.jsx';

/**
 * TopBar component for AppShell.
 * Displays user name, mobile navigation toggle, and logout button.
 *
 * @param {Object} props
 * @param {Function} [props.onOpenDrawer] - Handler to open drawer on mobile/tablet
 */
export function TopBar({ onOpenDrawer }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  const displayName = user?.name || 'Student';

  return (
    <header className="h-16 px-4 lg:px-8 bg-surface border-b-2 border-ink flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left: Mobile hamburger menu toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="lg:hidden p-2 text-ink hover:bg-brand-soft border-2 border-ink shadow-sm transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="font-display text-sm tracking-tight text-ink hidden sm:inline-block uppercase">
          SKILLGRAPH PORTAL
        </span>
      </div>

      {/* Right: User name + Logout button */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-2.5 py-1 bg-paper border-2 border-ink shadow-sm">
          <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold font-mono text-ink max-w-[120px] sm:max-w-[180px] truncate">
            {displayName}
          </span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleLogout}
          icon={LogOut}
          className="text-xs tracking-wider"
        >
          LOGOUT
        </Button>
      </div>
    </header>
  );
}

export default TopBar;
