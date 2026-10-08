import { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { ApiKeyModal } from '../../components/settings/ApiKeyModal.jsx';
import { KeyStatusCard } from './KeyStatusCard.jsx';
import { useLlmSettings } from '../../hooks/useLlmSettings.js';
import { getMe } from '../../services/userService.js';

/**
 * SettingsPage allows students to manage their personal OpenRouter key,
 * select/change AI models, and review profile info.
 * Follows UX flow F7 & Design System §10.
 */
export function SettingsPage() {
  const {
    settings,
    isLoading: loadingSettings,
    error: settingsError,
    refetch,
    testing,
    testResult,
    testKey,
    removing,
    removeKey,
    savingModel,
    changeModel,
    getSuggestedModels,
  } = useLlmSettings();

  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  useEffect(() => {
    document.title = 'SkillGraph — Settings';
  }, []);

  useEffect(() => {
    let active = true;
    getMe()
      .then((res) => {
        if (active) {
          setUserProfile(res?.user || res);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleModalSuccess = () => {
    refetch().catch(() => {});
  };

  const isLoading = loadingSettings || loadingProfile;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8 text-left">
      <div>
        <h1 className="font-display text-2xl md:text-3xl text-ink uppercase tracking-wide">
          SETTINGS
        </h1>
        <p className="text-sm font-sans text-muted mt-1">
          Manage your assistant API key, active AI model, and account preferences.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : settingsError ? (
        <ErrorState
          title="FAILED TO LOAD SETTINGS"
          message={settingsError}
          onRetry={refetch}
          retryLabel="RETRY"
        />
      ) : (
        <div className="space-y-6">
          {/* Card: ASSISTANT KEY & MODEL */}
          <KeyStatusCard
            settings={settings}
            onOpenKeyModal={() => setIsKeyModalOpen(true)}
            onTestKey={testKey}
            testing={testing}
            testResult={testResult}
            onRemoveKey={removeKey}
            removing={removing}
            onChangeModel={changeModel}
            savingModel={savingModel}
            getSuggestedModels={getSuggestedModels}
          />

          {/* Card: Student Profile Summary */}
          {userProfile && (
            <Card className="p-6 border-2 border-ink shadow-md bg-surface text-left">
              <div className="flex items-center gap-3 border-b-2 border-line pb-4 mb-4">
                <div className="p-2.5 bg-paper border-2 border-ink text-ink">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-base text-ink uppercase tracking-wide">
                    STUDENT PROFILE
                  </h2>
                  <p className="text-xs text-muted">
                    Your academic records and target career alignment.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-sans">
                <div>
                  <span className="text-muted font-bold uppercase block mb-1">NAME</span>
                  <p className="font-bold text-ink text-sm">{userProfile.name}</p>
                </div>
                <div>
                  <span className="text-muted font-bold uppercase block mb-1">EMAIL</span>
                  <p className="font-mono text-ink text-sm">{userProfile.email}</p>
                </div>
                <div>
                  <span className="text-muted font-bold uppercase block mb-1">TARGET CAREER</span>
                  <p className="font-bold text-brand text-sm">
                    {userProfile.targetCareer?.name || 'Not set'}
                  </p>
                </div>
                {userProfile.college && (
                  <div>
                    <span className="text-muted font-bold uppercase block mb-1">COLLEGE</span>
                    <p className="font-bold text-ink text-sm">{userProfile.college}</p>
                  </div>
                )}
                {userProfile.degree && (
                  <div>
                    <span className="text-muted font-bold uppercase block mb-1">PROGRAM</span>
                    <p className="font-bold text-ink text-sm">
                      {userProfile.degree} {userProfile.branch ? `in ${userProfile.branch}` : ''}
                    </p>
                  </div>
                )}
                {userProfile.semester && (
                  <div>
                    <span className="text-muted font-bold uppercase block mb-1">SEMESTER</span>
                    <p className="font-bold text-ink text-sm">Semester {userProfile.semester}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* M5's API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        currentSettings={settings}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

export default SettingsPage;
