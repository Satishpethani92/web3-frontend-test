import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getChainName,
  getMetaMaskProvider,
  getWalletErrorMessage,
  isMetaMaskAvailable,
  METAMASK_DOWNLOAD_URL,
  normalizeAddress,
  WALLET_STATUS,
} from '../utils/wallet';

const WalletContext = createContext(null);

const STATUS_NOTICE_MS = 3200;

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState(WALLET_STATUS.IDLE);
  const [error, setError] = useState(null);
  const [statusNotice, setStatusNotice] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(() =>
    isMetaMaskAvailable()
  );

  const mountedRef = useRef(true);
  const accountRef = useRef(null);
  const noticeTimerRef = useRef(null);

  const clearError = useCallback(() => {
    setError(null);
    setStatus((prev) =>
      prev === WALLET_STATUS.ERROR
        ? accountRef.current
          ? WALLET_STATUS.CONNECTED
          : WALLET_STATUS.IDLE
        : prev
    );
  }, []);

  const clearStatusNotice = useCallback(() => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setStatusNotice(null);
  }, []);

  const showStatusNotice = useCallback(
    (message, tone = 'info') => {
      clearStatusNotice();
      setStatusNotice({ message, tone });
      noticeTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setStatusNotice(null);
        noticeTimerRef.current = null;
      }, STATUS_NOTICE_MS);
    },
    [clearStatusNotice]
  );

  const applyAccounts = useCallback(
    (accounts, { announceSwitch = false } = {}) => {
      const next = normalizeAddress(accounts?.[0]);
      const previous = accountRef.current;

      accountRef.current = next;
      setAccount(next);

      if (!next) {
        setChainId(null);
        setStatus(WALLET_STATUS.IDLE);
        if (announceSwitch && previous) {
          showStatusNotice('Wallet disconnected', 'warning');
        }
        return null;
      }

      setStatus(WALLET_STATUS.CONNECTED);

      if (announceSwitch && previous && previous.toLowerCase() !== next.toLowerCase()) {
        showStatusNotice('Account switched', 'success');
      }

      return next;
    },
    [showStatusNotice]
  );

  const refreshChainId = useCallback(async (provider) => {
    try {
      const nextChainId = await provider.request({ method: 'eth_chainId' });
      if (mountedRef.current) setChainId(nextChainId);
      return nextChainId;
    } catch (err) {
      if (mountedRef.current) {
        setError(getWalletErrorMessage(err));
        setStatus(WALLET_STATUS.ERROR);
      }
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    clearError();
    clearStatusNotice();

    const provider = getMetaMaskProvider();
    setIsMetaMaskInstalled(Boolean(provider));

    if (!provider) {
      const message =
        'MetaMask is not installed. Please install the MetaMask browser extension to continue.';
      setError(message);
      setStatus(WALLET_STATUS.ERROR);
      return null;
    }

    setStatus(WALLET_STATUS.CONNECTING);

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const nextAccount = applyAccounts(accounts);

      if (!nextAccount) {
        const message = 'No account returned from MetaMask. Please unlock MetaMask and try again.';
        if (mountedRef.current) {
          setError(message);
          setStatus(WALLET_STATUS.ERROR);
        }
        return null;
      }

      await refreshChainId(provider);
      if (mountedRef.current) {
        showStatusNotice('Wallet connected', 'success');
      }
      return nextAccount;
    } catch (err) {
      const message = getWalletErrorMessage(err);
      if (mountedRef.current) {
        setError(message);
        setStatus(WALLET_STATUS.ERROR);
      }
      return null;
    }
  }, [
    applyAccounts,
    clearError,
    clearStatusNotice,
    refreshChainId,
    showStatusNotice,
  ]);

  const disconnect = useCallback(() => {
    clearError();
    clearStatusNotice();
    accountRef.current = null;
    setAccount(null);
    setChainId(null);
    setStatus(WALLET_STATUS.IDLE);
    showStatusNotice('Disconnected from this app', 'info');
  }, [clearError, clearStatusNotice, showStatusNotice]);

  // Detect provider, restore session, subscribe to MetaMask events
  useEffect(() => {
    mountedRef.current = true;
    const provider = getMetaMaskProvider();
    setIsMetaMaskInstalled(Boolean(provider));

    if (!provider) {
      return () => {
        mountedRef.current = false;
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      };
    }

    const handleAccountsChanged = (accounts) => {
      if (!mountedRef.current) return;
      clearError();
      applyAccounts(accounts, { announceSwitch: true });
    };

    const handleChainChanged = (nextChainId) => {
      if (!mountedRef.current) return;
      setChainId(nextChainId);
      showStatusNotice(
        `Network changed to ${getChainName(nextChainId) || nextChainId}`,
        'info'
      );
    };

    const handleDisconnect = (providerError) => {
      if (!mountedRef.current) return;
      accountRef.current = null;
      setAccount(null);
      setChainId(null);
      setStatus(WALLET_STATUS.IDLE);
      setError(
        providerError
          ? getWalletErrorMessage(providerError)
          : 'Wallet disconnected. Please reconnect if needed.'
      );
    };

    const init = async () => {
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (!mountedRef.current) return;

        const nextAccount = applyAccounts(accounts);
        if (nextAccount) {
          await refreshChainId(provider);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(getWalletErrorMessage(err));
          setStatus(WALLET_STATUS.ERROR);
        }
      }
    };

    init();

    if (typeof provider.on === 'function') {
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);
      provider.on('disconnect', handleDisconnect);
    }

    return () => {
      mountedRef.current = false;
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (typeof provider.removeListener === 'function') {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
        provider.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [applyAccounts, clearError, refreshChainId, showStatusNotice]);

  const value = useMemo(
    () => ({
      account,
      chainId,
      chainName: getChainName(chainId),
      status,
      isConnected: Boolean(account),
      isConnecting: status === WALLET_STATUS.CONNECTING,
      isMetaMaskInstalled,
      error,
      statusNotice,
      metamaskDownloadUrl: METAMASK_DOWNLOAD_URL,
      connect,
      disconnect,
      clearError,
      clearStatusNotice,
    }),
    [
      account,
      chainId,
      status,
      isMetaMaskInstalled,
      error,
      statusNotice,
      connect,
      disconnect,
      clearError,
      clearStatusNotice,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
