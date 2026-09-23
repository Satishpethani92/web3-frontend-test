import { useEffect, useId, useRef, useState } from 'react';
import {
  FaWallet,
  FaCopy,
  FaCheck,
  FaExternalLinkAlt,
  FaEthereum,
} from 'react-icons/fa';
import { FiLogOut, FiX } from 'react-icons/fi';
import { useWallet } from '../../context/WalletContext';
import { truncateAddress } from '../../utils/wallet';

/**
 * Reusable MetaMask connect control.
 * Variants: "default" | "full"
 *
 * Status toasts (connect / account switch / network) are handled globally
 * by WalletStatusToast to avoid duplicate notices.
 */
function ConnectWalletButton({
  className = '',
  label = 'Connect Wallet',
  connectedLabel,
  variant = 'default',
  showError = true,
  onConnected,
}) {
  const {
    account,
    chainName,
    isConnected,
    isConnecting,
    isMetaMaskInstalled,
    error,
    metamaskDownloadUrl,
    connect,
    disconnect,
    clearError,
  } = useWallet();

  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addressFlash, setAddressFlash] = useState(false);
  const menuId = useId();
  const buttonRef = useRef(null);
  const prevAccountRef = useRef(account);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!isConnected) setMenuOpen(false);
  }, [isConnected]);

  // Highlight truncated address when MetaMask account changes
  useEffect(() => {
    const previous = prevAccountRef.current;
    prevAccountRef.current = account;

    if (!account || !previous || previous.toLowerCase() === account.toLowerCase()) {
      return undefined;
    }

    setAddressFlash(true);
    const timer = setTimeout(() => setAddressFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [account]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const handleConnect = async () => {
    clearError();
    const nextAccount = await connect();
    if (nextAccount && onConnected) onConnected(nextAccount);
  };

  const handleCopy = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
    } catch {
      // Clipboard may be blocked in some browsers
    }
  };

  const widthClass = variant === 'full' ? 'w-full justify-center' : '';
  const isFull = variant === 'full';

  if (isConnected && account) {
    const display = connectedLabel || truncateAddress(account);

    return (
      <div
        className={`relative inline-flex flex-col items-stretch ${isFull ? 'w-full' : ''}`}
      >
        <button
          ref={buttonRef}
          type="button"
          className={`btn ${widthClass} ${className} transition-shadow duration-300 ${
            addressFlash ? 'ring-2 ring-emerald-300 ring-offset-2' : ''
          }`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          title={account}
        >
          <span
            className="inline-flex h-2 w-2 rounded-full bg-emerald-300 mr-2 shrink-0 animate-pulse"
            aria-hidden="true"
          />
          <FaWallet className="mr-2 shrink-0" aria-hidden="true" />
          <span
            className={`font-mono tracking-tight transition-colors duration-300 ${
              addressFlash ? 'text-emerald-100' : ''
            }`}
          >
            {display}
          </span>
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              aria-label="Close wallet menu"
              onClick={() => setMenuOpen(false)}
            />
            <div
              id={menuId}
              role="menu"
              className={`absolute z-50 mt-2 min-w-[240px] rounded-xl border border-platinum-200/80 bg-white/95 p-2 shadow-luxe backdrop-blur-md ${
                isFull ? 'left-0 right-0' : 'right-0'
              }`}
            >
              <div className="px-3 pt-2 pb-1">
                <p className="text-xs text-secondary-500">Connected with MetaMask</p>
                {chainName && (
                  <p className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-sapphire-50 px-2 py-1 text-xs font-medium text-sapphire-700">
                    <FaEthereum aria-hidden="true" />
                    {chainName}
                  </p>
                )}
              </div>
              <p className="px-3 pb-2 font-mono text-sm text-sapphire-800 break-all">
                {truncateAddress(account, 10, 8)}
              </p>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sapphire-700 hover:bg-sapphire-50 transition-colors"
                onClick={handleCopy}
              >
                {copied ? (
                  <FaCheck className="text-emerald-500" aria-hidden="true" />
                ) : (
                  <FaCopy aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy address'}
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => {
                  disconnect();
                  setMenuOpen(false);
                }}
              >
                <FiLogOut aria-hidden="true" />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex flex-col ${isFull ? 'w-full' : 'items-start'}`}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`btn ${widthClass} ${className} disabled:opacity-60 disabled:cursor-not-allowed`}
        onClick={handleConnect}
        disabled={isConnecting}
        aria-busy={isConnecting}
      >
        <FaWallet className="mr-2 shrink-0" aria-hidden="true" />
        {isConnecting ? 'Connecting…' : label}
      </button>

      {showError && error && (
        <div
          role="alert"
          className={`mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700 shadow-luxe ${
            isFull
              ? 'w-full'
              : 'absolute right-0 top-full z-50 w-72 max-w-[calc(100vw-2rem)]'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p>{error}</p>
            <button
              type="button"
              className="shrink-0 text-red-400 hover:text-red-600"
              aria-label="Dismiss error"
              onClick={clearError}
            >
              <FiX size={14} />
            </button>
          </div>
          {!isMetaMaskInstalled && (
            <a
              href={metamaskDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700 underline"
            >
              Install MetaMask
              <FaExternalLinkAlt className="text-[10px]" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default ConnectWalletButton;
