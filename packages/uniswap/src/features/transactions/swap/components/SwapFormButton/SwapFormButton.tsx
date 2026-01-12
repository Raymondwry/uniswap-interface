import { useState } from 'react'
import { Button, Flex, styled, useIsShortMobileDevice } from 'ui/src'
import { useTranslation } from 'react-i18next'
import { useTransactionModalContext } from 'uniswap/src/features/transactions/components/TransactionModal/TransactionModalContext'
import { useIsSwapButtonDisabled } from 'uniswap/src/features/transactions/swap/components/SwapFormButton/hooks/useIsSwapButtonDisabled'
import { useIsTradeIndicative } from 'uniswap/src/features/transactions/swap/components/SwapFormButton/hooks/useIsTradeIndicative'
import { useOnReviewPress } from 'uniswap/src/features/transactions/swap/components/SwapFormButton/hooks/useOnReviewPress'
import { useSwapFormButtonColors } from 'uniswap/src/features/transactions/swap/components/SwapFormButton/hooks/useSwapFormButtonColors'
import { useSwapFormButtonText } from 'uniswap/src/features/transactions/swap/components/SwapFormButton/hooks/useSwapFormButtonText'
import { SwapFormButtonTrace } from 'uniswap/src/features/transactions/swap/components/SwapFormButton/SwapFormButtonTrace'
import { SwapConfirmationModal } from 'uniswap/src/features/transactions/swap/components/SwapConfirmationModal/SwapConfirmationModal'
import { useSwapFormStoreDerivedSwapInfo } from 'uniswap/src/features/transactions/swap/stores/swapFormStore/useSwapFormStore'
import { useIsWebFORNudgeEnabled } from 'uniswap/src/features/providers/webForNudgeProvider'
import { TestID } from 'uniswap/src/test/fixtures/testIDs'
import { useEvent } from 'utilities/src/react/hooks'

export const SWAP_BUTTON_TEXT_VARIANT = 'buttonLabel1'

const WhiteButtonText = styled(Button.Text, {
  color: '#FFFFFF',
  '$group-item-hover': {
    color: '#FFFFFF',
  },
})


const GradientWrapper = styled(Flex, {
  borderRadius: 12,
  height: 60,
  py: 16,
  px: 0,
  '$platform-web': {
    background: 'linear-gradient(90.87deg, #2362DD -1.27%, #2C7FDD 47.58%, #AD81F1 99.78%)',
    boxShadow: '0px 0px 20px -5px rgba(35, 98, 221, 0.5)',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  hoverStyle: {
    opacity: 0.9,
  },
  pressStyle: {
    opacity: 0.8,
  },
})

// TODO(SWAP-573): Co-locate button action/color/text logic instead of separating the very-coupled UI state
export function SwapFormButton({ tokenColor }: { tokenColor?: string }): JSX.Element {
  const isShortMobileDevice = useIsShortMobileDevice()
  const indicative = useIsTradeIndicative()
  const { handleOnReviewPress } = useOnReviewPress()
  const disabled = useIsSwapButtonDisabled()
  const buttonText = useSwapFormButtonText()
  const { swapRedirectCallback } = useTransactionModalContext()
  const {
    backgroundColor: buttonBackgroundColor,
    variant: buttonVariant,
    emphasis: buttonEmphasis,
    buttonTextColor,
  } = useSwapFormButtonColors(tokenColor)
  // Only show loading state if the trade is `indicative` and we're not on the landing page.
  // This is so that the `Get Started` button is always enabled/clickable.
  const shouldShowLoading = !!indicative && !swapRedirectCallback

  const [isSwapConfirmationModalOpen, setIsSwapConfirmationModalOpen] = useState(false)
  const derivedSwapInfo = useSwapFormStoreDerivedSwapInfo((s) => s)
  const isWebFORNudgeEnabled = useIsWebFORNudgeEnabled()
  const { t } = useTranslation()
  const swapTokensText = t('empty.swap.button.text')

  const handleButtonPress = useEvent(() => {
    // Show confirmation modal when button text is "Swap Tokens" (either from WebFORNudge or other conditions)
    // Check both the flag and the actual button text to be safe
    const shouldShowModal = (isWebFORNudgeEnabled || buttonText === swapTokensText) && !swapRedirectCallback
    
    // Debug: log the values to help troubleshoot
    if (process.env.NODE_ENV === 'development') {
      console.log('SwapFormButton press:', {
        isWebFORNudgeEnabled,
        buttonText,
        swapTokensText,
        shouldShowModal,
        swapRedirectCallback,
      })
    }
    
    if (shouldShowModal) {
      setIsSwapConfirmationModalOpen(true)
    } else {
      handleOnReviewPress()
    }
  })

  const handleConfirmSwap = useEvent(() => {
    setIsSwapConfirmationModalOpen(false)
    handleOnReviewPress()
  })

  const handleCloseModal = useEvent(() => {
    setIsSwapConfirmationModalOpen(false)
  })

  return (
    <>
      <Flex alignItems="center" gap={isShortMobileDevice ? '$spacing8' : '$spacing16'}>
        <SwapFormButtonTrace>
          <Flex row alignSelf="stretch">
            <GradientWrapper width="100%">
              <Button
                variant={buttonVariant}
                emphasis={buttonEmphasis}
                // TODO(WALL-7186): make loading state more representative of the trade state
                loading={shouldShowLoading}
                isDisabled={disabled}
                backgroundColor="transparent"
                size={isShortMobileDevice ? 'small' : 'large'}
                testID={TestID.ReviewSwap}
                onPress={handleButtonPress}
                width="100%"
                borderRadius={12}
                hoverStyle={{
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                }}
                pressStyle={{
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                }}
              >
                <WhiteButtonText>{buttonText}</WhiteButtonText>
              </Button>
            </GradientWrapper>
          </Flex>
        </SwapFormButtonTrace>
      </Flex>
      <SwapConfirmationModal
        isOpen={isSwapConfirmationModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmSwap}
        derivedSwapInfo={derivedSwapInfo}
      />
    </>
  )
}
