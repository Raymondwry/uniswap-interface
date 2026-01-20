import { createApprovalTransactionStep } from 'uniswap/src/features/transactions/steps/approve'
import { createPermit2SignatureStep } from 'uniswap/src/features/transactions/steps/permit2Signature'
import { createPermit2TransactionStep } from 'uniswap/src/features/transactions/steps/permit2Transaction'
import { createRevocationTransactionStep } from 'uniswap/src/features/transactions/steps/revoke'
import { TransactionStep } from 'uniswap/src/features/transactions/steps/types'
import { orderClassicSwapSteps } from 'uniswap/src/features/transactions/swap/steps/classicSteps'
import { createSignUniswapXOrderStep } from 'uniswap/src/features/transactions/swap/steps/signOrder'
import {
  createSwapTransactionAsyncStep,
  createSwapTransactionStep,
  createSwapTransactionStepBatched,
} from 'uniswap/src/features/transactions/swap/steps/swap'
import { orderUniswapXSteps } from 'uniswap/src/features/transactions/swap/steps/uniswapxSteps'
import { isValidSwapTxContext, SwapTxAndGasInfo } from 'uniswap/src/features/transactions/swap/types/swapTxAndGasInfo'
import { isBridge, isClassic, isUniswapX } from 'uniswap/src/features/transactions/swap/utils/routing'

export function generateSwapTransactionSteps(txContext: SwapTxAndGasInfo): TransactionStep[] {
  const isValidSwap = isValidSwapTxContext(txContext)

  if (process.env.NODE_ENV === 'development') {
    console.log('[Swap] generateSwapTransactionSteps:', {
      isValidSwap,
      routing: txContext.routing,
      hasTxRequests: !!txContext.txRequests,
      txRequestCount: txContext.txRequests?.length || 0,
      isClassic: isClassic(txContext),
      isBridge: isBridge(txContext),
      isUniswapX: isUniswapX(txContext),
    })
  }

  if (isValidSwap) {
    const { trade, approveTxRequest, revocationTxRequest } = txContext

    const requestFields = {
      tokenAddress: trade.inputAmount.currency.wrapped.address,
      chainId: trade.inputAmount.currency.chainId,
    }
    const revocation = createRevocationTransactionStep({
      ...requestFields,
      txRequest: revocationTxRequest,
    })
    const approval = createApprovalTransactionStep({
      ...requestFields,
      txRequest: approveTxRequest,
      amount: trade.inputAmount.quotient.toString(),
    })

    if (isClassic(txContext)) {
      const { swapRequestArgs } = txContext

      if (txContext.unsigned) {
        return orderClassicSwapSteps({
          revocation,
          approval,
          permit: createPermit2SignatureStep(txContext.permit.typedData),
          swap: createSwapTransactionAsyncStep(swapRequestArgs),
        })
      }
      if (txContext.txRequests.length > 1) {
        return orderClassicSwapSteps({
          permit: undefined,
          swap: createSwapTransactionStepBatched(txContext.txRequests),
        })
      }

      const permit = txContext.permit
        ? createPermit2TransactionStep({
            txRequest: txContext.permit.txRequest,
            amountIn: trade.inputAmount,
          })
        : undefined

      const steps = orderClassicSwapSteps({
        revocation,
        approval,
        permit,
        swap: createSwapTransactionStep(txContext.txRequests[0]),
      })
      if (process.env.NODE_ENV === 'development') {
        console.log('[Swap] generateSwapTransactionSteps: Returning classic steps:', {
          stepCount: steps.length,
          stepTypes: steps.map((s) => s.type),
        })
      }
      return steps
    } else if (isUniswapX(txContext)) {
      const steps = orderUniswapXSteps({
        revocation,
        approval,
        signOrder: createSignUniswapXOrderStep(txContext.permit.typedData, txContext.trade.quote.quote),
      })
      if (process.env.NODE_ENV === 'development') {
        console.log('[Swap] generateSwapTransactionSteps: Returning UniswapX steps:', {
          stepCount: steps.length,
          stepTypes: steps.map((s) => s.type),
        })
      }
      return steps
    } else if (isBridge(txContext)) {
      let steps: TransactionStep[]
      if (txContext.txRequests.length > 1) {
        steps = orderClassicSwapSteps({
          permit: undefined,
          swap: createSwapTransactionStepBatched(txContext.txRequests),
        })
      } else {
        steps = orderClassicSwapSteps({
          revocation,
          approval,
          permit: undefined,
          swap: createSwapTransactionStep(txContext.txRequests[0]),
        })
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[Swap] generateSwapTransactionSteps: Returning bridge steps:', {
          stepCount: steps.length,
          stepTypes: steps.map((s) => s.type),
        })
      }
      return steps
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('[Swap] generateSwapTransactionSteps: Returning empty steps array!', {
      isValidSwap,
      routing: txContext.routing,
    })
  }
  return []
}
