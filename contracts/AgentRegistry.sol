// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./UnitRegistry.sol";
import "./interfaces/IRegistry.sol";

/// @title Agent Registry - Smart contract for registering agents
/// @author Aleksandr Kuperman - <aleksandr.kuperman@valory.xyz>
contract AgentRegistry is UnitRegistry {
    event RegistrationModeUpdated(bool isOpen);
    event RegistrationFeeUpdated(uint256 newFee);
    event BlacklistUpdated(address account, bool isBlacklisted);
    event FeesWithdrawn(uint256 amount);

    // Component registry
    address public immutable componentRegistry;
    // Agent registry version number
    string public constant VERSION = "1.0.0";
    // Registration fee
    uint256 public registrationFee;
    // Registration mode (true = open registration, false = manager only)
    bool public isOpenRegistration;
    // Blacklisted addresses
    mapping(address => bool) public blacklist;

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
