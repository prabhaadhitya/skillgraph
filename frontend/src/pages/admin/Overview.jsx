import Card from '../../components/ui/Card.jsx';
import Tag from '../../components/ui/Tag.jsx';
import Badge from '../../components/ui/Badge.jsx';
import StatBox from '../../components/ui/StatBox.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';

import { useAdminOverview } from '../../hooks/useAdminOverview.js';

/**
 * Admin Overview page (/admin/overview).
 * Displays aggregate student statistics, skill gaps, career and semester distributions,
 * and machine learning model metrics.
 */
export function Overview() {
  const {
    overview,
    skillGaps,
    careerDistribution,
    skillPopularity,
    semesterDistribution,
    modelInfo,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminOverview();

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
        <header className="bg-surface border-2 border-ink shadow-sm p-4 flex items-center justify-between">
          <Skeleton variant="text" className="w-56 h-8" />
          <Skeleton variant="text" className="w-32 h-6" />
        </header>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton variant="card" className="h-72" />
          <Skeleton variant="card" className="h-72" />
          <Skeleton variant="card" className="h-72" />
          <Skeleton variant="card" className="h-72" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ErrorState
          title="FAILED TO LOAD OVERVIEW"
          message={error?.message || 'Unable to load admin aggregate analytics.'}
          onRetry={refetch}
          retryLabel="RETRY"
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <header className="bg-surface border-2 border-ink shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tag tone="brand">ADMIN ANALYTICS</Tag>
            <span className="font-mono text-xs text-muted">AGGREGATES ONLY</span>
          </div>
          <h1 className="font-display font-black text-2xl text-ink uppercase tracking-tight">
            PLATFORM OVERVIEW
          </h1>
        </div>
        <p className="font-mono text-xs text-muted max-w-md text-right hidden sm:block">
          Anonymized institutional performance data and model health metrics
        </p>
      </header>

      {/* Top StatBoxes */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatBox
          value={overview?.totalStudents ?? 0}
          label="TOTAL STUDENTS"
        />
        <StatBox
          value={overview?.onboardedStudents ?? 0}
          label="ONBOARDED"
        />
        <StatBox
          value={`${overview?.avgFitScore ?? 0}%`}
          label="AVG ALIGNMENT"
        />
        <StatBox
          value={overview?.totalSkills ?? 0}
          label="SKILLS IN GRAPH"
        />
        <StatBox
          value={overview?.totalCareers ?? 0}
          label="CAREER TRACKS"
        />
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Top Skill Gaps (%) */}
        <Card tone="default" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-line pb-2">
            <div>
              <h2 className="font-display font-black text-lg text-ink uppercase tracking-tight">
                TOP SKILL GAPS
              </h2>
              <p className="font-sans text-xs text-muted">
                Skills with the highest percentage of deficits among enrolled students
              </p>
            </div>
            <Badge tone="brand">GAP RATE</Badge>
          </div>

          {skillGaps.length === 0 ? (
            <EmptyState
              title="NO GAPS DETECTED"
              text="No open skill gaps among enrolled students."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {skillGaps.slice(0, 5).map((item, idx) => (
                <div
                  key={item.skill?.slug || idx}
                  className="p-3 bg-surface border-2 border-ink shadow-2xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-xs uppercase text-ink">
                      {item.skill?.name}
                    </span>
                    <span className="font-mono text-xs font-bold text-brand">
                      {item.percentWithGap}% WITH GAP
                    </span>
                  </div>
                  <ProgressBar
                    value={item.percentWithGap}
                    max={100}
                    tone="brand"
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted mt-0.5">
                    <span>Avg deficit: {item.avgGap} levels</span>
                    <span>Students evaluated: {item.studentsConsidered}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card 2: Career Track Distribution */}
        <Card tone="default" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-line pb-2">
            <div>
              <h2 className="font-display font-black text-lg text-ink uppercase tracking-tight">
                CAREER DISTRIBUTION
              </h2>
              <p className="font-sans text-xs text-muted">
                Student enrollment across active curriculum tracks
              </p>
            </div>
            <Badge tone="neutral">ENROLLMENT</Badge>
          </div>

          {careerDistribution.length === 0 ? (
            <EmptyState
              title="NO ENROLLMENTS"
              text="No students have selected a career goal yet."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {careerDistribution.map((item, idx) => (
                <div
                  key={item.career?.slug || idx}
                  className="p-3 bg-surface border-2 border-ink shadow-2xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-xs uppercase text-ink">
                      {item.career?.name}
                    </span>
                    <span className="font-mono text-xs font-bold text-ink">
                      {item.students} students ({item.percent}%)
                    </span>
                  </div>
                  <ProgressBar
                    value={item.percent}
                    max={100}
                    tone="brand"
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card 3: Skill Popularity */}
        <Card tone="default" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-line pb-2">
            <div>
              <h2 className="font-display font-black text-lg text-ink uppercase tracking-tight">
                SKILL POPULARITY
              </h2>
              <p className="font-sans text-xs text-muted">
                Most frequently acquired and verified skills across all cohorts
              </p>
            </div>
            <Badge tone="neutral">ACQUISITION</Badge>
          </div>

          {skillPopularity.length === 0 ? (
            <EmptyState
              title="NO DATA"
              text="No verified skill entries have been logged yet."
            />
          ) : (
            <div className="border-2 border-ink overflow-hidden bg-surface shadow-2xs">
              <table className="w-full text-left font-sans text-xs">
                <thead className="bg-paper border-b-2 border-ink font-mono uppercase text-muted">
                  <tr>
                    <th className="p-2.5">Skill</th>
                    <th className="p-2.5 text-center">Students</th>
                    <th className="p-2.5 text-right">Avg Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-line font-mono">
                  {skillPopularity.slice(0, 5).map((item, idx) => (
                    <tr key={item.skill?.slug || idx} className="hover:bg-paper">
                      <td className="p-2.5 font-bold uppercase text-ink">
                        {item.skill?.name}
                      </td>
                      <td className="p-2.5 text-center">{item.students}</td>
                      <td className="p-2.5 text-right font-bold text-brand">
                        {item.avgProficiency}/5
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Card 4: Semester Distribution Table */}
        <Card tone="default" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-line pb-2">
            <div>
              <h2 className="font-display font-black text-lg text-ink uppercase tracking-tight">
                SEMESTER PROGRESSION
              </h2>
              <p className="font-sans text-xs text-muted">
                Academic cohort breakdown by alignment and verified breadth
              </p>
            </div>
            <Badge tone="neutral">COHORTS</Badge>
          </div>

          {semesterDistribution.length === 0 ? (
            <EmptyState
              title="NO COHORTS RECORDED"
              text="Student semester metadata has not been registered."
            />
          ) : (
            <div className="border-2 border-ink overflow-hidden bg-surface shadow-2xs">
              <table className="w-full text-left font-sans text-xs">
                <thead className="bg-paper border-b-2 border-line font-mono uppercase text-muted">
                  <tr>
                    <th className="p-2.5">Semester</th>
                    <th className="p-2.5 text-center">Students</th>
                    <th className="p-2.5 text-center">Avg Alignment</th>
                    <th className="p-2.5 text-right">Skills/Student</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-line font-mono">
                  {semesterDistribution.map((item, idx) => (
                    <tr key={item.semester || idx} className="hover:bg-paper">
                      <td className="p-2.5 font-bold text-ink">
                        Semester {item.semester}
                      </td>
                      <td className="p-2.5 text-center">{item.students}</td>
                      <td className="p-2.5 text-center font-bold text-brand">
                        {item.avgFitScore}%
                      </td>
                      <td className="p-2.5 text-right font-bold">
                        {item.avgSkillsPerStudent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Card 5: ML Model Panel */}
        <Card tone="default" className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b-2 border-line pb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Tag tone="brand">RECOMMENDER ENGINE</Tag>
                <span className="font-mono text-xs text-muted">MODEL HEALTH & METRICS</span>
              </div>
              <h2 className="font-display font-black text-xl text-ink uppercase tracking-tight">
                MODEL STATUS & BENCHMARKS
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs border-2 border-ink bg-paper px-2 py-0.5 shadow-2xs font-bold uppercase">
                trained on synthetic data
              </span>
            </div>
          </div>

          {!modelInfo || !modelInfo.available ? (
            <EmptyState
              title="MODEL SERVICE UNAVAILABLE"
              text="The internal ML microservice is offline or no model is loaded. Recommender is safely defaulting to rule-based engine."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Architecture Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 bg-surface border-2 border-ink shadow-2xs">
                  <div className="text-muted uppercase">Algorithm</div>
                  <div className="font-bold text-ink text-sm mt-0.5">
                    {modelInfo.algorithm || 'RandomForestClassifier'}
                  </div>
                </div>
                <div className="p-3 bg-surface border-2 border-ink shadow-2xs">
                  <div className="text-muted uppercase">Version</div>
                  <div className="font-bold text-ink text-sm mt-0.5">
                    {modelInfo.modelVersion || 'v1.0.0'}
                  </div>
                </div>
                <div className="p-3 bg-surface border-2 border-ink shadow-2xs">
                  <div className="text-muted uppercase">Training Set</div>
                  <div className="font-bold text-ink text-sm mt-0.5">
                    {modelInfo.trainingProfiles ?? 5000} synthetic profiles
                  </div>
                </div>
              </div>

              {/* Benchmarks Comparison Table */}
              <div className="border-2 border-ink overflow-hidden bg-surface shadow-2xs">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-paper border-b-2 border-ink font-mono uppercase text-muted">
                    <tr>
                      <th className="p-2.5">Evaluation Metric</th>
                      <th className="p-2.5 text-center">Baseline (Rule Engine)</th>
                      <th className="p-2.5 text-center bg-brand-light font-bold text-ink">
                        ML Model (Trained)
                      </th>
                      <th className="p-2.5 text-right">Delta Improvement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-line font-mono text-xs">
                    {(() => {
                      const mlP = modelInfo.metrics?.ml?.precisionAt3 ?? modelInfo.ml?.precision_at_3 ?? 0.196;
                      const baseP = modelInfo.metrics?.baseline?.precisionAt3 ?? modelInfo.baseline?.precision_at_3 ?? 0.197;
                      const deltaP = (mlP - baseP) * 100;

                      const mlR = modelInfo.metrics?.ml?.recallAt3 ?? modelInfo.ml?.recall_at_3 ?? 0.587;
                      const baseR = modelInfo.metrics?.baseline?.recallAt3 ?? modelInfo.baseline?.recall_at_3 ?? 0.591;
                      const deltaR = (mlR - baseR) * 100;

                      const mlH = modelInfo.metrics?.ml?.hitRateAt3 ?? modelInfo.ml?.hit_rate_at_3 ?? 0.587;
                      const baseH = modelInfo.metrics?.baseline?.hitRateAt3 ?? modelInfo.baseline?.hit_rate_at_3 ?? 0.591;
                      const deltaH = (mlH - baseH) * 100;

                      const mlM = modelInfo.metrics?.ml?.mrr ?? modelInfo.ml?.mrr ?? 0.473;
                      const baseM = modelInfo.metrics?.baseline?.mrr ?? modelInfo.baseline?.mrr ?? 0.464;
                      const deltaM = mlM - baseM;

                      return (
                        <>
                          <tr>
                            <td className="p-2.5 font-bold">Precision@3</td>
                            <td className="p-2.5 text-center text-muted">
                              {(baseP * 100).toFixed(1)}%
                            </td>
                            <td className="p-2.5 text-center bg-brand-light font-bold text-brand">
                              {(mlP * 100).toFixed(1)}%
                            </td>
                            <td className="p-2.5 text-right font-bold text-brand">
                              {deltaP >= 0 ? `+${deltaP.toFixed(1)}%` : `${deltaP.toFixed(1)}%`}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">Recall@3</td>
                            <td className="p-2.5 text-center text-muted">
                              {(baseR * 100).toFixed(1)}%
                            </td>
                            <td className="p-2.5 text-center bg-brand-light font-bold text-brand">
                              {(mlR * 100).toFixed(1)}%
                            </td>
                            <td className="p-2.5 text-right font-bold text-brand">
                              {deltaR >= 0 ? `+${deltaR.toFixed(1)}%` : `${deltaR.toFixed(1)}%`}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">Hit Rate@3</td>
                            <td className="p-2.5 text-center text-muted">
                              {(baseH * 100).toFixed(1)}%
                            </td>
                            <td className="p-2.5 text-center bg-brand-light font-bold text-brand">
                              {(mlH * 100).toFixed(1)}%
                            </td>
                            <td className="p-2.5 text-right font-bold text-brand">
                              {deltaH >= 0 ? `+${deltaH.toFixed(1)}%` : `${deltaH.toFixed(1)}%`}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-bold">MRR (Mean Reciprocal Rank)</td>
                            <td className="p-2.5 text-center text-muted">
                              {baseM.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center bg-brand-light font-bold text-brand">
                              {mlM.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-brand">
                              {deltaM >= 0 ? `+${deltaM.toFixed(2)}` : `${deltaM.toFixed(2)}`}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Overview;
