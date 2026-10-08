import { useQuery } from '@tanstack/react-query';
import {
  getOverview,
  getSkillGaps,
  getCareerDistribution,
  getSkillPopularity,
  getSemesterDistribution,
  getModelInfo,
} from '../services/adminAnalyticsService.js';

export function useAdminOverview() {
  const overviewQuery = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: getOverview,
    staleTime: 60 * 1000,
  });

  const skillGapsQuery = useQuery({
    queryKey: ['admin', 'skill-gaps'],
    queryFn: () => getSkillGaps(10),
    staleTime: 60 * 1000,
  });

  const careerDistQuery = useQuery({
    queryKey: ['admin', 'career-distribution'],
    queryFn: getCareerDistribution,
    staleTime: 60 * 1000,
  });

  const popularityQuery = useQuery({
    queryKey: ['admin', 'skill-popularity'],
    queryFn: () => getSkillPopularity(10),
    staleTime: 60 * 1000,
  });

  const semesterDistQuery = useQuery({
    queryKey: ['admin', 'semester-distribution'],
    queryFn: getSemesterDistribution,
    staleTime: 60 * 1000,
  });

  const modelInfoQuery = useQuery({
    queryKey: ['admin', 'model-info'],
    queryFn: getModelInfo,
    staleTime: 60 * 1000,
    retry: false,
  });

  const isLoading =
    overviewQuery.isLoading ||
    skillGapsQuery.isLoading ||
    careerDistQuery.isLoading ||
    popularityQuery.isLoading ||
    semesterDistQuery.isLoading;

  const isError =
    overviewQuery.isError ||
    skillGapsQuery.isError ||
    careerDistQuery.isError ||
    popularityQuery.isError ||
    semesterDistQuery.isError;

  const refetchAll = () => {
    overviewQuery.refetch();
    skillGapsQuery.refetch();
    careerDistQuery.refetch();
    popularityQuery.refetch();
    semesterDistQuery.refetch();
    modelInfoQuery.refetch();
  };

  return {
    overview: overviewQuery.data,
    skillGaps: skillGapsQuery.data?.items || [],
    careerDistribution: careerDistQuery.data?.items || [],
    skillPopularity: popularityQuery.data?.items || [],
    semesterDistribution: semesterDistQuery.data?.items || [],
    modelInfo: modelInfoQuery.data,
    isLoading,
    isError,
    error: overviewQuery.error || skillGapsQuery.error,
    refetch: refetchAll,
  };
}

export default useAdminOverview;
