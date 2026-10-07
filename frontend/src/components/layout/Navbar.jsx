import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../ui/Button.jsx';

/**
 * Floating white pill navbar with soft shadow.
 * Features logo disc on left, smooth scroll links, and auth action buttons.
 * Collapses to mobile hamburger below 768px.
 */
export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinks = [
    { id: 'how-it-works', label: 'How it works' },
    { id: 'features', label: 'Features' },
    { id: 'careers', label: 'Careers' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <header className="fixed top-4 left-0 right-0 z-40 px-4 pointer-events-none">
      <div className="max-w-5xl mx-auto">
        <nav
          aria-label="Main Navigation"
          className="pointer-events-auto bg-surface border-2 border-ink rounded-full shadow-nav px-4 md:px-6 py-2.5 flex items-center justify-between transition-all duration-120"
        >
          {/* Logo Disc */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-[3px] rounded-full"
            aria-label="SkillGraph Home"
          >
            <div className="w-9 h-9 rounded-full bg-brand text-white border-2 border-ink flex items-center justify-center font-display text-sm tracking-wider shadow-sm select-none group-hover:-translate-y-0.5 transition-transform">
              SG
            </div>
            <span className="font-display uppercase text-base tracking-tight text-ink hidden sm:inline">
              SKILL<span className="text-brand">GRAPH</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6 font-sans font-bold text-xs uppercase tracking-[0.04em] text-ink">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="hover:text-brand cursor-pointer transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Button
                variant="primary"
                size="sm"
                icon={<LayoutDashboard size={14} />}
                onClick={() => navigate('/app/dashboard')}
                className="rounded-full px-4"
              >
                OPEN APP
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="font-sans font-bold text-xs uppercase tracking-wider text-ink hover:text-brand transition-colors mr-1 underline focus:outline-none focus-visible:outline-2 focus-visible:outline-brand"
                >
                  Log in
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  onClick={() => navigate('/register')}
                  className="rounded-full px-4"
                >
                  GET STARTED
                </Button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="md:hidden p-1.5 text-ink border-2 border-ink rounded-full bg-paper hover:bg-surface cursor-pointer focus:outline-none focus-visible:outline-3 focus-visible:outline-brand"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="pointer-events-auto md:hidden mt-2 bg-surface border-2 border-ink rounded-2xl shadow-lg p-5 animate-in slide-in-from-top-2 duration-120">
            <div className="flex flex-col gap-3 font-sans font-bold text-sm uppercase tracking-wider text-ink border-b-2 border-line pb-4 mb-4">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => scrollToSection(link.id)}
                  className="text-left py-1 hover:text-brand cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              {user ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/app/dashboard');
                  }}
                  className="w-full"
                >
                  OPEN APP
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/register');
                    }}
                    className="w-full"
                  >
                    GET STARTED
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login');
                    }}
                    className="w-full"
                  >
                    LOG IN
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
