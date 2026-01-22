import { Experiments, getExperimentValue, WebFORNudgesProperties } from '@universe/gating'
import { isWebApp } from 'utilities/src/platform'

export function getIsWebFORNudgeEnabled(): boolean {
  if (!isWebApp) {
    return false
  }

  const result = getExperimentValue({
    experiment: Experiments.WebFORNudges,
    param: WebFORNudgesProperties.NudgeEnabled,
    defaultValue: false,
  })

  // Debug logging for WebFORNudge condition 1: Statsig experiment
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[review] WebFORNudge Condition 1 - getIsWebFORNudgeEnabled:', {
      result,
      explanation: {
        parameter: 'getIsWebFORNudgeEnabled()',
        meaning: '检查 Statsig 实验 "WebFORNudges" 是否启用。WebFORNudge = Web Fiat On Ramp Nudge，用于在钱包为空时引导用户购买/接收代币。',
        experiment: 'WebFORNudges (web_for_nudge)',
        param: 'NudgeEnabled',
        defaultValue: false,
        note: result
          ? 'Statsig 实验已启用 - 钱包为空时将显示 "Swap Tokens" 按钮'
          : 'Statsig 实验未启用或未配置 - 将显示 "Review" 按钮',
      },
    })
  }

  return result
}
