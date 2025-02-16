# Agent Registry 管理指南

本文档介绍如何使用智能合约管理 Agent Registry。

## 快速开始

1. 启动本地节点:
```bash
pnpm run node
```

2. 部署合约:
```bash
pnpm run deploy:local
```

3. 管理合约:
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

## 详细命令

### 部署命令

- 本地网络部署:
```bash
pnpm run deploy:local
```

- 测试网络部署:
```bash
pnpm run deploy:sepolia
```

### 管理命令

所有管理命令都支持以下网络:
- `local`: 本地开发网络
- `sepolia`: Sepolia 测试网络

#### 设置注册费用

```bash
PARAM1=<amount_in_eth> pnpm run setFee:<network>
```

示例:
```bash
PARAM1=0.2 pnpm run setFee:local
```

#### 切换注册模式

```bash
PARAM1=<true/false> pnpm run setMode:<network>
```

示例:
```bash
PARAM1=false pnpm run setMode:local
```

#### 管理黑名单

```bash
PARAM1=<address> PARAM2=<true/false> pnpm run blacklist:<network>
```

示例:
```bash
PARAM1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 PARAM2=true pnpm run blacklist:local
```

#### 提取费用

```bash
pnpm run withdraw:<network>
```

示例:
```bash
pnpm run withdraw:local
```

## 命令执行模式说明

本项目使用了以下命令执行模式:

1. 基础命令:
   - 使用 pnpm 作为包管理器
   - 使用 hardhat 作为开发框架
   - 使用 cross-env 实现跨平台环境变量

2. 参数传递:
   - 通过环境变量传递命令参数(COMMAND, PARAM1, PARAM2)
   - 使用 -- 分隔符传递 hardhat 参数
   - 每个命令都有本地和测试网两个版本

3. 命令组织:
   - 按功能分类(部署、管理)
   - 按网络分类(local、sepolia)
   - 使用冒号分隔不同层级

4. 执行流程:
   - 设置环境变量
   - 执行基础命令
   - 传递网络参数
   - 脚本处理

## 工作流程

1. 开发/测试流程:
   - 启动本地节点
   - 部署合约
   - 使用管理命令测试功能
   - 检查交易结果

2. 测试网部署流程:
   - 确保有足够的测试网 ETH
   - 部署合约
   - 设置初始参数
   - 验证合约

## 注意事项

1. 确保在运行命令前启动了本地节点
2. 部署信息会保存在 `deployment.json` 文件中
3. 测试网部署需要配置 `.env` 文件中的私钥
4. 所有金额单位都是 ETH
5. 使用 pnpm 作为包管理工具
6. 所有命令需要在项目根目录下执行 