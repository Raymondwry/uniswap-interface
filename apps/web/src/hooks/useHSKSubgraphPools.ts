import { useQuery } from '@tanstack/react-query'
import { Percent } from '@uniswap/sdk-core'
import { DEFAULT_TICK_SPACING, V2_DEFAULT_FEE_TIER } from 'uniswap/src/constants/pools'
import { BIPS_BASE } from 'uniswap/src/constants/misc'
import { PoolStat } from 'state/explore/types'
import { Amount } from '@uniswap/client-explore/dist/uniswap/explore/v1/service_pb'
import { FeeData } from 'components/Liquidity/Create/types'
import { GraphQLApi } from '@universe/api'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { toGraphQLChain } from 'uniswap/src/features/chains/utils'
import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'

// 使用代理 URL 避免 CORS 问题
// 开发环境：使用 Vite 代理（localhost）
// 生产环境：如果 subgraph 服务器配置了 CORS，可以直接使用；否则需要通过后端代理
// 注意：如果生产环境出现 CORS 错误，需要：
// 1. 让 subgraph 服务器配置 CORS 头（推荐）
// 2. 或者通过后端 API 转发请求
const SUBGRAPH_URL = 
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? '/hsk-subgraph'  // 开发环境：使用 Vite 代理
    : 'https://graphnode-testnet.hashkeychain.net/subgraphs/name/uniswap-v3/hsk-test'  // 生产环境：直接请求（需要服务器配置 CORS）
const BEARER_TOKEN = ''

interface SubgraphPool {
  id: string
  token0: {
    id: string
    symbol: string
    name: string
    decimals: string
  }
  token1: {
    id: string
    symbol: string
    name: string
    decimals: string
  }
  feeTier: string
  liquidity: string
  sqrtPrice: string
  tick: string
  totalValueLockedUSD: string
  totalValueLockedToken0: string
  totalValueLockedToken1: string
  volumeUSD: string
  txCount: string
  createdAtTimestamp: string
}

interface SubgraphResponse {
  pools: SubgraphPool[]
}

async function querySubgraph(query: string, variables: Record<string, unknown> = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (BEARER_TOKEN) {
    headers['Authorization'] = `Bearer ${BEARER_TOKEN}`
  }

  const response = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors, null, 2)}`)
  }

  return data.data as SubgraphResponse
}

function calculateApr(volume24h: number, tvl: number, feeTier: number): Percent {
  if (!volume24h || !feeTier || !tvl || !Math.round(tvl)) {
    return new Percent(0)
  }
  return new Percent(Math.round(volume24h * (feeTier / (BIPS_BASE * 100)) * 365), Math.round(tvl))
}

function calculate1DVolOverTvl(volume24h: number | undefined, tvl: number | undefined): number | undefined {
  if (!volume24h || !tvl) {
    return undefined
  }
  return volume24h / tvl
}

function convertSubgraphPoolToPoolStat(pool: SubgraphPool): PoolStat {
  const tvl = parseFloat(pool.totalValueLockedUSD || '0')
  const volume24h = parseFloat(pool.volumeUSD || '0')
  const feeTier = parseInt(pool.feeTier || '500', 10)

  const volumeAmount = new Amount()
  volumeAmount.value = volume24h // Amount.value 是 number 类型

  const tvlAmount = new Amount()
  tvlAmount.value = tvl // Amount.value 是 number 类型

  // HSK Testnet 使用 HashKeyTestnet chain
  // 使用 toGraphQLChain 函数来获取正确的 chain 值
  const chain = toGraphQLChain(UniverseChainId.HashKeyTestnet) as GraphQLApi.Chain

  // 创建符合 PoolStats 结构的对象
  // 使用类型断言来绕过 protobuf 类型的限制
  // token0 和 token1 需要符合 TokenStats 的结构，但我们可以使用 Partial 类型
  const poolStat = {
    id: pool.id,
    chain, // 设置 chain 字段为 HASHKEY_TESTNET
    token0: {
      address: pool.token0.id,
      symbol: pool.token0.symbol,
      name: pool.token0.name,
      decimals: parseInt(pool.token0.decimals, 10),
      chain, // Token 也需要 chain 字段
      standard: GraphQLApi.TokenStandard.Erc20, // 默认 ERC20
    } as any, // 使用 any 来绕过 TokenStats 的复杂类型要求
    token1: {
      address: pool.token1.id,
      symbol: pool.token1.symbol,
      name: pool.token1.name,
      decimals: parseInt(pool.token1.decimals, 10),
      chain, // Token 也需要 chain 字段
      standard: GraphQLApi.TokenStandard.Erc20, // 默认 ERC20
    } as any, // 使用 any 来绕过 TokenStats 的复杂类型要求
    totalLiquidity: tvlAmount,
    volume1Day: volumeAmount,
    volume30Day: volumeAmount, // Subgraph 可能没有 30 天数据，使用 24h 数据
    protocolVersion: 'v3' as any, // 直接使用字符串 'v3' 显示
    apr: calculateApr(volume24h, tvl, feeTier),
    volOverTvl: calculate1DVolOverTvl(volume24h, tvl),
    feeTier: {
      feeAmount: feeTier,
      tickSpacing: DEFAULT_TICK_SPACING,
      isDynamic: false,
    },
    hookAddress: undefined,
    boostedApr: undefined,
  } as unknown as PoolStat // 使用双重类型断言来绕过类型检查

  return poolStat
}

const TOP_POOLS_QUERY = `
  query TopPools($first: Int!) {
    pools(
      first: $first
      orderBy: totalValueLockedUSD
      orderDirection: desc
    ) {
      id
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      feeTier
      liquidity
      sqrtPrice
      tick
      totalValueLockedUSD
      totalValueLockedToken0
      totalValueLockedToken1
      volumeUSD
      txCount
      createdAtTimestamp
    }
  }
`

export function useHSKSubgraphPools(first: number = 10) {
  return useQuery({
    queryKey: ['hsk-subgraph-pools', first],
    queryFn: async () => {
      console.log('[useHSKSubgraphPools] 开始查询 subgraph...')
      try {
        const data = await querySubgraph(TOP_POOLS_QUERY, { first })
        console.log('[useHSKSubgraphPools] 查询成功，原始 pools 数量:', data.pools?.length)
        const converted = data.pools.map(convertSubgraphPoolToPoolStat)
        console.log('[useHSKSubgraphPools] 转换后的 pools 数量:', converted.length)
        console.log('[useHSKSubgraphPools] 转换后的第一个 pool:', converted[0] ? {
          id: converted[0].id,
          token0: converted[0].token0,
          token1: converted[0].token1,
          totalLiquidity: converted[0].totalLiquidity,
        } : null)
        return converted
      } catch (error) {
        console.error('[useHSKSubgraphPools] 查询失败:', error)
        throw error
      }
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}
