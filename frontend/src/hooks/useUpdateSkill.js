import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSkill } from '../services/analysisService.js';
import { invalidateAnalysis } from '../utils/invalidateAnalysis.js';
import { useToast } from '../components/ui/Toast.jsx';
import { LEVEL_NAMES } from '../components/ui/LevelPicker.jsx';

/**
 * Mutation hook to update a skill's proficiency level.
 * Automatically invalidates analysis queries and triggers feedback toasts.
 *
 * @returns {import('@tanstack/react-query').UseMutationResult<object, Error, { skillSlug: string, proficiency: number }>}
 */
export function useUpdateSkill() {
  const queryClient = useQueryClient();
  let toast = null;
  try {
    const toastContext = useToast();
    toast = toastContext?.toast;
  } catch {
    // Graceful fallback when rendered without ToastProvider in isolated test environments
  }

  return useMutation({
    mutationFn: ({ skillSlug, proficiency }) => updateSkill(skillSlug, proficiency),
    onSuccess: (data, variables) => {
      invalidateAnalysis(queryClient);

      const levelName =
        LEVEL_NAMES[variables.proficiency] !== undefined
          ? LEVEL_NAMES[variables.proficiency]
          : `Level ${variables.proficiency}`;

      const skillName = data?.skill?.name || variables.skillSlug;
      toast?.success(`${skillName} updated to ${levelName}`);
    },
    onError: (error) => {
      toast?.error(error?.message || 'Failed to update skill proficiency');
    },
  });
}

export default useUpdateSkill;
