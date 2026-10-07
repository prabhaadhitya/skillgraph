import { useNavigate } from 'react-router';
import { useInsights } from '../hooks/useInsights.js';
import Card from '../components/ui/Card.jsx';
import Tag from '../components/ui/Tag.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import {
  CategoryBarChart,
  AlignmentLineChart,
  TopMissingBarChart,
} from '../components/charts/index.js';

/**
 * Analytics page (/app/analytics) displaying student skill insights and career alignment progress.
 */
export function Analytics() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useInsights();

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 font-sans max-w-7xl mx-auto flex flex-col gap-6">
        <header className="bg-surface border-2 border-ink shadow-sm p-4 flex items-center justify-between">
          <Skeleton variant="text" className="w-48 h-7" />
          <Skeleton variant="text" className="w-24 h-5" />
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton variant="card" className="h-[380px]" />
          <Skeleton variant="card" className="h-[380px]" />
          <Skeleton variant="card" className="h-[380px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 md:p-8 font-sans max-w-4xl mx-auto">
        <ErrorState
          title="FAILED TO LOAD ANALYTICS"
          message={error?.message || 'Unable to load your analytics and career insights.'}
          onRetry={refetch}
          retryLabel="TRY AGAIN"
        />
      </div>
    );
  }

  const categoryDistribution = data?.categoryDistribution || [];
  const alignmentHistory = data?.alignmentHistory || [];
  const topMissing = data?.topMissing || [];

  // Empty state check when student has no recorded skills
  const totalSkillsCount = categoryDistribution.reduce((acc, cat) => acc + (cat.skills || 0), 0);
  if (categoryDistribution.length === 0 || totalSkillsCount === 0) {
    return (
      <div className="p-4 md:p-8 font-sans max-w-4xl mx-auto">
        <EmptyState
          title="NO SKILLS RECORDED"
          text="Add your skills to see your category breakdown, alignment history, and gap analysis."
          actionLabel="EXPLORE SKILL GRAPH"
          onAction={() => navigate('/app/graph')}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 font-sans max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <header className="bg-surface border-2 border-ink shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Tag tone="brand">ANALYTICS</Tag>
          <h1 className="font-display uppercase text-xl sm:text-2xl text-ink tracking-tight">
            CAREER INSIGHTS
          </h1>
        </div>
        <p className="font-mono text-xs text-muted">
          Ground-truth metrics from your skill graph profile
        </p>
      </header>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Skills by Category */}
        <Card tone="default" className="flex flex-col gap-4">
          <div>
            <h2 className="font-display uppercase text-base sm:text-lg text-ink tracking-tight">
              SKILLS BY CATEGORY
            </h2>
            <p className="font-sans text-xs text-muted mt-1">
              Distribution of your verified skills and average proficiency level across knowledge domains.
            </p>
          </div>
          <CategoryBarChart data={categoryDistribution} />
        </Card>

        {/* Card 2: Alignment History */}
        <Card tone="default" className="flex flex-col gap-4">
          <div>
            <h2 className="font-display uppercase text-base sm:text-lg text-ink tracking-tight">
              ALIGNMENT HISTORY
            </h2>
            <p className="font-sans text-xs text-muted mt-1">
              Track how your estimated career alignment has progressed over recent check-ins.
            </p>
          </div>
          <AlignmentLineChart data={alignmentHistory} />
          <p className="font-mono text-[11px] text-muted border-t border-line pt-2 mt-auto">
            * Estimated career alignment is an estimate, not a prediction.
          </p>
        </Card>

        {/* Card 3: Top Missing Skills */}
        <Card tone="default" className="flex flex-col gap-4 lg:col-span-2">
          <div>
            <h2 className="font-display uppercase text-base sm:text-lg text-ink tracking-tight">
              TOP MISSING SKILLS
            </h2>
            <p className="font-sans text-xs text-muted mt-1">
              Highest-impact skills with the largest gap for your target career.
            </p>
          </div>
          <TopMissingBarChart data={topMissing} />
        </Card>
      </div>
    </div>
  );
}

export default Analytics;
