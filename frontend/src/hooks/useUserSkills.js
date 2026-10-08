import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserSkills, patchSkill } from '../services/userService.js';
import { invalidateAnalysis } from '../utils/invalidateAnalysis.js';
import { useToast } from '../components/ui/Toast.jsx';
import { LEVEL_NAMES } from '../components/ui/LevelPicker.jsx';

export const USER_SKILLS_QUERY_KEY = ['userSkills'];

/**
 * Hook to manage student skills with optimistic updates and analysis cache invalidation.
 *
 * @returns {object} Query result plus updateSkill mutate function
 */
export function useUserSkills() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const skillsQuery = useQuery({
    queryKey: USER_SKILLS_QUERY_KEY,
    queryFn: getUserSkills,
    staleTime: 60 * 1000,
  });

  const updateSkillMutation = useMutation({
    mutationFn: async ({ skillSlug, proficiency }) => {
      return patchSkill(skillSlug, proficiency);
    },
    onMutate: async ({ skillSlug, proficiency }) => {
      await queryClient.cancelQueries({ queryKey: USER_SKILLS_QUERY_KEY });

      const previousData = queryClient.getQueryData(USER_SKILLS_QUERY_KEY);

      queryClient.setQueryData(USER_SKILLS_QUERY_KEY, (old) => {
        if (!old) return old;
        const items = old.items || [];
        const existingIdx = items.findIndex((it) => it.skill?.slug === skillSlug);
        let nextItems;

        if (proficiency === 0) {
          nextItems = items.filter((it) => it.skill?.slug !== skillSlug);
        } else if (existingIdx >= 0) {
          nextItems = items.map((it, idx) =>
            idx === existingIdx
              ? {
                  ...it,
                  proficiency,
                  levelLabel: LEVEL_NAMES[proficiency] || `Level ${proficiency}`,
                }
              : it,
          );
        } else {
          nextItems = [
            ...items,
            {
              skill: { slug: skillSlug, name: skillSlug },
              proficiency,
              levelLabel: LEVEL_NAMES[proficiency] || `Level ${proficiency}`,
            },
          ];
        }
        return { ...old, items: nextItems };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(USER_SKILLS_QUERY_KEY, context.previousData);
      }
      toast.error(err?.message || 'Failed to update skill proficiency');
    },
    onSuccess: (data, variables) => {
      invalidateAnalysis(queryClient);

      const levelLabel =
        LEVEL_NAMES[variables.proficiency] !== undefined
          ? LEVEL_NAMES[variables.proficiency]
          : `Level ${variables.proficiency}`;

      const name = variables.skillName || data?.skill?.name || variables.skillSlug;
      toast.success(`${name} updated to ${levelLabel}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_SKILLS_QUERY_KEY });
    },
  });

  return {
    ...skillsQuery,
    skills: skillsQuery.data?.items || [],
    updateSkill: updateSkillMutation.mutateAsync,
    isUpdating: updateSkillMutation.isPending,
    updateSkillMutation,
  };
}

export default useUserSkills;
