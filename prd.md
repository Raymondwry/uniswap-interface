Uniswap V3 前端配池流程与调试指南 (全范围模式)
文档版本: 2.0
适用场景: HashKey Chain (Mainnet & Testnet) V3 流动性添加，强制用户进行全范围 (Full Range) 流动性添加
核心合约: NonfungiblePositionManager
实施状态: ✅ 已完成

## 概述
本文档描述 HashKey Chain 上 Uniswap V3 流动性添加的特殊实现。为简化用户体验和降低风险，HashKey Chain 上的 V3 流动性添加**强制使用全范围模式**，隐藏价格区间选择功能。

### 适用链
- **HashKey Chain Mainnet** (Chain ID: 177)
- **HashKey Chain Testnet** (Chain ID: 133)

### 核心特性
1. 自动强制全范围流动性模式
2. 隐藏价格区间选择 UI
3. 新建池子时需要用户输入初始价格
4. 支持所有 V3 费率等级 (0.01%, 0.05%, 0.3%, 1%)

## 实施细节

### 1. 代码修改文件

#### 1.1 `/apps/web/src/state/mint/v3/utils.ts`
添加全范围模式相关工具函数：
- `FULL_RANGE_TICKS`: 各费率等级的全范围 Tick 常量
- `getFullRangeConfig(feeTier)`: 获取特定费率的全范围配置
- `sortTokens(tokenA, tokenB)`: Token 地址排序
- `isFullRangeModeChain(chainId)`: 判断链是否需要强制全范围模式

#### 1.2 `/apps/web/src/components/Liquidity/Create/RangeSelectionStep.tsx`
修改价格区间选择组件：
- 检测 HashKey Chain，自动启用全范围模式
- 隐藏全范围/自定义范围切换控件
- 隐藏价格区间图表和输入框
- 保留初始价格输入（新建池子时）

### 2. 核心流程图解
在开始写代码前，请确保逻辑遵循以下数据流。这一步最容易出问题的就是 Token 排序 导致的 价格倒置。

```mermaid
graph TD
    Start[用户输入: Token A, Token B, 费率 Fee, 初始价格 P] --> Sort{地址排序 check};
    
    Sort -- Token A < Token B --> Normal[顺序正常: token0=A, token1=B];
    Sort -- Token A > Token B --> Flip[顺序颠倒: token0=B, token1=A];
    
    Normal --> CalcPrice[使用价格 P 计算 sqrtPriceX96];
    Flip --> CalcPriceInvert[使用 1/P 计算 sqrtPriceX96];
    
    CalcPrice --> Ticks[读取全范围 Ticks 常量];
    CalcPriceInvert --> Ticks;
    
    Ticks --> CalcAmount[根据 P 和 输入数量A, 自动计算数量B];
    
    CalcAmount --> Slippage[计算滑点 amountMin (例如 95%)];
    
    Slippage --> Construct[构造 Multicall 数据];
    Construct --> Tx[发送交易 -> PositionManager];
```
2. 关键数据准备 (Step-by-Step)
2.1 Token 排序 (最重要)
Uniswap V3 强制要求 token0 地址必须小于 token1。

TypeScript
const isTokenA0 = tokenA.address.toLowerCase() < tokenB.address.toLowerCase();
const token0 = isTokenA0 ? tokenA : tokenB;
const token1 = isTokenA0 ? tokenB : tokenA;

// 价格处理
const realPrice = isTokenA0 ? userInputPrice : (1 / userInputPrice);
2.2 获取全范围 Ticks (Hardcoded)
不要在运行时动态计算，直接使用根据 tickSpacing 预计算好的“最大整数倍对齐值”，防止 Revert。

费率 (Fee Tier)	Spacing	Min Tick (tickLower)	Max Tick (tickUpper)
0.01% (100)	1	-887272	887272
0.05% (500)	10	-887270	887270
0.3% (3000)	60	-887220	887220
1% (10000)	200	-887200	887200
2.3 初始价格编码
使用 SDK 将人类可读的价格转换为链上格式。

TypeScript
import { encodeSqrtRatioX96 } from '@uniswap/v3-sdk';

// 注意：这里需要处理 Decimals 精度差
// 建议使用 SDK 的 Price 对象或 JSBI 进行预处理
const sqrtPriceX96 = encodeSqrtRatioX96(amount1, amount0); 
3. 合约交互参数构建
我们需要向 NonfungiblePositionManager 发送一个 multicall 交易，包含两步：初始化池子 和 添加流动性。

步骤 A: createAndInitializePoolIfNecessary
如果池子已存在，此步骤会自动跳过（不消耗 Gas），但这保证了你的交易总是安全的。

token0: token0.address

token1: token1.address

fee: 3000 (对应 0.3%)

sqrtPriceX96: (上一步计算的值)

步骤 B: mint (添加流动性)
token0: token0.address

token1: token1.address

fee: 3000

tickLower: (从 2.2 表格中获取的常量)

tickUpper: (从 2.2 表格中获取的常量)

amount0Desired: 用户输入的 token0 数量

amount1Desired: 用户输入的 token1 数量 (全范围模式下，必须两边都存)

amount0Min: amount0Desired * 0.95 (5% 滑点保护，新建池建议放宽一点)

amount1Min: amount1Desired * 0.95

recipient: 用户钱包地址

deadline: Math.floor(Date.now() / 1000) + 60 * 20

4. 调试与排错清单 (Debugging Checklist)
如果你的交易失败 (Revert) 或模拟执行报错，请按以下顺序检查：

🔴 错误 1: Transaction reverted: T / Tick
现象: 提示 Tick 无效或越界。

原因: 传入的 tickLower 或 tickUpper 不是 tickSpacing 的整数倍。

检查: 确认你是否正确读取了表格中的值。例如 0.3% 的池子，千万不要传 -887272，必须传 -887220。

🔴 错误 2: STF / TransferHelper: TRANSFER_FROM_FAILED
现象: 经典的转账失败。

原因: 用户没有授权 (Approve) 代币给 NonfungiblePositionManager。

检查:

检查 Allowance 是否足够。

如果是原生代币 (ETH/BNB)，需检查是否正确转换为了 WETH/WBNB (V3 Manager 只收 ERC20)。

检查用户钱包余额是否足够支付 amountDesired。

🔴 错误 3: 价格极其离谱 (如 1 ETH = 0.0005 USDC)
现象: 池子建成了，但价格是倒过来的。

原因: Token 没有排序。

检查: 打印 token0 和 token1 的地址。如果 token0 是 USDC (地址小) 而 token1 是 ETH (地址大)，你的价格计算公式必须是 1 / 2000 而不是 2000。

🔴 错误 4: Gas Estimation Failed (Gas 预估失败)
原因 A: 池子虽然没显示，但在链上可能已经被别人建了（且价格和你设定的偏差巨大）。

原因 B: amountMin 设置得太高。对于新建池，如果计算精度有微小误差，过高的 min 会导致交易失败。调试时可先设为 0 试试。

5. 工具函数 (Utils)
复制此代码块到你的项目中：

TypeScript
import { FeeAmount } from '@uniswap/v3-sdk'

// 全范围 Tick 常量表
export const FULL_RANGE_TICKS = {
  [FeeAmount.LOWEST]: { min: -887272, max: 887272 },   // 0.01%
  [FeeAmount.LOW]:    { min: -887270, max: 887270 },   // 0.05%
  [FeeAmount.MEDIUM]: { min: -887220, max: 887220 },   // 0.3%
  [FeeAmount.HIGH]:   { min: -887200, max: 887200 },   // 1%
}

/**
 * 获取全范围配置
 * @param feeTier 费率枚举值 (e.g. 3000)
 */
export function getFullRangeConfig(feeTier: FeeAmount) {
    const config = FULL_RANGE_TICKS[feeTier];
    if (!config) {
        throw new Error(`Unsupported fee tier: ${feeTier}`);
    }
    return config;
}

/**
 * 简单的 Token 排序检查
 */
export function sortTokens(tokenA: string, tokenB: string) {
    return tokenA.toLowerCase() < tokenB.toLowerCase() 
        ? [tokenA, tokenB] 
        : [tokenB, tokenA];
}

6. 实施完成说明

本 PRD 已完成代码实施，具体修改如下：

6.1 修改的文件

**核心功能文件：**

1. `/apps/web/src/state/mint/v3/utils.ts`
   - ✅ 添加 FULL_RANGE_TICKS 常量（支持所有费率等级）
   - ✅ 添加 getFullRangeConfig() 工具函数
   - ✅ 添加 sortTokens() Token 地址排序函数
   - ✅ 添加 isFullRangeModeChain() 检测 HashKey Chain 的函数

2. `/apps/web/src/components/Liquidity/Create/RangeSelectionStep.tsx`
   - ✅ 检测当前链是否为 HashKey Chain (ID: 133 或 177)
   - ✅ 自动强制启用全范围模式（设置 fullRange: true）
   - ✅ 隐藏"Set Range"标题和说明
   - ✅ 隐藏全范围/自定义范围切换控件（SegmentedControl）
   - ✅ 隐藏价格区间图表（LiquidityRangeInput / D3LiquidityRangeInput）
   - ✅ 隐藏价格区间输入框（RangeAmountInput）
   - ✅ 保留初始价格输入（新建池子时必需）

3. `/apps/web/src/components/Liquidity/Create/hooks/useLiquidityUrlState.ts`
   - ✅ 修改 `currencyA` parser 的默认值
   - ✅ 从空字符串 `''` 改为 `NATIVE_CHAIN_ID`
   - ✅ 当用户访问 `/positions/create/v3` 时
   - ✅ URL 自动添加 `?currencyA=NATIVE`
   - ✅ HSK 自动被选中为 Token A

4. `/apps/web/src/pages/CreatePosition/CreatePosition.tsx`
   - ✅ 添加 fallback 逻辑确保 tokenA 有值
   - ✅ 使用 `initialInputs.tokenA ?? initialInputs.defaultInitialToken`
   - ✅ 监听 initialInputs 变化并更新 currencyInputs
   - ✅ 确保 HSK 始终作为默认 Token A 显示

**默认链配置文件：**

5. `/packages/uniswap/src/features/chains/utils.ts`
   - ✅ 修改 `getDefaultChainId()` 函数
   - ✅ 测试模式默认链：HashKeyTestnet (133)
   - ✅ 正式模式默认链：HashKey (177)
   - ✅ 不再使用 Ethereum 或 Sepolia 作为默认链

**Token 配置文件：**

6. `/packages/uniswap/src/constants/tokens.ts`
   - ✅ 添加 HashKey Chain 和 HashKey Testnet 的导入
   - ✅ 在 `WRAPPED_NATIVE_CURRENCY` 中添加 WHSK 配置
   - ✅ HashKey Mainnet (177): WHSK at `0xCA8aAceEC5Db1e91B9Ed3a344bA026c4a2B3ebF6`
   - ✅ HashKey Testnet (133): WHSK at `0xCA8aAceEC5Db1e91B9Ed3a344bA026c4a2B3ebF6`
   - ✅ 解决 "Unsupported chain ID" 错误

**实现方式说明：**

本实现采用**修改默认链配置**的方式，而非修改各个页面的链接。这样做的好处：
- ✅ 保持原有的链接形式（`/positions/create/v3`）
- ✅ 所有入口点自动生效，无需逐一修改
- ✅ URL 参数自动带上 HashKey Chain 相关信息
- ✅ 符合系统架构设计，集中管理默认配置

6.2 用户体验

在 HashKey Chain 上添加 V3 流动性时：
1. ✅ 用户选择 Token A 和 Token B
2. ✅ 用户选择费率等级（0.01%, 0.05%, 0.3%, 1%）
3. ✅ 如果是新建池子，用户需要输入初始价格
4. ✅ 系统自动使用全范围模式，无需用户选择价格区间
5. ✅ 用户输入存款数量
6. ✅ 确认并提交交易

6.3 技术要点

- 全范围 Tick 值已预先计算并硬编码，避免运行时计算错误
- Token 自动按地址排序，确保 token0 < token1
- 初始价格会根据 Token 排序自动调整（必要时取倒数）
- 兼容现有的交易 API 和流程，无需额外修改后端逻辑

6.4 环境配置与默认链设置

**测试/开发环境：**
- 默认链：HashKey Testnet (Chain ID: 133)
- Testnet Mode 开启

**生产环境：**
- 默认链：HashKey Mainnet (Chain ID: 177)
- Testnet Mode 关闭

**其他链：**
- 不受影响，保持原有的价格区间选择功能
- 用户可以手动切换到其他链

---

6.5 默认链配置实现

**核心修改：**

在 `/packages/uniswap/src/features/chains/utils.ts` 中修改 `getDefaultChainId()` 函数：

```typescript
function getDefaultChainId({
  platform,
  isTestnetModeEnabled,
}: {
  platform?: Platform
  isTestnetModeEnabled: boolean
}): UniverseChainId {
  if (platform === Platform.SVM) {
    return UniverseChainId.Solana
  }

  // 默认使用 HashKey Chain
  // 开发/测试环境：HashKey Testnet (133)
  // 生产环境：HashKey Mainnet (177)
  return isTestnetModeEnabled ? UniverseChainId.HashKeyTestnet : UniverseChainId.HashKey
}
```

**生效范围：**

所有使用 `useEnabledChains()` hook 的地方都会自动使用 HashKey Chain 作为默认链：
1. ✅ 导航栏 "Pool > Create Position" (`/positions/create/v3`)
2. ✅ Positions 页面的 "New" 按钮
3. ✅ 空状态页面的 "New Position" 按钮
4. ✅ 所有其他创建流动性的入口
5. ✅ URL 自动生成正确的 chain 参数
6. ✅ 默认选择 HSK 原生代币

**URL 效果：**

用户访问 `/positions/create/v3` 时：
- 测试环境自动应用：`chain=hashkey_testnet`, `currencyA=NATIVE`
- 生产环境自动应用：`chain=hashkey`, `currencyA=NATIVE`

**环境切换方式：**

通过应用的 Testnet Mode 开关控制：
- Testnet Mode ON → HashKey Testnet (133)
- Testnet Mode OFF → HashKey Mainnet (177)