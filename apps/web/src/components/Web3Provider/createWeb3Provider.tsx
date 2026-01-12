import { CoinbaseWalletAdapter } from '@solana/wallet-adapter-coinbase'
import { WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react'
import { SolanaSignerUpdater } from 'components/Web3Provider/signSolanaTransaction'
import { AppKitProvider } from 'components/Web3Provider/reownConfig'
import React, { type PropsWithChildren, type ReactNode, useMemo } from 'react'
import { useWalletCapabilitiesStateEffect } from 'state/walletCapabilities/hooks/useWalletCapabilitiesStateEffect'
import { type Register, WagmiProvider } from 'wagmi'

export function createWeb3Provider(params: { wagmiConfig: Register['config']; reconnectOnMount?: boolean }) {
  const { wagmiConfig, reconnectOnMount = true } = params

  const Provider = ({ children }: { children: ReactNode }) => (
    <SolanaProvider>
      <AppKitProvider>
        {/* Use our wagmiConfig which includes HashKey Chain (from ORDERED_EVM_CHAINS) */}
        {/* WagmiAdapter creates its own config internally for Reown AppKit, but we still need our full config for other features */}
        <WagmiProvider config={wagmiConfig} reconnectOnMount={reconnectOnMount}>
          {children}
        </WagmiProvider>
      </AppKitProvider>
    </SolanaProvider>
  )

  Provider.displayName = 'Web3Provider'

  return Provider
}

function SolanaProvider({ children }: PropsWithChildren) {
  // WalletProvider has built-in support for SolanaStandard wallets;
  const wallets = useMemo(() => [new CoinbaseWalletAdapter()], [])

  return (
    <SolanaWalletProvider wallets={wallets} autoConnect>
      <SolanaSignerUpdater />
      {children}
    </SolanaWalletProvider>
  )
}

export function WalletCapabilitiesEffects() {
  useWalletCapabilitiesStateEffect()
  return null
}
