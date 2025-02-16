// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./UnitRegistry.sol";
import "./interfaces/IRegistry.sol";
import "./pool/IUniswapV2Factory.sol";
import "./pool/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Agent Registry - Smart contract for registering agents
/// @author Aleksandr Kuperman - <aleksandr.kuperman@valory.xyz>
contract AgentRegistry is UnitRegistry {
    using SafeERC20 for IERC20;

    event RegistrationModeUpdated(bool isOpen);
    event RegistrationFeeUpdated(uint256 newFee);
    event BlacklistUpdated(address account, bool isBlacklisted);
    event FeesWithdrawn(uint256 amount);
    event AgentProposed(uint256 agentId, uint256 proposalId);
    event ProposalExecuted(uint256 proposalId);
    event TokenCreated(uint256 proposalId, address token, address liquidityPool);

    // Component registry
    address public immutable componentRegistry;
    // Agent registry version number
    string public constant VERSION = "2.0.0";
    // Registration fee
    uint256 public registrationFee;
    // Registration mode (true = open registration, false = manager only)
    bool public isOpenRegistration;
    // Blacklisted addresses
    mapping(address => bool) public blacklist;

    // Token system
    address public tokenImplementation;
    address public assetToken;
    address public uniswapRouter;
    uint256 public applicationThreshold;
    
    // Token parameters
    struct TokenParams {
        uint256 maxSupply;
        uint256 lpSupply;
        uint256 vaultSupply;
        uint256 maxTokensPerWallet;
        uint256 maxTokensPerTxn;
        uint256 botProtectionDurationInSeconds;
        address vault;
    }
    TokenParams public defaultTokenParams;

    // Application status enum
    enum ApplicationStatus {
        None,
        Pending,
        Executed,
        Withdrawn
    }

    // Application struct
    struct Application {
        uint256 agentId;
        address proposer;
        string name;
        string symbol;
        ApplicationStatus status;
        uint256 timestamp;
        address token;
        address liquidityPool;
        uint256 withdrawableAmount;
        uint256[] cores;
    }

    // Application counter
    uint256 private _nextApplicationId;
    // Mapping from application ID to application
    mapping(uint256 => Application) public applications;
    // Mapping from agent ID to application ID
    mapping(uint256 => uint256) public agentApplications;

    /// @dev Agent registry constructor.
    /// @param _name Agent registry contract name.
    /// @param _symbol Agent registry contract symbol.
    /// @param _baseURI Agent registry token base URI.
    /// @param _componentRegistry Component registry address.
    constructor(string memory _name, string memory _symbol, string memory _baseURI, address _componentRegistry)
        UnitRegistry(UnitType.Agent)
        ERC721(_name, _symbol)
    {
        baseURI = _baseURI;
        componentRegistry = _componentRegistry;
        owner = msg.sender;
        isOpenRegistration = true; // Default to open registration
    }

    /// @dev Sets the token system parameters.
    /// @param _tokenImplementation Token implementation contract address.
    /// @param _assetToken Base asset token address.
    /// @param _uniswapRouter Uniswap router address.
    /// @param _applicationThreshold Minimum amount of asset tokens required for proposal.
    function setTokenSystem(
        address _tokenImplementation,
        address _assetToken,
        address _uniswapRouter,
        uint256 _applicationThreshold
    ) external {
        if (msg.sender != owner) {
            revert OwnerOnly(msg.sender, owner);
        }
        tokenImplementation = _tokenImplementation;
        assetToken = _assetToken;
        uniswapRouter = _uniswapRouter;
        applicationThreshold = _applicationThreshold;
    }

    /// @dev Sets the default token parameters.
    /// @param params Token parameters struct.
    function setDefaultTokenParams(TokenParams memory params) external {
        if (msg.sender != owner) {
            revert OwnerOnly(msg.sender, owner);
        }
        defaultTokenParams = params;
    }

    /// @dev Sets the registration fee.
    /// @param newFee New registration fee.
    function setRegistrationFee(uint256 newFee) external {
        if (msg.sender != owner) {
            revert OwnerOnly(msg.sender, owner);
        }
        registrationFee = newFee;
        emit RegistrationFeeUpdated(newFee);
    }

    /// @dev Sets the registration mode.
    /// @param isOpen True for open registration, false for manager only.
    function setRegistrationMode(bool isOpen) external {
        if (msg.sender != owner) {
            revert OwnerOnly(msg.sender, owner);
        }
        isOpenRegistration = isOpen;
        emit RegistrationModeUpdated(isOpen);
    }

    /// @dev Updates blacklist status for an address.
    /// @param account Address to update.
    /// @param isBlacklisted True to blacklist, false to remove from blacklist.
    function updateBlacklist(address account, bool isBlacklisted) external {
        if (msg.sender != owner) {
            revert OwnerOnly(msg.sender, owner);
        }
        blacklist[account] = isBlacklisted;
        emit BlacklistUpdated(account, isBlacklisted);
    }

    /// @dev Withdraws collected fees.
    function withdrawFees() external {
        if (msg.sender != owner) {
            revert OwnerOnly(msg.sender, owner);
        }
        uint256 amount = address(this).balance;
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Fee withdrawal failed");
        emit FeesWithdrawn(amount);
    }

    /// @dev Checks provided component dependencies.
    /// @param dependencies Set of component dependencies.
    function _checkDependencies(uint32[] memory dependencies, uint32) internal virtual override {
        // Check that the agent has at least one component
        if (dependencies.length == 0) {
            revert ZeroValue();
        }

        // Get the components total supply
        uint32 componentTotalSupply = uint32(IRegistry(componentRegistry).totalSupply());
        uint32 lastId;
        for (uint256 iDep = 0; iDep < dependencies.length; ++iDep) {
            if (dependencies[iDep] < (lastId + 1) || dependencies[iDep] > componentTotalSupply) {
                revert ComponentNotFound(dependencies[iDep]);
            }
            lastId = dependencies[iDep];
        }
    }

    /// @dev Creates a new agent.
    /// @param unitOwner Owner of the agent.
    /// @param unitHash IPFS hash of the agent.
    /// @param dependencies Set of component dependencies.
    /// @return unitId The id of the created agent.
    function create(address unitOwner, bytes32 unitHash, uint32[] memory dependencies)
        public virtual override payable returns (uint256 unitId)
    {
        // Check registration mode and requirements
        if (isOpenRegistration) {
            // Open registration mode
            require(msg.value >= registrationFee, "Insufficient registration fee");
            require(!blacklist[msg.sender], "Address is blacklisted");
        } else {
            // Manager only mode
            if (msg.sender != manager) {
                revert ManagerOnly(msg.sender, manager);
            }
        }

        // Call parent create function
        return super.create(unitOwner, unitHash, dependencies);
    }

    /// @dev Proposes an agent for extended functionality.
    /// @param agentId The ID of the existing agent NFT.
    /// @param name The name for the agent token.
    /// @param symbol The symbol for the agent token.
    /// @return applicationId The ID of the created application.
    function proposeAgent(
        uint256 agentId,
        string memory name,
        string memory symbol
    ) external returns (uint256 applicationId) {
        // Check that the agent exists and caller is the owner
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        
        // Check that the agent hasn't been proposed yet
        require(agentApplications[agentId] == 0, "Agent already proposed");

        // Check asset token requirements
        require(
            IERC20(assetToken).balanceOf(msg.sender) >= applicationThreshold,
            "Insufficient asset token"
        );
        require(
            IERC20(assetToken).allowance(msg.sender, address(this)) >= applicationThreshold,
            "Insufficient asset token allowance"
        );

        // Transfer asset tokens for liquidity
        IERC20(assetToken).safeTransferFrom(msg.sender, address(this), applicationThreshold);

        // Create new application
        applicationId = ++_nextApplicationId;
        
        Application storage application = applications[applicationId];
        application.agentId = agentId;
        application.proposer = msg.sender;
        application.name = name;
        application.symbol = symbol;
        application.status = ApplicationStatus.Pending;
        application.timestamp = block.timestamp;
        application.withdrawableAmount = applicationThreshold;

        // Link application to agent
        agentApplications[agentId] = applicationId;

        emit AgentProposed(agentId, applicationId);
    }

    /// @dev Gets the application for an agent.
    /// @param agentId The ID of the agent.
    /// @return application The application details.
    function getAgentApplication(uint256 agentId) external view returns (Application memory application) {
        uint256 applicationId = agentApplications[agentId];
        if (applicationId > 0) {
            application = applications[applicationId];
        }
    }

    /// @dev Executes an application to create token and liquidity pool.
    /// @param applicationId The ID of the application to execute.
    function executeApplication(uint256 applicationId) external {
        Application storage application = applications[applicationId];
        
        // Check application exists and is pending
        require(application.status == ApplicationStatus.Pending, "Invalid application status");
        
        // Check caller is proposer
        require(application.proposer == msg.sender, "Not proposer");
        
        // Check token system is configured
        require(tokenImplementation != address(0), "Token system not configured");
        require(assetToken != address(0), "Asset token not configured");
        require(uniswapRouter != address(0), "Router not configured");

        // Create token
        address token = _createToken(application.name, application.symbol);
        application.token = token;
        
        // Create and configure liquidity pool
        address liquidityPool = _createLiquidityPool(token);
        application.liquidityPool = liquidityPool;

        // Add initial liquidity
        IERC20(token).approve(uniswapRouter, type(uint256).max);
        IERC20(assetToken).approve(uniswapRouter, type(uint256).max);

        // Get token balances for liquidity
        uint256 tokenAmount = IERC20(token).balanceOf(address(this));
        uint256 assetAmount = application.withdrawableAmount;

        // Add liquidity to the pool
        IUniswapV2Router02(uniswapRouter).addLiquidity(
            token,
            assetToken,
            tokenAmount,
            assetAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of asset tokens
            address(this),
            block.timestamp
        );
        
        // Update application status
        application.status = ApplicationStatus.Executed;
        application.withdrawableAmount = 0;

        emit ProposalExecuted(applicationId);
        emit TokenCreated(applicationId, token, liquidityPool);
    }

    /// @dev Allows proposer to withdraw their asset tokens if application is still pending
    /// @param applicationId The ID of the application
    function withdraw(uint256 applicationId) external {
        Application storage application = applications[applicationId];
        
        require(application.status == ApplicationStatus.Pending, "Application not pending");
        require(application.proposer == msg.sender, "Not proposer");
        require(application.withdrawableAmount > 0, "No funds to withdraw");

        uint256 amount = application.withdrawableAmount;
        application.withdrawableAmount = 0;
        application.status = ApplicationStatus.Withdrawn;

        IERC20(assetToken).safeTransfer(application.proposer, amount);
    }

    /// @dev Creates a new token contract.
    /// @param name Token name.
    /// @param symbol Token symbol.
    /// @return instance The address of the created token contract.
    function _createToken(string memory name, string memory symbol) internal returns (address instance) {
        instance = Clones.clone(tokenImplementation);
        // Initialize token with default parameters
        // Note: This requires the token contract to have a specific initialize function
        // that matches our parameter structure
        bytes memory initData = abi.encode(
            name,
            symbol,
            defaultTokenParams.maxSupply,
            defaultTokenParams.lpSupply,
            defaultTokenParams.vaultSupply,
            defaultTokenParams.maxTokensPerWallet,
            defaultTokenParams.maxTokensPerTxn,
            defaultTokenParams.botProtectionDurationInSeconds,
            defaultTokenParams.vault
        );
        (bool success, ) = instance.call(abi.encodeWithSignature("initialize(bytes)", initData));
        require(success, "Token initialization failed");
        return instance;
    }

    /// @dev Creates a liquidity pool for a token.
    /// @param token Token address.
    /// @return liquidityPool The address of the created liquidity pool.
    function _createLiquidityPool(address token) internal returns (address liquidityPool) {
        IUniswapV2Factory factory = IUniswapV2Factory(
            IUniswapV2Router02(uniswapRouter).factory()
        );
        
        require(
            factory.getPair(token, assetToken) == address(0),
            "Pool already exists"
        );

        liquidityPool = factory.createPair(token, assetToken);
        return liquidityPool;
    }

    /// @dev Gets linearized set of subcomponents of a provided unit Id and a type of a component.
    /// @notice (0) For components this means getting the linearized map of components from the componentRegistry contract.
    /// @notice (1) For agents this means getting the linearized map of components from the local map of subcomponents.
    /// @param subcomponentsFromType Type of the unit: component or agent.
    /// @param unitId Component Id.
    /// @return subComponentIds Set of subcomponents.
    function _getSubComponents(UnitType subcomponentsFromType, uint32 unitId) internal view virtual override
        returns (uint32[] memory subComponentIds)
    {
        // Self contract (agent registry) can only call subcomponents calculation from the component level (0)
        // Otherwise, the subcomponents are already written into the corresponding subcomponents map
        if (subcomponentsFromType == UnitType.Component) {
            (subComponentIds, ) = IRegistry(componentRegistry).getLocalSubComponents(uint256(unitId));
        } else {
            subComponentIds = mapSubComponents[uint256(unitId)];
        }
    }

    /// @dev Calculates the set of subcomponent Ids.
    /// @notice We assume that the external callers calculate subcomponents from the higher unit hierarchy level: agents.
    /// @param unitIds Unit Ids.
    /// @return subComponentIds Subcomponent Ids.
    function calculateSubComponents(uint32[] memory unitIds) external view returns (uint32[] memory subComponentIds)
    {
        subComponentIds = _calculateSubComponents(UnitType.Agent, unitIds);
    }
}
