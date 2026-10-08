import { Link } from 'react-router';
import { Briefcase, ArrowRight, Sparkles } from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard.js';
import { useAuth } from '../../hooks/useAuth.js';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { AlignmentCard } from './AlignmentCard.jsx';
import { SummaryStats } from './SummaryStats.jsx';
import { NextSkillsList } from './NextSkillsList.jsx';
import { GraphPreview } from './GraphPreview.jsx';

/**
 * Main Student Dashboard Page.
 * Displays career alignment score, gap summary, recommended next skills,
 * and graph topology preview.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rectangular" height={80} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton variant="card" height={260} />
          <Skeleton variant="card" height={260} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton variant="card" height={320} />
          <Skeleton variant="card" height={320} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 max-w-2xl mx-auto">
        <ErrorState
          title="Could Not Load Dashboard"
          message={error.message || 'Failed to fetch career alignment analysis.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const dashboardData = data || {};
  const studentName = dashboardData.user?.name || user?.name || 'Student';
  const targetCareerName = dashboardData.career?.name || user?.targetCareer?.name || 'Target Career';
  const summary = dashboardData.summary || { strong: 0, developing: 0, missing: 0, total: 0 };

  const isProfileEmpty = summary.strong === 0 && summary.developing === 0;

  return (
    <div className="space-y-6">
      {/* Empty Profile Banner (Step 8) */}
      {isProfileEmpty && (
        <div className="p-4 sm:p-5 bg-brand-soft border-2 border-ink shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm shrink-0 border-2 border-ink">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base uppercase text-ink font-bold">
                Add your skills to see your progress
              </h3>
              <p className="text-xs text-muted font-sans">
                You haven&apos;t rated any skills yet. Calibrate your profile to calculate your career alignment.
              </p>
            </div>
          </div>

          <Link
            to="/app/profile"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white border-2 border-ink shadow-sm hover:bg-brand-dark transition-all text-xs font-mono font-bold uppercase shrink-0"
          >
            <span>Update Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Row 1: Header Card */}
      <div className="p-6 bg-surface border-2 border-ink shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-muted font-bold block">
            STUDENT DASHBOARD
          </span>
          <h1 className="font-display text-2xl sm:text-3xl text-ink uppercase tracking-tight font-black">
            Welcome Back, {studentName}
          </h1>
        </div>

        {/* Target Career Badge & Switch Link */}
        <div className="flex items-center gap-3 bg-paper p-3 border-2 border-ink shadow-sm self-start md:self-auto">
          <div className="w-8 h-8 rounded-none bg-brand text-white flex items-center justify-center font-bold shrink-0 border border-ink">
            <Briefcase className="w-4 h-4" />
          </div>

          <div className="text-left">
            <span className="text-[10px] font-mono text-muted uppercase block">TARGET CAREER</span>
            <span className="text-xs sm:text-sm font-bold text-ink font-sans block">
              {targetCareerName}
            </span>
          </div>

          <Link
            to="/app/careers"
            className="ml-2 text-xs font-mono font-bold text-brand underline hover:text-brand-dark transition-colors"
          >
            Switch
          </Link>
        </div>
      </div>

      {/* Row 2: AlignmentCard + SummaryStats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlignmentCard fit={dashboardData.fit} />
        <SummaryStats summary={dashboardData.summary} />
      </div>

      {/* Row 3: NextSkillsList + GraphPreview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NextSkillsList
          nextSkills={dashboardData.nextSkills}
          strategy={dashboardData.strategy}
          fallbackReason={dashboardData.fallbackReason}
        />
        <GraphPreview careerName={targetCareerName} />
      </div>
    </div>
  );
}

export default DashboardPage;
