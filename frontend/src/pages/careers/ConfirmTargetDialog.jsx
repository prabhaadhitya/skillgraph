import { AlertCircle } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';

/**
 * ConfirmTargetDialog - confirmation modal before updating target career.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Object} [props.career] - Career object { slug, name }
 * @param {() => void} props.onConfirm - Confirm handler
 * @param {boolean} [props.isPending] - Whether mutation is in flight
 */
export function ConfirmTargetDialog({
  isOpen,
  onClose,
  career,
  onConfirm,
  isPending = false,
}) {
  if (!isOpen || !career) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SET TARGET CAREER"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4 py-3">
        <div className="p-3 bg-surface border-2 border-ink shadow-2xs flex items-start gap-3">
          <AlertCircle size={22} className="text-brand shrink-0 mt-0.5" />
          <div className="text-xs font-sans text-ink leading-relaxed">
            Switching your target career to{' '}
            <strong className="font-bold uppercase font-mono">{career.name}</strong> will
            re-orient your skill graph, recalibrate your estimated alignment score, and update your
            prerequisite learning roadmap.
          </div>
        </div>

        <p className="font-mono text-xs text-muted">
          Your existing verified skill proficiencies will remain completely intact.
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-line">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            CANCEL
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'UPDATING...' : 'CONFIRM & SET TARGET'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmTargetDialog;
