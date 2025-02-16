# Agent Registry Management Guide

## Overview

The Agent Registry is a smart contract system that allows developers to register their AI agents. The system provides a secure and transparent registration process while maintaining quality control through a fee-based registration mechanism.

## Quick Start

1. Start local node:
```bash
pnpm run node
```

2. Deploy contracts:
```bash
pnpm run deploy:local
```

3. Basic management commands:
```bash
# Set registration fee
PARAM1=0.2 pnpm run setFee:local

# Switch registration mode
PARAM1=false pnpm run setMode:local

# Manage blacklist
PARAM1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 PARAM2=true pnpm run blacklist:local

# Withdraw fees
pnpm run withdraw:local
```

4. Token system management:
```bash
# Set Token system parameters
IMPL=0x123... ASSET=0x456... ROUTER=0x789... THRESHOLD=1.0 pnpm run token:setSystem:local

# Set Token default parameters
MAX_SUPPLY=1000000 LP_SUPPLY=500000 VAULT_SUPPLY=100000 MAX_WALLET=10000 MAX_TXN=1000 BOT_PROTECTION=60 VAULT=0xabc... pnpm run token:setParams:local
```

5. Governance commands:
```bash
# Change manager
ADDR=0x123... pnpm run gov:changeManager:local

# Transfer ownership
ADDR=0x456... pnpm run gov:transferOwner:local
```

## Detailed Command Reference

### Deployment Commands

- Local network deployment:
```bash
pnpm run deploy:local
```

- Test network deployment:
```bash
pnpm run deploy:sepolia
```

### Basic Management Commands

All management commands support the following networks:
- `local`: Local development network
- `sepolia`: Sepolia test network

#### Set Registration Fee
```bash
PARAM1=<amount_in_eth> pnpm run setFee:<network>
```

#### Switch Registration Mode
```bash
PARAM1=<true/false> pnpm run setMode:<network>
```

#### Manage Blacklist
```bash
PARAM1=<address> PARAM2=<true/false> pnpm run blacklist:<network>
```

#### Withdraw Fees
```bash
pnpm run withdraw:<network>
```

### Token System Management

#### Set Token System Parameters
```bash
IMPL=<token_impl_addr> ASSET=<asset_token_addr> ROUTER=<router_addr> THRESHOLD=<amount> pnpm run token:setSystem:<network>
```

Parameters:
- `IMPL`: Token implementation contract address
- `ASSET`: Base asset token address
- `ROUTER`: Uniswap router address
- `THRESHOLD`: Application threshold (ETH)

#### Set Token Default Parameters
```bash
MAX_SUPPLY=<amount> LP_SUPPLY=<amount> VAULT_SUPPLY=<amount> MAX_WALLET=<amount> MAX_TXN=<amount> BOT_PROTECTION=<seconds> VAULT=<addr> pnpm run token:setParams:<network>
```

Parameters:
- `MAX_SUPPLY`: Maximum supply (ETH)
- `LP_SUPPLY`: Liquidity pool supply (ETH)
- `VAULT_SUPPLY`: Vault supply (ETH)
- `MAX_WALLET`: Maximum tokens per wallet (ETH)
- `MAX_TXN`: Maximum tokens per transaction (ETH)
- `BOT_PROTECTION`: Bot protection duration (seconds)
- `VAULT`: Vault address

### Governance Commands

#### Change Manager
```bash
ADDR=<new_manager_address> pnpm run gov:changeManager:<network>
```

#### Change Owner
```bash
ADDR=<new_owner_address> pnpm run gov:changeOwner:<network>
```

## Best Practices

### Contract Deployment
1. Ensure local node is running before executing commands
2. Deployment information is saved in `deployment.json`
3. Test network deployment requires private key configuration in `.env` file
4. All amounts are in ETH

### Token System Configuration
1. Set reasonable supply parameters
2. Configure appropriate transaction limits
3. Set adequate bot protection duration
4. Use secure vault addresses

### Governance Operations
1. Exercise caution when changing manager
2. Ownership transfers require double confirmation
3. Maintain transparency in permission management
4. Regular permission audits

## Security Considerations

1. Permission Management
   - Strict control of admin privileges
   - Regular rotation of key roles
   - Implementation of multi-signature mechanisms
   - Monitoring of permission changes

2. Parameter Settings
   - Careful validation of all parameters
   - Use of secure thresholds
   - Avoidance of extreme parameter values
   - Regular parameter validity checks

3. Fund Security
   - Implementation of withdrawal limits
   - Regular auditing of fund flows
   - Use of secure vaults
   - Multi-signature protection

## Troubleshooting

1. Deployment Issues
   - Check network connectivity
   - Verify account balance
   - Confirm contract parameters
   - Check Gas settings

2. Permission Issues
   - Verify caller permissions
   - Check role settings
   - Confirm transaction signatures
   - Check permission chain

3. Token System Issues
   - Validate parameter configuration
   - Check contract permissions
   - Confirm network connectivity
   - Monitor transaction activity

## Technical Support

For technical support, please contact through:
- GitHub Issues: [Repository URL]
- Discord: [Discord Channel]
- Email: [Support Email] 