import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { Tag } from '../ui/Tag.jsx';

/**
 * 404 Not Found Page.
 * Displayed when user navigates to an unknown route.
 */
export function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'SkillGraph — Page Not Found';
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-md w-full text-center">
        <div className="mb-4 flex justify-center">
          <Tag tone="brand">404 ERROR</Tag>
        </div>

        <Card className="p-6 md:p-8 border-2 border-ink bg-surface shadow-lg text-center space-y-5">
          <div className="w-16 h-16 mx-auto border-2 border-ink bg-brand-soft text-brand flex items-center justify-center shadow-sm">
            <FileQuestion size={32} />
          </div>

          <div>
            <h1 className="font-display uppercase text-3xl md:text-4xl text-ink tracking-tight">
              PAGE NOT FOUND
            </h1>
            <p className="text-sm text-muted font-sans mt-2">
              The page or node you were looking for doesn&apos;t exist or has moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/app/dashboard')}
              icon={<Home size={16} />}
            >
              GO TO DASHBOARD
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/')}
              icon={<ArrowLeft size={16} />}
            >
              HOME
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default NotFoundPage;
