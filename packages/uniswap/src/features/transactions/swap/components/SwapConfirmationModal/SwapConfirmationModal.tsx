import { useEffect, useMemo, useState } from 'react'
import { Flex, Text, TouchableArea } from 'ui/src'
import { Chevron } from 'ui/src/components/icons/Chevron'
import { X } from 'ui/src/components/icons/X'
import { InfoCircle } from 'ui/src/components/icons/InfoCircle'
import { Modal } from 'uniswap/src/components/modals/Modal'
import { AdaptiveWebModal } from 'ui/src/components/modal/AdaptiveWebModal'
import { CurrencyLogo } from 'uniswap/src/components/CurrencyLogo/CurrencyLogo'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { useUSDCValue } from 'uniswap/src/features/transactions/hooks/useUSDCPrice'
import type { DerivedSwapInfo } from 'uniswap/src/features/transactions/swap/types/derivedSwapInfo'
import { getTradeAmounts } from 'uniswap/src/features/transactions/swap/utils/getTradeAmounts'
import { usePriceUXEnabled } from 'uniswap/src/features/transactions/swap/hooks/usePriceUXEnabled'
import { CurrencyField } from 'uniswap/src/types/currency'
import { NumberType } from 'utilities/src/format/types'
import { styled } from 'ui/src'
import { isWebPlatform } from 'utilities/src/platform'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { useSwapFormScreenStore } from 'uniswap/src/features/transactions/swap/form/stores/swapFormScreenStore/useSwapFormScreenStore'

const ModalContainer = styled(Flex, {
  width: 440,
  backgroundColor: '#1A1B23',
  borderWidth: 1,
  borderColor: '#545C69',
  borderRadius: 0,
  flexDirection: 'column',
  p: 0,
  overflow: 'hidden',
  '$platform-web': {
    boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    borderRadius: '0 !important',
    margin: '0 !important',
    padding: '0 !important',
  },
})

const Header = styled(Flex, {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  py: 8,
  px: 12,
  width: '100%',
  height: 50,
  borderBottomWidth: 1,
  borderBottomColor: '#545C69',
  borderRadius: 0,
})

const Content = styled(Flex, {
  flexDirection: 'column',
  alignItems: 'center',
  p: 0,
  pt: 18,
  gap: 10,
  width: '100%',
})

const TokenRow = styled(Flex, {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  height: 67,
  gap: 18,
})

const TokenInfo = styled(Flex, {
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 4,
  width: 133.85,
  height: 67,
})

const FeesSection = styled(Flex, {
  flexDirection: 'column',
  alignItems: 'flex-start',
  px: 18,
  gap: 16,
  width: '100%',
  alignSelf: 'stretch',
})

const FeeRow = styled(Flex, {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  height: 21,
})

interface SwapConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  derivedSwapInfo: DerivedSwapInfo<CurrencyInfo, CurrencyInfo>
}

export function SwapConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  derivedSwapInfo,
}: SwapConfirmationModalProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)
  const { formatCurrencyAmount, convertFiatAmountFormatted } = useLocalizationContext()
  const priceUXEnabled = usePriceUXEnabled()
  const { inputCurrencyAmount, outputCurrencyAmount } = getTradeAmounts(derivedSwapInfo, priceUXEnabled)

  const formattedTokenAmountIn = useMemo(
    () =>
      inputCurrencyAmount
        ? formatCurrencyAmount({
            value: inputCurrencyAmount,
            type: NumberType.TokenTx,
          })
        : '0',
    [formatCurrencyAmount, inputCurrencyAmount],
  )

  const formattedTokenAmountOut = useMemo(
    () =>
      outputCurrencyAmount
        ? formatCurrencyAmount({
            value: outputCurrencyAmount,
            type: NumberType.TokenTx,
          })
        : '0',
    [formatCurrencyAmount, outputCurrencyAmount],
  )

  const usdAmountIn = useUSDCValue(inputCurrencyAmount)
  const usdAmountOut = useUSDCValue(outputCurrencyAmount)
  const formattedFiatAmountIn = useMemo(
    () => convertFiatAmountFormatted(usdAmountIn?.toExact(), NumberType.FiatTokenQuantity),
    [convertFiatAmountFormatted, usdAmountIn],
  )
  const formattedFiatAmountOut = useMemo(
    () => convertFiatAmountFormatted(usdAmountOut?.toExact(), NumberType.FiatTokenQuantity),
    [convertFiatAmountFormatted, usdAmountOut],
  )

  const inputCurrency = inputCurrencyAmount?.currency
  const outputCurrency = outputCurrencyAmount?.currency

  // Get currencies from SwapFormScreenStore (the actual currencies shown in the form)
  const formCurrencies = useSwapFormScreenStore((s) => s.currencies)
  const sellCurrencyInfo = formCurrencies[CurrencyField.INPUT] ?? undefined
  // Use buy currency from form if available, otherwise fallback to derivedSwapInfo
  const buyCurrencyInfo = formCurrencies[CurrencyField.OUTPUT] ?? derivedSwapInfo.currencies[CurrencyField.OUTPUT] ?? undefined

  // TokenRow component
  interface TokenRowProps {
    currencyInfo: CurrencyInfo | undefined
    amount: string
    fiatAmount: string
    paddingX: number
    hasValidData: boolean
  }

  function TokenRowComponent({ currencyInfo, amount, fiatAmount, paddingX, hasValidData }: TokenRowProps): JSX.Element {
    return (
      <TokenRow px={paddingX}>
        <TokenInfo>
          <Text
            style={{
              fontFamily: "'Aleo', sans-serif",
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 28,
              lineHeight: 42,
              color: '#FFFFFF',
            }}
          >
            {amount}
          </Text>
          <Text
            style={{
              fontFamily: "'Aleo', sans-serif",
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: 21,
              color: '#64748B',
            }}
          >
            {fiatAmount}
          </Text>
        </TokenInfo>
        {hasValidData && currencyInfo ? (
          <CurrencyLogo currencyInfo={currencyInfo} size={42} />
        ) : (
          <Flex width={42} height={42} backgroundColor="$surface2" borderRadius={21} />
        )}
      </TokenRow>
    )
  }

  // Force-remove any rounding/overflow applied by Radix/Tamagui wrappers
  useEffect(() => {
    if (!isOpen) {
      return
    }
    const content = document.querySelector('[data-radix-dialog-content]')
    if (content) {
      const parent = content.parentElement as HTMLElement | null
      const grand = parent?.parentElement as HTMLElement | null
      const apply = (el: HTMLElement | null) => {
        if (!el) return
        el.style.borderRadius = '0'
        el.style.overflow = 'visible'
        el.style.boxShadow = 'none'
        el.style.margin = '0'
        el.style.padding = '0'
        el.style.background = 'transparent'
        el.style.maxWidth = 'none'
        el.style.width = 'auto'
      }
      apply(parent)
      apply(grand)
    }
  }, [isOpen])

  // Debug: log modal state
  if (process.env.NODE_ENV === 'development') {
    console.log('SwapConfirmationModal render:', {
      isOpen,
      hasInputCurrency: !!inputCurrency,
      hasOutputCurrency: !!outputCurrency,
      hasInputCurrencyInfo: !!derivedSwapInfo.currencies[CurrencyField.INPUT],
      hasOutputCurrencyInfo: !!derivedSwapInfo.currencies[CurrencyField.OUTPUT],
    })
  }

  // Don't render modal if it's not open
  if (!isOpen) {
    return <></>
  }

  // If currencies are missing, still show modal but with placeholder data
  const hasValidData = inputCurrency && outputCurrency && sellCurrencyInfo && buyCurrencyInfo

  const modalContent = (
    <ModalContainer
      style={{
        borderRadius: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
        <Header>
          <Text
            style={{
              fontFamily: "'Aleo', sans-serif",
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 18,
              lineHeight: 27,
              color: '#FFFFFF',
            }}
          >
            You're swapping
          </Text>
          <TouchableArea onPress={onClose} width={32} height={32}>
            <Flex alignItems="center" justifyContent="center" width={32} height={32}>
              <X color="#94A3B8" size={24} />
            </Flex>
          </TouchableArea>
        </Header>

        <Content>
          <Flex flexDirection="column" gap={18} width="100%" alignItems="flex-start">
            {/* Sell Token (Input) */}
            <TokenRowComponent
              currencyInfo={sellCurrencyInfo}
              amount={formattedTokenAmountIn}
              fiatAmount={formattedFiatAmountIn}
              paddingX={24}
              hasValidData={!!sellCurrencyInfo}
            />

            {/* Arrow */}
            <Flex alignItems="center" justifyContent="center" width="100%" px={18}>
              <Flex
                width={16}
                height={16}
                alignItems="center"
                justifyContent="center"
                style={{ transform: 'rotate(-90deg)' }}
              >
                <Chevron color="#94A3B8" size={16} />
              </Flex>
            </Flex>

            {/* Buy Token (Output) */}
            <TokenRowComponent
              currencyInfo={buyCurrencyInfo}
              amount={formattedTokenAmountOut}
              fiatAmount={formattedFiatAmountOut}
              paddingX={18}
              hasValidData={!!buyCurrencyInfo}
            />
          </Flex>

          {/* Fees Section */}
          <FeesSection>
            <Flex flexDirection="row" alignItems="center" gap={16} width="100%" height={20} py={0}>
              <Flex flex={1} height={1} backgroundColor="#545C69" />
              <TouchableArea
                onPress={() => setIsExpanded((prev) => !prev)}
                style={{
                  width: 98,
                  height: 20,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: "'Aleo', sans-serif",
                    fontStyle: 'normal',
                    fontWeight: 500,
                    fontSize: 14,
                    lineHeight: 20,
                    color: '#94A3B8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </Text>
                <Flex
                  width={16}
                  height={16}
                  alignItems="center"
                  justifyContent="center"
                  style={{
                    transform: isExpanded ? 'rotate(-90deg)' : 'rotate(90deg)',
                  }}
                >
                  <Chevron color="#94A3B8" size={16} />
                </Flex>
              </TouchableArea>
              <Flex flex={1} height={1} backgroundColor="#545C69" />
            </Flex>

            <Flex flexDirection="column" gap={12} width="100%">
              <Flex flexDirection="row" alignItems="center" justifyContent="space-between" width="100%">
                <Flex flexDirection="row" alignItems="center" gap={6}>
                  <Text
                    style={{
                      fontFamily: "'Aleo', sans-serif",
                      fontStyle: 'normal',
                      fontWeight: 500,
                      fontSize: 14,
                      lineHeight: 21,
                      color: '#94A3B8',
                    }}
                  >
                    Fee
                  </Text>
                  <InfoCircle color="#94A3B8" size={16} />
                </Flex>
                <Text
                  style={{
                    fontFamily: "'Aleo', sans-serif",
                    fontStyle: 'normal',
                    fontWeight: 500,
                    fontSize: 14,
                    lineHeight: 21,
                    color: '#AD81F1',
                  }}
                >
                  Free
                </Text>
              </Flex>

              <Flex flexDirection="row" alignItems="center" justifyContent="space-between" width="100%">
                <Flex flexDirection="row" alignItems="center" gap={6}>
                  <Text
                    style={{
                      fontFamily: "'Aleo', sans-serif",
                      fontStyle: 'normal',
                      fontWeight: 500,
                      fontSize: 14,
                      lineHeight: 21,
                      color: '#94A3B8',
                    }}
                  >
                    Network cost
                  </Text>
                  <InfoCircle color="#94A3B8" size={16} />
                </Flex>
                <Flex flexDirection="row" alignItems="center" gap={6}>
                  <Text
                    style={{
                      fontFamily: "'Aleo', sans-serif",
                      fontStyle: 'normal',
                      fontWeight: 500,
                      fontSize: 14,
                      lineHeight: 21,
                      color: '#FFFFFF',
                    }}
                  >
                    $0.02
                  </Text>
                  
                </Flex>
              </Flex>

              {isExpanded && (
                <>
                  <Flex flexDirection="row" alignItems="center" justifyContent="space-between" width="100%" gap={0}>
                    <Flex flexDirection="row" alignItems="center" gap={6}>
                      <Text
                        style={{
                          fontFamily: "'Aleo', sans-serif",
                          fontStyle: 'normal',
                          fontWeight: 500,
                          fontSize: 14,
                          lineHeight: 20,
                          color: '#94A3B8',
                        }}
                      >
                        Rate
                      </Text>
                    </Flex>
                    <Text
                      style={{
                        fontFamily: "'Aleo', sans-serif",
                        fontStyle: 'normal',
                        fontWeight: 500,
                        fontSize: 14,
                        lineHeight: 20,
                        color: '#FFFFFF',
                      }}
                    >
                      1 ETH = 3218.57 USDC ($3,218.57)
                    </Text>
                  </Flex>

                  <Flex flexDirection="row" alignItems="center" justifyContent="space-between" width="100%" gap={0}>
                    <Flex flexDirection="row" alignItems="center" gap={6}>
                      <Text
                        style={{
                          fontFamily: "'Aleo', sans-serif",
                          fontStyle: 'normal',
                          fontWeight: 500,
                          fontSize: 14,
                          lineHeight: 20,
                          color: '#94A3B8',
                        }}
                      >
                        Max slippage
                      </Text>
                      <InfoCircle color="#94A3B8" size={16} />
                    </Flex>
                    <Text
                      style={{
                        fontFamily: "'Aleo', sans-serif",
                        fontStyle: 'normal',
                        fontWeight: 500,
                        fontSize: 14,
                        lineHeight: 20,
                        color: '#FFFFFF',
                      }}
                    >
                      Auto 0.67%
                    </Text>
                  </Flex>

                  <Flex flexDirection="row" alignItems="center" justifyContent="space-between" width="100%" gap={0}>
                    <Flex flexDirection="row" alignItems="center" gap={6}>
                      <Text
                        style={{
                          fontFamily: "'Aleo', sans-serif",
                          fontStyle: 'normal',
                          fontWeight: 500,
                          fontSize: 14,
                          lineHeight: 20,
                          color: '#94A3B8',
                        }}
                      >
                        Order routing
                      </Text>
                      <InfoCircle color="#94A3B8" size={16} />
                    </Flex>
                    <Text
                      style={{
                        fontFamily: "'Aleo', sans-serif",
                        fontStyle: 'normal',
                        fontWeight: 500,
                        fontSize: 14,
                        lineHeight: 20,
                        color: '#FFFFFF',
                      }}
                    >
                      HSK API
                    </Text>
                  </Flex>

                  <Flex flexDirection="row" alignItems="center" justifyContent="space-between" width="100%" gap={0}>
                    <Flex flexDirection="row" alignItems="center" gap={6}>
                      <Text
                        style={{
                          fontFamily: "'Aleo', sans-serif",
                          fontStyle: 'normal',
                          fontWeight: 500,
                          fontSize: 14,
                          lineHeight: 20,
                          color: '#94A3B8',
                        }}
                      >
                        Price impact
                      </Text>
                      <InfoCircle color="#94A3B8" size={16} />
                    </Flex>
                    <Text
                      style={{
                        fontFamily: "'Aleo', sans-serif",
                        fontStyle: 'normal',
                        fontWeight: 500,
                        fontSize: 14,
                        lineHeight: 20,
                        color: '#FFFFFF',
                      }}
                    >
                      -0.05%
                    </Text>
                  </Flex>
                </>
              )}
            </Flex>
          </FeesSection>

          {/* Swap Button */}
          <Flex mt={8} px={18} pb={18} width="100%" alignItems="center">
            <TouchableArea
              onPress={onConfirm}
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px 18px',
                width: 404,
                height: 60,
                background: 'linear-gradient(90.87deg, #2362DD -1.27%, #2C7FDD 47.58%, #AD81F1 99.78%)',
                boxShadow: '0px 0px 20px -5px rgba(35, 98, 221, 0.5)',
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "'Aleo', sans-serif",
                  fontStyle: 'normal',
                  fontWeight: 600,
                  fontSize: 18,
                  lineHeight: 28,
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}
              >
                Swap Tokens
              </Text>
            </TouchableArea>
          </Flex>
        </Content>
      </ModalContainer>
  )

  return (
    <>
      {/* Global CSS to override Dialog.Content border radius and padding */}
      {isOpen && (
        <style>
          {`
            [data-radix-dialog-content],
            [data-radix-dialog-content] > div:first-child,
            [data-radix-dialog-content] > div:first-child > div {
              border-radius: 0 !important;
              background: transparent !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              max-width: none !important;
              width: auto !important;
              overflow: visible !important;
            }
            [data-radix-dialog-content] * {
              border-radius: 0 !important;
            }
          `}
        </style>
      )}

      {isWebPlatform ? (
        <AdaptiveWebModal
          isOpen={isOpen}
          onClose={onClose}
          alignment="center"
          adaptToSheet={false}
          borderWidth={0}
          backgroundColor="$transparent"
          style={{
            borderRadius: 0,
            boxShadow: 'none',
            margin: 0,
            padding: 0,
            maxWidth: 'none',
            width: 'auto',
            overflow: 'visible',
          }}
        >
          {modalContent}
        </AdaptiveWebModal>
      ) : (
        <Modal
          name={ModalName.ConfirmSwap}
          isModalOpen={isOpen}
          onClose={onClose}
          alignment="center"
          maxWidth={440}
          height="auto"
          padding={0}
          paddingX={0}
          paddingY={0}
          pt={0}
          pb={0}
          hideHandlebar={true}
          borderWidth={0}
        >
          {modalContent}
        </Modal>
      )}
    </>
  )
}

