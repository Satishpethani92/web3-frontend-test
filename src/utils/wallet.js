/**
 * MetaMask / EIP-1193 helpers.
 * Wallet access goes through window.ethereum only.
 */

import { utils as ethersUtils } from 'ethers';

export const METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/';

export const WALLET_STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
};

/** Common EVM chain labels for UI. */
const CHAIN_NAMES = {
  '0x1': 'Ethereum',
  '0x5': 'Goerli',
  '0xaa36a7': 'Sepolia',
  '0x89': 'Polygon',
  '0x13881': 'Mumbai',
  '0xa4b1': 'Arbitrum',
  '0xa': 'Optimism',
  '0x2105': 'Base',
};

/**
 * Resolve the MetaMask provider from window.ethereum.
 * Handles multi-wallet environments (ethereum.providers).
 */
export function getMetaMaskProvider() {
  if (typeof window === 'undefined') return null;

  const { ethereum } = window;
  if (!ethereum) return null;

  if (Array.isArray(ethereum.providers)) {
    const metaMask = ethereum.providers.find((provider) => provider?.isMetaMask);
    if (metaMask) return metaMask;
  }

  if (ethereum.isMetaMask) return ethereum;

  return null;
}

/** Raw injected provider (any EIP-1193), used only for presence checks. */
export function getEthereum() {
  if (typeof window === 'undefined') return null;
  return window.ethereum ?? null;
}

export function isMetaMaskAvailable() {
  return Boolean(getMetaMaskProvider());
}

/**
 * Checksum an address when possible; fall back to lowercase.
 */
export function normalizeAddress(address) {
  if (!address || typeof address !== 'string') return null;
  try {
    return ethersUtils.getAddress(address);
  } catch {
    return address.toLowerCase();
  }
}

/**
 * Truncate a wallet address for display: 0x1234...5678
 */
export function truncateAddress(address, start = 6, end = 4) {
  if (!address || typeof address !== 'string') return '';
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function getChainName(chainId) {
  if (!chainId) return null;
  const key = String(chainId).toLowerCase();
  return CHAIN_NAMES[key] || `Chain ${chainId}`;
}

/**
 * Map provider / MetaMask errors to user-friendly messages.
 */
export function getWalletErrorMessage(error) {
  if (!error) return 'Something went wrong. Please try again.';

  const code = error.code ?? error.error?.code;
  const message = String(error.message || error.error?.message || '').toLowerCase();

  if (code === 4001 || message.includes('user rejected') || message.includes('user denied')) {
    return 'Connection request was rejected in MetaMask.';
  }

  if (code === -32002 || message.includes('already pending')) {
    return 'A connection request is already pending. Open MetaMask to continue.';
  }

  if (code === -32603 || message.includes('internal json-rpc') || message.includes('internal error')) {
    return 'A wallet provider error occurred. Please try again.';
  }

  if (code === 4900 || message.includes('disconnected from all chains')) {
    return 'Wallet is disconnected from all networks. Reconnect in MetaMask.';
  }

  if (code === 4901 || message.includes('chain has not been added') || message.includes('unrecognized chain')) {
    return 'This network is not available in MetaMask. Switch networks and try again.';
  }

  if (
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('provider')
  ) {
    return 'Network or provider error. Check your connection and MetaMask network.';
  }

  if (
    message.includes('no ethereum provider') ||
    (message.includes('metamask') && (message.includes('not installed') || message.includes('not found')))
  ) {
    return 'MetaMask is not installed. Please install the MetaMask browser extension.';
  }

  return error.message || 'Unable to connect wallet. Please try again.';
}
