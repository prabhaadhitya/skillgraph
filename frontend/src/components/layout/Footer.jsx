import { Link } from 'react-router';

/**
 * Neo-brutalist dark footer with link columns and brand shadow.
 */
export function Footer() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-ink text-paper border-t-4 border-brand pt-14 pb-10 px-4 md:px-8 relative font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-muted/40">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand text-white border-2 border-paper flex items-center justify-center font-display text-sm tracking-wider shadow-sm select-none">
                SG
              </div>
              <span className="font-display uppercase text-2xl tracking-tight text-white">
                SKILL<span className="text-brand-soft">GRAPH</span>
              </span>
            </div>
            <p className="text-sm text-paper/70 max-w-sm font-sans leading-relaxed">
              Prerequisite-aware skill graph, gap analysis, and grounded learning path assistant for students.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-wider text-pop font-bold">
              PRODUCT
            </h4>
            <ul className="space-y-2 text-sm text-paper/80 font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('how-it-works')}
                  className="hover:text-brand-soft cursor-pointer transition-colors"
                >
                  How it works
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('features')}
                  className="hover:text-brand-soft cursor-pointer transition-colors"
                >
                  Features & Graph
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('careers')}
                  className="hover:text-brand-soft cursor-pointer transition-colors"
                >
                  Career Explorer
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('faq')}
                  className="hover:text-brand-soft cursor-pointer transition-colors"
                >
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Project Links */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-wider text-pop font-bold">
              PROJECT
            </h4>
            <ul className="space-y-2 text-sm text-paper/80 font-medium">
              <li>
                <Link to="/_kit" className="hover:text-brand-soft transition-colors">
                  Design System Kit
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-brand-soft transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-brand-soft transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <span className="text-paper/50">Mini Project 2026</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-paper/60 text-center sm:text-left">
          <p>Built by Team SkillGraph - Mini Project 2026</p>
          <p className="text-paper/50">
            Source of Truth: Skill Graph & Rule Engine · ML Personalizes · LLM Explains
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
