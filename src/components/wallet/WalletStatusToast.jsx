import { FiX, FiCheckCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { useWallet } from '../../context/WalletContext';

const TONE_STYLES = {
  success: {
    box: 'border-emerald-200 bg-white text-emerald-800',
    icon: FiCheckCircle,
    iconClass: 'text-emerald-500',
  },
  warning: {
    box: 'border-amber-200 bg-white text-amber-800',
    icon: FiAlertTriangle,
    iconClass: 'text-amber-500',
  },
  info: {
    box: 'border-primary-200 bg-white text-primary-800',
    icon: FiInfo,
    iconClass: 'text-primary-500',
  },
  error: {
    box: 'border-red-200 bg-white text-red-700',
    icon: FiAlertTriangle,
    iconClass: 'text-red-500',
  },
};

/**
 * Single global toast for wallet connect / account / network updates.
 * Keeps feedback out of every ConnectWalletButton instance.
 */
function WalletStatusToast() {
  const { statusNotice, clearStatusNotice } = useWallet();

  if (!statusNotice) return null;

  const tone = TONE_STYLES[statusNotice.tone] || TONE_STYLES.info;
  const Icon = tone.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-luxe backdrop-blur-md ${tone.box}`}
      >
        <Icon className={`mt-0.5 shrink-0 ${tone.iconClass}`} size={18} aria-hidden="true" />
        <p className="text-sm font-medium">{statusNotice.message}</p>
        <button
          type="button"
          className="ml-2 shrink-0 opacity-60 hover:opacity-100"
          aria-label="Dismiss notification"
          onClick={clearStatusNotice}
        >
          <FiX size={16} />
        </button>
      </div>
    </div>
  );
}

export default WalletStatusToast;
