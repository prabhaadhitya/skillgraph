import { useAuth } from '../../hooks/useAuth.js';
import { User, Briefcase, Mail } from 'lucide-react';
import { ProfileForm } from './ProfileForm.jsx';
import { SkillsEditor } from './SkillsEditor.jsx';

/**
 * Student Profile Page.
 * Composes the personal/academic metadata form and the comprehensive skills editor.
 */
export function ProfilePage() {
  const { user } = useAuth();

  const displayName = user?.name || 'Student';
  const displayEmail = user?.email || '';
  const targetCareerName = user?.targetCareer?.name || 'Machine Learning Engineer';

  return (
    <div className="space-y-8">
      {/* Profile Hero Header Card */}
      <div className="p-6 md:p-8 bg-surface border-2 border-ink shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand text-white border-2 border-ink shadow-sm flex items-center justify-center font-display font-black text-2xl shrink-0">
            {displayName.slice(0, 2).toUpperCase()}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl text-ink uppercase tracking-tight font-black">
                {displayName}
              </h1>
              <span className="px-2 py-0.5 bg-brand-soft border border-ink text-xs font-mono font-bold uppercase text-ink">
                STUDENT
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-muted flex-wrap">
              {displayEmail && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {displayEmail}
                </span>
              )}
              {user?.college && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {user.college}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Target Career Badge */}
        <div className="p-3 bg-paper border-2 border-ink shadow-sm flex items-center gap-3 self-start md:self-auto">
          <div className="w-8 h-8 rounded-none bg-brand text-white flex items-center justify-center font-bold shrink-0 border border-ink">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-muted uppercase block font-bold">
              TARGET CAREER
            </span>
            <span className="text-xs sm:text-sm font-bold text-ink font-sans">
              {targetCareerName}
            </span>
          </div>
        </div>
      </div>

      {/* Main Sections: Academic Form & Skills Editor */}
      <div className="space-y-8">
        <ProfileForm />
        <SkillsEditor />
      </div>
    </div>
  );
}

export default ProfilePage;
