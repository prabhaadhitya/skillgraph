import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { Tag } from '../ui/Tag.jsx';

/**
 * 403 Forbidden Page.
 * Displayed when a non-admin attempts to access admin-only routes.
 */
export function ForbiddenPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'SkillGraph — Access Forbidden';
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-md w-full text-center">
        <div className="mb-4 flex justify-center">
          <Tag tone="danger">403 FORBIDDEN</Tag>
        </div>

        <Card className="p-6 md:p-8 border-2 border-ink bg-surface shadow-lg text-center space-y-5">
          <div className="w-16 h-16 mx-auto border-2 border-ink bg-state-missing/20 text-state-missing flex items-center justify-center shadow-sm">
            <ShieldAlert size={32} />
          </div>

          <div>
            <h1 className="font-display uppercase text-2xl md:text-3xl text-ink tracking-tight">
              THIS AREA IS FOR ADMINS
            </h1>
            <p className="text-sm text-muted font-sans mt-2">
              You do not have administrative privileges to manage skills, relationships, or view system analytics.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/app/dashboard')}
              icon={<ArrowLeft size={16} />}
            >
              BACK TO DASHBOARD
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ForbiddenPage;
