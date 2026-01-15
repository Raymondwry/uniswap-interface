import { useQuery } from '@tanstack/react-query'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { toGraphQLChain } from 'uniswap/src/features/chains/utils'

// 使用代理 URL 避免 CORS 问题
const SUBGRAPH_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? '/hsk-subgraph' // 开发环境：使用 Vite 代理
    : 'https://graphnode-testnet.hashkeychain.net/subgraphs/name/uniswap-v3/hsk-test' // 生产环境：直接请求

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
  totalValueLockedUSD: string
}

interface SubgraphResponse {
  pools: SubgraphPool[]
}

interface PoolForSelector {
  token0: {
    address: string
    symbol: string
    name: string
    decimals: number
  }
  token1: {
    address: string
    symbol: string
    name: string
    decimals: number
  }
}

async function querySubgraph(query: string, variables: Record<string, unknown> = {}) {
  // Debug log
  if (typeof window !== 'undefined') {
    console.log('[useHSKSubgraphPoolsForSelector] Querying Subgraph:', {
      url: SUBGRAPH_URL,
      isLocalhost: window.location.hostname === 'localhost',
      variables,
    })
  }

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[useHSKSubgraphPoolsForSelector] HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
    }

    const data = await response.json()

    if (data.errors) {
      console.error('[useHSKSubgraphPoolsForSelector] GraphQL errors:', data.errors)
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors, null, 2)}`)
    }

    // Debug log
    if (typeof window !== 'undefined') {
      console.log('[useHSKSubgraphPoolsForSelector] Query success:', {
        poolsCount: data.data?.pools?.length ?? 0,
      })
    }

    return data.data as SubgraphResponse
  } catch (error) {
    console.error('[useHSKSubgraphPoolsForSelector] Query failed:', {
      url: SUBGRAPH_URL,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
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
      totalValueLockedUSD
    }
  }
`

function convertSubgraphPoolToPoolForSelector(pool: SubgraphPool): PoolForSelector {
  return {
    token0: {
      address: pool.token0.id,
      symbol: pool.token0.symbol,
      name: pool.token0.name,
      decimals: parseInt(pool.token0.decimals, 10),
    },
    token1: {
      address: pool.token1.id,
      symbol: pool.token1.symbol,
      name: pool.token1.name,
      decimals: parseInt(pool.token1.decimals, 10),
    },
  }
}

/**
 * Hook to fetch pools from HSK Subgraph for Token Selector
 * Returns pools data in a format suitable for extracting tokens
 */
export function useHSKSubgraphPoolsForSelector(first: number = 1000) {
  return useQuery({
    queryKey: ['hsk-subgraph-pools-selector', first],
    queryFn: async () => {
      const data = await querySubgraph(TOP_POOLS_QUERY, { first })
      const pools = data.pools.map(convertSubgraphPoolToPoolForSelector)
      
      // Debug log
      if (typeof window !== 'undefined') {
        console.log('[useHSKSubgraphPoolsForSelector] Converted pools:', {
          originalCount: data.pools.length,
          convertedCount: pools.length,
          samplePool: pools[0] ? {
            token0: pools[0].token0.symbol,
            token1: pools[0].token1.symbol,
          } : null,
        })
      }
      
      return pools
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 2, // Retry 2 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })
}
