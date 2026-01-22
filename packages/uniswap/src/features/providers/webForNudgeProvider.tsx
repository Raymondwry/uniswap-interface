import React from 'react'
import { useUniswapContext } from 'uniswap/src/contexts/UniswapContext'
import { useIsPortfolioZero } from 'uniswap/src/features/transactions/swap/components/SwapFormButton/hooks/useIsPortfolioZero'
import { getIsWebFORNudgeEnabled } from 'uniswap/src/features/transactions/swap/utils/getIsWebForNudgeEnabled'

type StateContext = boolean
type SetContext = (v: boolean) => void

const WebFORNudgeStateContext = React.createContext<StateContext>(false)
WebFORNudgeStateContext.displayName = 'WebFORNudgeStateContext'

const WebFORNudgeSetContext = React.createContext<SetContext>((_: boolean) => {})
WebFORNudgeSetContext.displayName = 'WebFORNudgeSetContext'

const WebFORNudgeEnabledContext = React.createContext<boolean>(false)
WebFORNudgeEnabledContext.displayName = 'WebFORNudgeEnabledContext'

// This is a provider to wrap the swap component to maintain the state across different swap tabs
export function WebFORNudgeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [state, setState] = React.useState(false)
  const isWebFORNudgeEnabled = useWebFORNudgeGateEnabled()

  return (
    <WebFORNudgeEnabledContext.Provider value={isWebFORNudgeEnabled}>
      <WebFORNudgeStateContext.Provider value={state}>
        <WebFORNudgeSetContext.Provider value={setState}>{children}</WebFORNudgeSetContext.Provider>
      </WebFORNudgeStateContext.Provider>
    </WebFORNudgeEnabledContext.Provider>
  )
}

export function useIsShowingWebFORNudge(): boolean {
  return React.useContext(WebFORNudgeStateContext)
}

export function useSetIsShowingWebFORNudge(): (v: boolean) => void {
  return React.useContext(WebFORNudgeSetContext)
}

export function useWebFORNudgeGateEnabled(): boolean {
  const isWebFORNudgeEnabled = getIsWebFORNudgeEnabled()
  const isPortfolioZero = useIsPortfolioZero()
  const { getCanPayGasInAnyToken } = useUniswapContext()

  // If wallet can pay gas in any token (e.g., Porto wallet), don't show the nudge
  const canPayGasInAnyToken = getCanPayGasInAnyToken?.() ?? false

  const result = isWebFORNudgeEnabled && isPortfolioZero && !canPayGasInAnyToken

  // Debug logging for WebFORNudge condition 3: Can pay gas in any token
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[review] WebFORNudge Condition 3 - canPayGasInAnyToken:', {
      canPayGasInAnyToken,
      explanation: {
        parameter: '!canPayGasInAnyToken',
        meaning: '检查钱包是否可以用任何代币支付 gas 费用。某些钱包（如 Porto 钱包）支持用任意代币支付 gas，这种情况下不需要引导用户购买原生代币，因此不显示 WebFORNudge。',
        note: canPayGasInAnyToken
          ? '钱包可以用任何代币支付 gas（如 Porto 钱包）- 不满足 WebFORNudge 条件，不需要引导购买原生代币'
          : '钱包不能用任何代币支付 gas - 满足 WebFORNudge 条件，需要引导用户购买原生代币',
      },
    })
  }

  // Debug logging for final WebFORNudge result
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[review] WebFORNudge Final Result:', {
      result,
      conditions: {
        condition1_getIsWebFORNudgeEnabled: isWebFORNudgeEnabled,
        condition2_isPortfolioZero: isPortfolioZero,
        condition3_notCanPayGasInAnyToken: !canPayGasInAnyToken,
      },
      explanation: {
        whatIsWebFORNudge: 'WebFORNudge = Web Fiat On Ramp Nudge（Web 法币入金提示）。当用户钱包为空时，显示 "Swap Tokens" 按钮和空钱包引导卡片，引导用户购买/接收代币。',
        formula: 'isWebFORNudgeEnabled = condition1 && condition2 && condition3',
        result: result
          ? '✅ WebFORNudge 已启用 - 将显示 "Swap Tokens" 按钮'
          : '❌ WebFORNudge 未启用 - 将显示 "Review" 按钮',
        whyFalse: !result
          ? `未启用的原因：${[
              !isWebFORNudgeEnabled && '条件1: Statsig 实验未启用',
              !isPortfolioZero && '条件2: 投资组合余额不为 0',
              canPayGasInAnyToken && '条件3: 钱包可以用任何代币支付 gas',
            ]
              .filter(Boolean)
              .join(' 或 ')}`
          : '所有条件都满足',
      },
    })
  }

  return result
}

export function useIsWebFORNudgeEnabled(): boolean {
  return React.useContext(WebFORNudgeEnabledContext)
}
