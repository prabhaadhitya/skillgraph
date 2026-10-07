import { Link } from 'react-router';
import { Tag, Highlight, Button } from '../components/ui';

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl mx-auto space-y-6">
        <Tag tone="brand">MINI PROJECT 2026</Tag>
        <h1 className="font-display uppercase text-5xl md:text-6xl tracking-tight">
          SKILL<Highlight>GRAPH</Highlight>
        </h1>
        <p className="font-sans text-muted text-lg max-w-md mx-auto">
          Prerequisite-aware skill graph, gap analysis, and grounded learning path assistant.
        </p>

        {import.meta.env.DEV && (
          <div className="pt-4">
            <Link to="/_kit">
              <Button variant="primary" size="lg">
                EXPLORE UI KIT (/_KIT)
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
