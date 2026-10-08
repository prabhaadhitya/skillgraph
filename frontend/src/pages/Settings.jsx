import { useState, useEffect } from 'react';
import { Key, ShieldCheck, Sparkles, User as UserIcon } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { ApiKeyModal } from '../components/settings/ApiKeyModal.jsx';
import { getLlmSettings } from '../services/llmSettingsService.js';
import { getMe } from '../services/userService.js';

/**
 * Settings Page with LLM configuration and profile summary.
 * Follows UX flow F7 & Design System §10.
 */
export function Settings() {
  const [llmSettings, setLlmSettings] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshData = () => {
    Promise.all([
      getLlmSettings().catch(() => null),
      getMe().catch(() => null),
    ]).then(([llmRes, userRes]) => {
      setLlmSettings(llmRes);
      setUserProfile(userRes?.user || userRes);
    });
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      getLlmSettings().catch(() => null),
      getMe().catch(() => null),
    ]).then(([llmRes, userRes]) => {
      if (active) {
        setLlmSettings(llmRes);
        setUserProfile(userRes?.user || userRes);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

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

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card: Assistant Key & Model */}
          <Card className="p-6 border-2 border-ink shadow-md bg-surface">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-line pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-soft border-2 border-ink text-brand">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-base text-ink uppercase tracking-wide">
                    ASSISTANT KEY & MODEL
                  </h3>
                  <p className="text-xs text-muted">
                    Configure your OpenRouter API key for private, unlimited AI guidance.
                  </p>
                </div>
              </div>

              <div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsModalOpen(true)}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  {llmSettings?.hasKey ? 'MANAGE KEY' : 'ADD KEY'}
                </Button>
              </div>
            </div>

            <div className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Key Status */}
                <div className="p-4 bg-paper border-2 border-ink">
                  <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    KEY STATUS
                  </span>
                  <div className="flex items-center gap-2">
                    {llmSettings?.hasKey ? (
                      <>
                        <Badge variant="mastered">YOUR KEY</Badge>
                        <span className="font-mono text-sm font-bold text-ink">
                          ••••{llmSettings.keyLast4 || ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <Badge variant="developing">SHARED DEMO KEY</Badge>
                        <span className="text-xs text-ink font-bold">
                          {llmSettings?.serverKeyRemainingToday ?? 30} messages left today
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Active Model */}
                <div className="p-4 bg-paper border-2 border-ink">
                  <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    ACTIVE MODEL
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ink truncate">
                      {llmSettings?.model || 'meta-llama/llama-3.3-70b-instruct:free (Default)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted pt-2">
                <ShieldCheck className="w-4 h-4 text-brand flex-shrink-0" />
                <span>
                  Keys are encrypted with AES-256-GCM at rest and never shared or logged.
                </span>
              </div>
            </div>
          </Card>

          {/* Profile Summary Card */}
          {userProfile && (
            <Card className="p-6 border-2 border-ink shadow-md bg-surface">
              <div className="flex items-center gap-3 border-b-2 border-line pb-4 mb-4">
                <div className="p-2.5 bg-paper border-2 border-ink text-ink">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-base text-ink uppercase tracking-wide">
                    STUDENT PROFILE
                  </h3>
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

      {/* Modal */}
      <ApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentSettings={llmSettings}
        onSuccess={refreshData}
      />
    </div>
  );
}

export default Settings;
