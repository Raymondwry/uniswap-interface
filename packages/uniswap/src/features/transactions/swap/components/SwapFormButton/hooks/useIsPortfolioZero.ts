import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import { useWallet } from 'uniswap/src/features/wallet/hooks/useWallet'
import { useOnChainPortfolioTotalValue } from 'uniswap/src/features/transactions/swap/components/SwapFormButton/hooks/useOnChainPortfolioTotalValue'

export function useIsPortfolioZero(): boolean {
  const wallet = useWallet()
  const { isTestnetModeEnabled } = useEnabledChains()
  // 使用链上查询替代 Uniswap GetPortfolio API
  const { balanceUSD, loading, error } = useOnChainPortfolioTotalValue({
    evmAddress: wallet.evmAccount?.address,
    svmAddress: wallet.svmAccount?.address,
  })

  const result = !isTestnetModeEnabled && balanceUSD === 0

  // Debug logging for WebFORNudge condition 2: Portfolio zero
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Log immediately when loading state changes
    if (loading) {
      console.log('[review] WebFORNudge Condition 2 - useIsPortfolioZero: 链上查询中...', {
        loading: true,
        currentBalanceUSD: balanceUSD,
        environment: {
          hostname: window.location.hostname,
          origin: window.location.origin,
          port: window.location.port,
        },
      })
    }

    // Log when loading completes (either success or error)
    if (!loading) {
      console.log('[review] WebFORNudge Condition 2 - useIsPortfolioZero: 链上查询完成', {
        result,
        isTestnetModeEnabled,
        balanceUSD,
        loading: false,
        error: error ? String(error) : undefined,
        errorDetails: error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack?.substring(0, 200),
            }
          : undefined,
        walletAddresses: {
          evmAddress: wallet.evmAccount?.address,
          svmAddress: wallet.svmAccount?.address,
        },
        environment: {
          hostname: window.location.hostname,
          origin: window.location.origin,
          port: window.location.port,
          protocol: window.location.protocol,
          href: window.location.href,
        },
        explanation: {
          parameter: 'isPortfolioZero',
          meaning: '检查投资组合余额是否为 0。使用链上查询替代 Uniswap GetPortfolio API，查询所有启用链的原生代币余额。',
          calculation: '!isTestnetModeEnabled && balanceUSD === 0',
          note: result
            ? '投资组合余额为 0 - 满足 WebFORNudge 条件（所有链的原生代币余额都为 0）'
            : error
              ? `链上查询失败: ${String(error)}`
              : `投资组合余额不为 0 (检测到非零余额) 或处于测试网模式 - 不满足 WebFORNudge 条件`,
          implementation: '使用链上直接查询，不依赖 Uniswap API，避免 CORS 问题',
        },
      })
    }
  }

  return result
}
