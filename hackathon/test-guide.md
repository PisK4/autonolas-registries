# Agent Registry 测试指南

## 1. 环境准备

### 1.1 启动本地节点
```bash
# 启动本地 hardhat 节点
pnpm hardhat node
```

### 1.2 安装依赖
```bash
# 安装项目依赖
pnpm install
```

## 2. 基础部署和测试

### 2.1 部署合约
```bash
# 部署所有合约
pnpm run deploy:local
```

预期输出:
- 部署 MockToken, MockFactory, MockRouter
- 部署 AgentToken 实现合约
- 部署 ComponentRegistry 和 AgentRegistry
- 设置初始配置参数

### 2.2 创建测试组件
```bash
# 创建测试组件
pnpm run component:create:local
```

预期输出:
- 创建 3 个测试组件
- 每个组件有唯一的 ID 和 Hash

### 2.3 初始化 Mock Token
```bash
# 初始化 Mock Token
pnpm run init:token:local
```

预期输出:
- 铸造 1000 个测试代币
- 显示当前余额

### 2.4 创建 Agent 和 Token
```bash
# 创建 Agent 和对应的 Token
DEPS=1,2,3 NAME=Test SYMBOL=TST pnpm run agent:createBoth:local
```

预期输出:
- 创建 Agent
- 创建提案
- 创建 Token 和流动性池

## 3. 管理功能测试

### 3.1 设置注册费用
```bash
# 设置新的注册费用 (0.2 ETH)
pnpm run setFee:local PARAM1=0.2
```

### 3.2 设置注册模式
```bash
# 切换到管理员模式
pnpm run setMode:local PARAM1=false
```

### 3.3 更新黑名单
```bash
# 添加地址到黑名单
pnpm run blacklist:local PARAM1=0x123... PARAM2=true
```

### 3.4 提取费用
```bash
# 提取已收集的费用
pnpm run withdraw:local
```

## 4. Token 系统测试

### 4.1 设置 Token 系统参数
```bash
# 设置 Token 系统参数
IMPL=<addr> ASSET=<addr> ROUTER=<addr> THRESHOLD=1.0 pnpm run token:setSystem:local 
```
``` bash
IMPL=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 ASSET=0x5FbDB2315678afecb367f032d93F642f64180aa3 ROUTER=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 THRESHOLD=1.0 pnpm run token:setSystem:local
```

### 4.2 设置 Token 默认参数
```bash
# 设置 Token 默认参数 (注意: lpSupply + vaultSupply 必须等于 maxSupply)
MAX_SUPPLY=600000 LP_SUPPLY=500000 VAULT_SUPPLY=100000 MAX_WALLET=10000 MAX_TXN=1000 BOT_PROTECTION=60 VAULT=$VAULT pnpm run token:setParams:local
```

重要说明:
- maxSupply: 总供应量
- lpSupply: 流动性池供应量
- vaultSupply: 金库供应量
- 必须满足: lpSupply + vaultSupply = maxSupply
- 示例: 500000 + 100000 = 600000

## 5. 治理功能测试

### 5.1 更改管理员
```bash
# 更改管理员地址
pnpm run gov:changeManager:local ADDR=<new_manager_address>
```

### 5.2 更改所有者
```bash
# 更改合约所有者
pnpm run gov:changeOwner:local ADDR=<new_owner_address>
```

## 6. 一键测试
```bash
# 执行完整测试流程
pnpm run test:all:local
```

## 7. 故障排除

### 7.1 常见问题

1. 交易失败
- 检查账户余额
- 确认权限设置
- 验证参数值

2. Gas 不足
- 增加 Gas 限制
- 优化交易参数

3. 权限错误
- 确认调用账户
- 检查权限设置

4. SupplyTotalMismatch 错误
- 原因: Token 参数设置中 lpSupply + vaultSupply ≠ maxSupply
- 解决: 确保供应量参数相匹配
- 示例: 如果 maxSupply=600000,则 lpSupply=500000,vaultSupply=100000

### 7.2 调试方法

1. 使用 Hardhat 控制台
```bash
pnpm hardhat console --network localhost
```

2. 查看事件日志
```bash
# 在交易收据中查找事件
const receipt = await tx.wait();
console.log(receipt.events);
```

3. 检查合约状态
```bash
# 查询合约状态
const state = await contract.someState();
console.log(state);
```

## 8. 网络部署

### 8.1 Sepolia 测试网

1. 配置环境变量
```bash
export ALCHEMY_API_KEY_SEPOLIA=your_key
export TESTNET_MNEMONIC=your_mnemonic
```

2. 部署合约
```bash
pnpm run deploy:sepolia
```

3. 验证合约
```bash
pnpm run verify:all:sepolia
```

### 8.2 其他网络

按照相同模式配置其他网络:
1. 在 hardhat.config.ts 中添加网络配置
2. 添加对应的部署和验证命令
3. 设置必要的环境变量 

## 9. 完整测试流程

### 9.1 重启测试环境

1. 停止当前运行的 hardhat node (如果有)
2. 启动新的节点：
```bash
pnpm hardhat node
```

### 9.2 执行完整测试序列

在新的终端窗口中执行以下命令序列：

```bash
# 1. 部署所有合约
pnpm run deploy:local

# 2. 创建测试组件
pnpm run component:create:local

# 3. 初始化 mock token
pnpm run init:token:local

# 4. 设置注册费用 (0.2 ETH)
PARAM1=0.2 pnpm run setFee:local

# 5. 设置注册模式 (Manager Only)
PARAM1=false pnpm run setMode:local

# 6. 更新黑名单
PARAM1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 PARAM2=true pnpm run blacklist:local

# 7. 设置 token 系统参数
# 从 deployment.json 读取地址
ADDRESSES=$(cat hackathon/deployment.json)
IMPL=$(echo $ADDRESSES | jq -r .agentTokenImpl)
ASSET=$(echo $ADDRESSES | jq -r .mockToken)
ROUTER=$(echo $ADDRESSES | jq -r .mockRouter)
IMPL=$IMPL ASSET=$ASSET ROUTER=$ROUTER THRESHOLD=2.0 pnpm run token:setSystem:local

# 8. 设置 token 默认参数
# 从 deployment.json 读取 vault 地址
VAULT=$(echo $ADDRESSES | jq -r .defaultTokenParams.vault)
MAX_SUPPLY=2000000 LP_SUPPLY=1000000 VAULT_SUPPLY=200000 MAX_WALLET=20000 MAX_TXN=2000 BOT_PROTECTION=120 VAULT=$VAULT pnpm run token:setParams:local

# 9. 创建 agent 和 token
# 注意：环境变量需要在命令前设置
DEPS=1,2,3 NAME=Test SYMBOL=TST pnpm run agent:createBoth:local
```

每个命令执行后，请确认输出结果是否符合预期。如果任何步骤失败，请参考前面的故障排除章节。

### 9.3 预期结果

完整测试流程将：
1. 部署所有必要的合约
2. 创建测试组件供后续使用
3. 初始化 mock token 系统
4. 测试所有管理功能
5. 配置 token 系统
6. 创建测试 agent 和对应的 token

如果所有步骤都成功执行，您将拥有一个完整配置的 Agent Registry 系统，可以进行进一步的测试和开发。 

## 10. 命令格式说明

### 10.1 环境变量设置

在执行命令时，有两种设置环境变量的方式：

1. 在命令前设置（推荐）：
```