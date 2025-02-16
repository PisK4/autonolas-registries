# Agent Registry 管理指南

## 概述

Agent Registry 是一个智能合约系统，允许开发者注册他们的 AI agents。该系统通过基于费用的注册机制提供安全透明的注册方式，同时维护质量控制。

## 快速开始

1. 启动本地节点:
```bash
pnpm run node
```

2. 部署合约:
```bash
pnpm run deploy:local
```

3. 基础管理命令:
```bash
# 设置注册费用
PARAM1=0.2 pnpm run setFee:local

# 切换注册模式
PARAM1=false pnpm run setMode:local

# 管理黑名单
PARAM1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 PARAM2=true pnpm run blacklist:local

# 提取费用
pnpm run withdraw:local
```

4. Token系统管理:
```bash
# 设置Token系统参数
IMPL=0x123... ASSET=0x456... ROUTER=0x789... THRESHOLD=1.0 pnpm run token:setSystem:local

# 设置Token默认参数
MAX_SUPPLY=1000000 LP_SUPPLY=500000 VAULT_SUPPLY=100000 MAX_WALLET=10000 MAX_TXN=1000 BOT_PROTECTION=60 VAULT=0xabc... pnpm run token:setParams:local
```

5. 治理命令:
```bash
# 更改管理员
ADDR=0x123... pnpm run gov:changeManager:local

# 转移所有权
ADDR=0x456... pnpm run gov:transferOwner:local
```

## 详细命令说明

### 部署命令

- 本地网络部署:
```bash
pnpm run deploy:local
```

- 测试网络部署:
```bash
pnpm run deploy:sepolia
```

### 基础管理命令

所有管理命令都支持以下网络:
- `local`: 本地开发网络
- `sepolia`: Sepolia 测试网络

#### 设置注册费用
```bash
PARAM1=<amount_in_eth> pnpm run setFee:<network>
```

#### 切换注册模式
```bash
PARAM1=<true/false> pnpm run setMode:<network>
```

#### 管理黑名单
```bash
PARAM1=<address> PARAM2=<true/false> pnpm run blacklist:<network>
```

#### 提取费用
```bash
pnpm run withdraw:<network>
```

### Token系统管理

#### 设置Token系统参数
```bash
IMPL=<token_impl_addr> ASSET=<asset_token_addr> ROUTER=<router_addr> THRESHOLD=<amount> pnpm run token:setSystem:<network>
```

参数说明:
- `IMPL`: Token实现合约地址
- `ASSET`: 基础资产Token地址
- `ROUTER`: Uniswap路由器地址
- `THRESHOLD`: 申请阈值(ETH)

#### 设置Token默认参数
```bash
MAX_SUPPLY=<amount> LP_SUPPLY=<amount> VAULT_SUPPLY=<amount> MAX_WALLET=<amount> MAX_TXN=<amount> BOT_PROTECTION=<seconds> VAULT=<addr> pnpm run token:setParams:<network>
```

参数说明:
- `MAX_SUPPLY`: 最大供应量(ETH)
- `LP_SUPPLY`: 流动性池供应量(ETH)
- `VAULT_SUPPLY`: 金库供应量(ETH)
- `MAX_WALLET`: 每个钱包最大持有量(ETH)
- `MAX_TXN`: 每笔交易最大数量(ETH)
- `BOT_PROTECTION`: 机器人保护时间(秒)
- `VAULT`: 金库地址

### 治理命令

#### 更改管理员
```bash
ADDR=<new_manager_address> pnpm run gov:changeManager:<network>
```

#### 更改所有者
```bash
ADDR=<new_owner_address> pnpm run gov:changeOwner:<network>
```

## 最佳实践

### 合约部署
1. 确保在运行命令前启动了本地节点
2. 部署信息会保存在 `deployment.json` 文件中
3. 测试网部署需要配置 `.env` 文件中的私钥
4. 所有金额单位都是 ETH

### Token系统配置
1. 设置合理的供应量参数
2. 配置适当的交易限制
3. 设置足够的机器人保护时间
4. 使用安全的金库地址

### 治理操作
1. 谨慎进行管理员更改
2. 所有权转移需要双重确认
3. 保持权限管理的透明度
4. 定期检查权限设置

## 安全考虑

1. 权限管理
   - 严格控制管理员权限
   - 定期轮换关键角色
   - 实施多重签名机制
   - 监控权限变更

2. 参数设置
   - 仔细验证所有参数
   - 使用安全的阈值
   - 避免极端参数值
   - 定期检查参数有效性

3. 资金安全
   - 实施提现限制
   - 定期审计资金流向
   - 使用安全的金库
   - 多重签名保护

## 常见问题解决

1. 部署问题
   - 检查网络连接
   - 验证账户余额
   - 确认合约参数
   - 检查Gas设置

2. 权限问题
   - 验证调用者权限
   - 检查角色设置
   - 确认交易签名
   - 检查权限链

3. Token系统问题
   - 验证参数配置
   - 检查合约权限
   - 确认网络连接
   - 监控交易活动

## 技术支持

如需技术支持，请通过以下渠道联系：
- GitHub Issues: [Repository URL]
- Discord: [Discord Channel]
- Email: [Support Email] 