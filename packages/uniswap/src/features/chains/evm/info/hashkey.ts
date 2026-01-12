import { GraphQLApi } from '@universe/api'
import { ETH_LOGO, ETHEREUM_LOGO } from 'ui/src/assets'
import { config } from 'uniswap/src/config'
import {
  DEFAULT_NATIVE_ADDRESS_LEGACY,
  getPlaywrightRpcUrls,
  getQuicknodeEndpointUrl,
} from 'uniswap/src/features/chains/evm/rpc'
import { buildChainTokens } from 'uniswap/src/features/chains/evm/tokens'
import { GENERIC_L2_GAS_CONFIG } from 'uniswap/src/features/chains/gasDefaults'
import {
  GqlChainId,
  NetworkLayer,
  RPCType,
  UniverseChainId,
  UniverseChainInfo,
} from 'uniswap/src/features/chains/types'
import { Platform } from 'uniswap/src/features/platforms/types/Platform'
import { ElementName } from 'uniswap/src/features/telemetry/constants'
import { buildUSDC } from 'uniswap/src/features/tokens/stablecoin'
import { isPlaywrightEnv } from 'utilities/src/environment/env'
import { isWebApp } from 'utilities/src/platform'
import { DEFAULT_MS_BEFORE_WARNING } from 'uniswap/src/features/chains/evm/rpc'
import { ONE_MINUTE_MS } from 'utilities/src/time/time'

// HashKey Chain Mainnet tokens
const tokens = buildChainTokens({
  stables: {
    USDC: buildUSDC('0x054ed45810DbBAb8B27668922D110669c9D88D0a', UniverseChainId.HashKey),
  },
})

const LOCAL_HASHKEY_PLAYWRIGHT_RPC_URL = 'http://127.0.0.1:8547'

export const HASHKEY_CHAIN_INFO = {
  name: 'HashKey Chain',
  id: UniverseChainId.HashKey,
  blockExplorers: {
    default: {
      name: 'HashKey Explorer',
      url: 'https://hashkey.blockscout.com',
    },
  },
  testnet: false,
  platform: Platform.EVM,
  assetRepoNetworkName: 'hashkey',
  backendChain: {
    chain: GraphQLApi.Chain.Ethereum as GqlChainId, // Use Ethereum as fallback until HashKey is added to GraphQL API
    backendSupported: false, // Set to true when backend supports HashKey
    nativeTokenBackendAddress: undefined,
  },
  blockPerMainnetEpochForChainId: 6, // L2 chains typically have faster block times
  blockWaitMsBeforeWarning: isWebApp ? DEFAULT_MS_BEFORE_WARNING : ONE_MINUTE_MS,
  bridge: undefined,
  docs: 'https://docs.hashkeychain.io/',
  elementName: ElementName.ChainHashKey,
  explorer: {
    name: 'HashKey Explorer',
    url: 'https://hashkey.blockscout.com/',
  },
  interfaceName: 'hashkey',
  label: 'HashKey Chain',
  logo: ETHEREUM_LOGO, // Use Ethereum logo as placeholder, replace with HashKey logo when available
  nativeCurrency: {
    name: 'HashKey ETH',
    symbol: 'ETH',
    decimals: 18,
    address: DEFAULT_NATIVE_ADDRESS_LEGACY,
    logo: ETH_LOGO,
  },
  networkLayer: NetworkLayer.L2,
  pendingTransactionsRetryOptions: undefined,
  rpcUrls: isPlaywrightEnv()
    ? getPlaywrightRpcUrls(LOCAL_HASHKEY_PLAYWRIGHT_RPC_URL)
    : {
        [RPCType.Public]: {
          http: ['https://mainnet.hashkeychain.io'],
        },
        [RPCType.Default]: {
          http: ['https://mainnet.hashkeychain.io'],
        },
        [RPCType.Fallback]: {
          http: ['https://mainnet.hashkeychain.io'],
        },
        [RPCType.Interface]: {
          http: ['https://mainnet.hashkeychain.io'],
        },
      },
  urlParam: 'hashkey',
  statusPage: undefined,
  tokens,
  supportsV4: true,
  supportsNFTs: true,
  wrappedNativeCurrency: {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    address: '0x4200000000000000000000000000000000000006', // Standard OP-Stack WETH address
  },
  gasConfig: GENERIC_L2_GAS_CONFIG,
  tradingApiPollingIntervalMs: 150,
} as const satisfies UniverseChainInfo

// HashKey Chain Testnet tokens
const testnetTokens = buildChainTokens({
  stables: {
    USDC: buildUSDC('0x18Ec8e93627c893ae61ae0491c1C98769FD4Dfa2', UniverseChainId.HashKeyTestnet),
  },
})

export const HASHKEY_TESTNET_CHAIN_INFO = {
  name: 'HashKey Chain Testnet',
  id: UniverseChainId.HashKeyTestnet,
  blockExplorers: {
    default: {
      name: 'HashKey Testnet Explorer',
      url: 'https://testnet-explorer.hsk.xyz',
    },
  },
  testnet: true,
  platform: Platform.EVM,
  assetRepoNetworkName: undefined,
  backendChain: {
    chain: GraphQLApi.Chain.EthereumSepolia as GqlChainId, // Use Sepolia as fallback
    backendSupported: false,
    nativeTokenBackendAddress: undefined,
  },
  blockPerMainnetEpochForChainId: 6,
  blockWaitMsBeforeWarning: undefined,
  bridge: undefined,
  docs: 'https://docs.hashkeychain.io/',
  elementName: ElementName.ChainHashKeyTestnet,
  explorer: {
    name: 'HashKey Testnet Explorer',
    url: 'https://testnet-explorer.hsk.xyz/',
  },
  interfaceName: 'hashkey-testnet',
  label: 'HashKey Testnet',
  logo: ETHEREUM_LOGO,
  nativeCurrency: {
    name: 'HashKey Testnet ETH',
    symbol: 'ETH',
    decimals: 18,
    address: DEFAULT_NATIVE_ADDRESS_LEGACY,
    logo: ETH_LOGO,
  },
  networkLayer: NetworkLayer.L2,
  pendingTransactionsRetryOptions: undefined,
  rpcUrls: {
    [RPCType.Public]: {
      http: ['https://testnet.hashkeychain.io'],
    },
    [RPCType.Default]: {
      http: ['https://testnet.hashkeychain.io'],
    },
    [RPCType.Fallback]: {
      http: ['https://testnet.hashkeychain.io'],
    },
    [RPCType.Interface]: {
      http: ['https://testnet.hashkeychain.io'],
    },
  },
  urlParam: 'hashkey_testnet',
  statusPage: undefined,
  tokens: testnetTokens,
  supportsV4: true,
  supportsNFTs: false,
  wrappedNativeCurrency: {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    address: '0x4200000000000000000000000000000000000006',
  },
  gasConfig: GENERIC_L2_GAS_CONFIG,
  tradingApiPollingIntervalMs: 150,
} as const satisfies UniverseChainInfo

