/*global describe, beforeEach, it*/

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentRegistry V2", function () {
    let componentRegistry;
    let agentRegistry;
    let owner;
    let manager;
    let user1;
    let user2;
    let mockTokenImplementation;
    let mockAssetToken;
    let mockRouter;
    const componentHash = "0x" + "5".repeat(64);
    const agentHash = "0x" + "9".repeat(64);
    const registrationFee = ethers.utils.parseEther("0.1"); // 0.1 ETH
    const applicationThreshold = ethers.utils.parseEther("1.0"); // 1.0 ETH

    beforeEach(async function () {
        [owner, manager, user1, user2] = await ethers.getSigners();

        // Deploy mock contracts
        const MockToken = await ethers.getContractFactory("MockToken");
        mockTokenImplementation = await MockToken.deploy();
        await mockTokenImplementation.deployed();

        mockAssetToken = await MockToken.deploy();
        await mockAssetToken.deployed();

        const MockRouter = await ethers.getContractFactory("MockRouter");
        mockRouter = await MockRouter.deploy();
        await mockRouter.deployed();

        const ComponentRegistry = await ethers.getContractFactory("ComponentRegistry");
        componentRegistry = await ComponentRegistry.deploy("agent components", "MECHCOMP",
            "https://localhost/component/");
        await componentRegistry.deployed();

        const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
        agentRegistry = await AgentRegistry.deploy("agent", "MECH", "https://localhost/agent/",
            componentRegistry.address);
        await agentRegistry.deployed();

        // Setup initial state
        await componentRegistry.changeManager(manager.address);
        await componentRegistry.connect(manager).create(user1.address, componentHash, []);
        await agentRegistry.setRegistrationFee(registrationFee);

        // Setup token system
        await agentRegistry.setTokenSystem(
            mockTokenImplementation.address,
            mockAssetToken.address,
            mockRouter.address,
            applicationThreshold
        );

        // Setup default token parameters
        const defaultTokenParams = {
            maxSupply: ethers.utils.parseEther("1000000"),
            lpSupply: ethers.utils.parseEther("500000"),
            vaultSupply: ethers.utils.parseEther("100000"),
            maxTokensPerWallet: ethers.utils.parseEther("10000"),
            maxTokensPerTxn: ethers.utils.parseEther("1000"),
            botProtectionDurationInSeconds: 60,
            vault: owner.address
        };
        await agentRegistry.setDefaultTokenParams(defaultTokenParams);
    });

    describe("Registration Mode Management", function () {
        it("Should allow owner to switch registration modes", async function () {
            expect(await agentRegistry.isOpenRegistration()).to.be.true;
            
            await agentRegistry.setRegistrationMode(false);
            expect(await agentRegistry.isOpenRegistration()).to.be.false;
            
            await agentRegistry.setRegistrationMode(true);
            expect(await agentRegistry.isOpenRegistration()).to.be.true;
        });

        it("Should not allow non-owner to switch registration modes", async function () {
            await expect(
                agentRegistry.connect(user1).setRegistrationMode(false)
            ).to.be.revertedWithCustomError(agentRegistry, "OwnerOnly");
        });
    });

    describe("Registration Fee Management", function () {
        it("Should allow owner to set registration fee", async function () {
            const newFee = ethers.utils.parseEther("0.2");
            await agentRegistry.setRegistrationFee(newFee);
            expect(await agentRegistry.registrationFee()).to.equal(newFee);
        });

        it("Should not allow non-owner to set registration fee", async function () {
            const newFee = ethers.utils.parseEther("0.2");
            await expect(
                agentRegistry.connect(user1).setRegistrationFee(newFee)
            ).to.be.revertedWithCustomError(agentRegistry, "OwnerOnly");
        });

        it("Should allow owner to withdraw fees", async function () {
            // First register an agent to collect some fees
            await agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                value: registrationFee
            });

            const initialBalance = await owner.getBalance();
            const tx = await agentRegistry.withdrawFees();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
            
            const finalBalance = await owner.getBalance();
            expect(finalBalance.sub(initialBalance)).to.equal(registrationFee.sub(gasUsed));
        });
    });

    describe("Blacklist Management", function () {
        it("Should allow owner to blacklist and unblacklist addresses", async function () {
            await agentRegistry.updateBlacklist(user1.address, true);
            expect(await agentRegistry.blacklist(user1.address)).to.be.true;

            await agentRegistry.updateBlacklist(user1.address, false);
            expect(await agentRegistry.blacklist(user1.address)).to.be.false;
        });

        it("Should not allow blacklisted address to register", async function () {
            await agentRegistry.updateBlacklist(user1.address, true);
            
            await expect(
                agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                    value: registrationFee
                })
            ).to.be.revertedWith("Address is blacklisted");
        });
    });

    describe("Open Registration", function () {
        it("Should allow anyone to register with sufficient fee", async function () {
            const tx = await agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                value: registrationFee
            });
            const receipt = await tx.wait();
            const createEvent = receipt.events.find(e => e.event === "CreateUnit");
            expect(createEvent).to.not.be.undefined;
            expect(createEvent.args.unitId).to.equal(1);
        });

        it("Should not allow registration with insufficient fee", async function () {
            const insufficientFee = registrationFee.div(2);
            await expect(
                agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                    value: insufficientFee
                })
            ).to.be.revertedWith("Insufficient registration fee");
        });
    });

    describe("Manager-only Registration", function () {
        beforeEach(async function () {
            await agentRegistry.setRegistrationMode(false);
            await agentRegistry.changeManager(manager.address);
        });

        it("Should allow manager to register without fee", async function () {
            const tx = await agentRegistry.connect(manager).create(user1.address, agentHash, [1]);
            const receipt = await tx.wait();
            const createEvent = receipt.events.find(e => e.event === "CreateUnit");
            expect(createEvent).to.not.be.undefined;
            expect(createEvent.args.unitId).to.equal(1);
        });

        it("Should not allow non-manager to register", async function () {
            await expect(
                agentRegistry.connect(user1).create(user1.address, agentHash, [1])
            ).to.be.revertedWithCustomError(agentRegistry, "ManagerOnly");
        });
    });

    describe("Complex Scenarios", function () {
        beforeEach(async function () {
            // Create multiple components
            for(let i = 0; i < 3; i++) {
                const componentHash = ethers.utils.keccak256(
                    ethers.utils.defaultAbiCoder.encode(
                        ["uint256", "string"],
                        [i, "component"]
                    )
                );
                await componentRegistry.connect(manager).create(user1.address, componentHash, []);
            }
        });

        it("Should handle multiple agent registrations with different dependencies", async function () {
            // Register first agent with component 1
            await agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                value: registrationFee
            });

            // Register second agent with components 1,2
            await agentRegistry.connect(user2).create(user2.address, agentHash, [1,2], {
                value: registrationFee
            });

            // Register third agent with components 1,2,3
            await agentRegistry.connect(user1).create(user1.address, agentHash, [1,2,3], {
                value: registrationFee
            });

            // Verify all registrations
            expect((await agentRegistry.getUnit(1)).dependencies.length).to.equal(1);
            expect((await agentRegistry.getUnit(2)).dependencies.length).to.equal(2);
            expect((await agentRegistry.getUnit(3)).dependencies.length).to.equal(3);
        });

        it("Should handle registration mode switching with pending fees", async function () {
            // Register in open mode
            await agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                value: registrationFee
            });

            // Switch to manager mode
            await agentRegistry.setRegistrationMode(false);
            await agentRegistry.changeManager(manager.address);

            // Register as manager
            await agentRegistry.connect(manager).create(user2.address, agentHash, [1]);

            // Switch back to open mode
            await agentRegistry.setRegistrationMode(true);

            // Register in open mode again
            await agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                value: registrationFee
            });

            // Verify fees collected
            const contractBalance = await ethers.provider.getBalance(agentRegistry.address);
            expect(contractBalance).to.equal(registrationFee.mul(2)); // Two paid registrations
        });

        it("Should handle blacklist edge cases", async function () {
            // Blacklist after successful registration
            await agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                value: registrationFee
            });
            await agentRegistry.updateBlacklist(user1.address, true);

            // Try to register again while blacklisted
            await expect(
                agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                    value: registrationFee
                })
            ).to.be.revertedWith("Address is blacklisted");

            // Unblacklist and register again
            await agentRegistry.updateBlacklist(user1.address, false);
            await agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                value: registrationFee
            });
        });

        it("Should handle fee changes correctly", async function () {
            // Register with initial fee
            await agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                value: registrationFee
            });

            // Increase fee
            const newFee = registrationFee.mul(2);
            await agentRegistry.setRegistrationFee(newFee);

            // Try to register with old fee
            await expect(
                agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                    value: registrationFee
                })
            ).to.be.revertedWith("Insufficient registration fee");

            // Register with new fee
            await agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                value: newFee
            });
        });

        it("Should handle component dependency validation correctly", async function () {
            // Try to register with non-existent component
            await expect(
                agentRegistry.connect(user1).create(user1.address, agentHash, [5], {
                    value: registrationFee
                })
            ).to.be.revertedWithCustomError(agentRegistry, "ComponentNotFound");

            // Try to register with duplicate components
            await expect(
                agentRegistry.connect(user1).create(user1.address, agentHash, [1,1], {
                    value: registrationFee
                })
            ).to.be.revertedWithCustomError(agentRegistry, "ComponentNotFound");

            // Try to register with unsorted components
            await expect(
                agentRegistry.connect(user1).create(user1.address, agentHash, [2,1], {
                    value: registrationFee
                })
            ).to.be.revertedWithCustomError(agentRegistry, "ComponentNotFound");
        });
    });

    describe("Token System Configuration", function () {
        it("Should allow owner to set token system parameters", async function () {
            const newTokenImpl = mockTokenImplementation.address;
            const newAssetToken = mockAssetToken.address;
            const newRouter = mockRouter.address;
            const newThreshold = ethers.utils.parseEther("2.0");

            await agentRegistry.setTokenSystem(newTokenImpl, newAssetToken, newRouter, newThreshold);

            expect(await agentRegistry.tokenImplementation()).to.equal(newTokenImpl);
            expect(await agentRegistry.assetToken()).to.equal(newAssetToken);
            expect(await agentRegistry.uniswapRouter()).to.equal(newRouter);
            expect(await agentRegistry.applicationThreshold()).to.equal(newThreshold);
        });

        it("Should not allow non-owner to set token system parameters", async function () {
            await expect(
                agentRegistry.connect(user1).setTokenSystem(
                    mockTokenImplementation.address,
                    mockAssetToken.address,
                    mockRouter.address,
                    applicationThreshold
                )
            ).to.be.revertedWithCustomError(agentRegistry, "OwnerOnly");
        });

        it("Should allow owner to set default token parameters", async function () {
            const newParams = {
                maxSupply: ethers.utils.parseEther("2000000"),
                lpSupply: ethers.utils.parseEther("1000000"),
                vaultSupply: ethers.utils.parseEther("200000"),
                maxTokensPerWallet: ethers.utils.parseEther("20000"),
                maxTokensPerTxn: ethers.utils.parseEther("2000"),
                botProtectionDurationInSeconds: 120,
                vault: user1.address
            };

            await agentRegistry.setDefaultTokenParams(newParams);
            const params = await agentRegistry.defaultTokenParams();

            expect(params.maxSupply).to.equal(newParams.maxSupply);
            expect(params.lpSupply).to.equal(newParams.lpSupply);
            expect(params.vaultSupply).to.equal(newParams.vaultSupply);
            expect(params.maxTokensPerWallet).to.equal(newParams.maxTokensPerWallet);
            expect(params.maxTokensPerTxn).to.equal(newParams.maxTokensPerTxn);
            expect(params.botProtectionDurationInSeconds).to.equal(newParams.botProtectionDurationInSeconds);
            expect(params.vault).to.equal(newParams.vault);
        });
    });

    describe("Agent Application System", function () {
        let agentId;
        let applicationId;

        beforeEach(async function () {
            // Create an agent first
            const tx = await agentRegistry.connect(user1).create(user1.address, agentHash, [1], {
                value: registrationFee
            });
            const receipt = await tx.wait();
            const createEvent = receipt.events.find(e => e.event === "CreateUnit");
            agentId = createEvent.args.unitId;

            // Set application threshold
            await agentRegistry.setTokenSystem(
                mockTokenImplementation.address,
                mockAssetToken.address,
                mockRouter.address,
                ethers.utils.parseEther("1.0")
            );

            // Mint some asset tokens for testing
            await mockAssetToken.mint(user1.address, ethers.utils.parseEther("10.0"));
            await mockAssetToken.connect(user1).approve(agentRegistry.address, ethers.utils.parseEther("10.0"));
        });

        it("Should allow agent owner to create an application with asset token deposit", async function () {
            const tx = await agentRegistry.connect(user1).proposeAgent(agentId, "Test Agent", "TEST");
            const receipt = await tx.wait();
            
            const event = receipt.events.find(e => e.event === "AgentProposed");
            expect(event).to.not.be.undefined;
            expect(event.args.agentId).to.equal(agentId);
            
            applicationId = event.args.proposalId;
            const application = await agentRegistry.applications(applicationId);
            
            expect(application.agentId).to.equal(agentId);
            expect(application.proposer).to.equal(user1.address);
            expect(application.name).to.equal("Test Agent");
            expect(application.symbol).to.equal("TEST");
            expect(application.status).to.equal(1); // Pending
            expect(application.withdrawableAmount).to.equal(ethers.utils.parseEther("1.0"));

            // Check asset token transfer
            expect(await mockAssetToken.balanceOf(agentRegistry.address)).to.equal(ethers.utils.parseEther("1.0"));
        });

        it("Should not allow application without sufficient asset tokens", async function () {
            // Reset asset token balance
            await mockAssetToken.connect(user1).transfer(owner.address, await mockAssetToken.balanceOf(user1.address));
            
            await expect(
                agentRegistry.connect(user1).proposeAgent(agentId, "Test Agent", "TEST")
            ).to.be.revertedWith("Insufficient asset token");
        });

        it("Should not allow application without sufficient asset token allowance", async function () {
            // Reset allowance
            await mockAssetToken.connect(user1).approve(agentRegistry.address, 0);
            
            await expect(
                agentRegistry.connect(user1).proposeAgent(agentId, "Test Agent", "TEST")
            ).to.be.revertedWith("Insufficient asset token allowance");
        });

        it("Should allow proposer to withdraw pending application", async function () {
            // Create application
            const tx = await agentRegistry.connect(user1).proposeAgent(agentId, "Test Agent", "TEST");
            const receipt = await tx.wait();
            applicationId = receipt.events.find(e => e.event === "AgentProposed").args.proposalId;

            // Check initial state
            const initialBalance = await mockAssetToken.balanceOf(user1.address);
            
            // Withdraw
            await agentRegistry.connect(user1).withdraw(applicationId);
            
            // Check final state
            const application = await agentRegistry.applications(applicationId);
            expect(application.status).to.equal(3); // Withdrawn
            expect(application.withdrawableAmount).to.equal(0);
            
            // Check asset token return
            expect(await mockAssetToken.balanceOf(user1.address)).to.equal(
                initialBalance.add(ethers.utils.parseEther("1.0"))
            );
        });

        it("Should not allow non-proposer to withdraw", async function () {
            // Create application
            const tx = await agentRegistry.connect(user1).proposeAgent(agentId, "Test Agent", "TEST");
            const receipt = await tx.wait();
            applicationId = receipt.events.find(e => e.event === "AgentProposed").args.proposalId;

            // Try to withdraw as non-proposer
            await expect(
                agentRegistry.connect(user2).withdraw(applicationId)
            ).to.be.revertedWith("Not proposer");
        });

        it("Should execute application and create liquidity pool with deposited assets", async function () {
            // Create application
            const tx = await agentRegistry.connect(user1).proposeAgent(agentId, "Test Agent", "TEST");
            const receipt = await tx.wait();
            applicationId = receipt.events.find(e => e.event === "AgentProposed").args.proposalId;

            // Execute application
            await agentRegistry.connect(user1).executeApplication(applicationId);
            
            // Check application state
            const application = await agentRegistry.applications(applicationId);
            expect(application.status).to.equal(2); // Executed
            expect(application.token).to.not.equal(ethers.constants.AddressZero);
            expect(application.liquidityPool).to.not.equal(ethers.constants.AddressZero);
            expect(application.withdrawableAmount).to.equal(0);
        });

        it("Should not allow executing already executed application", async function () {
            // Create and execute application
            const tx = await agentRegistry.connect(user1).proposeAgent(agentId, "Test Agent", "TEST");
            const receipt = await tx.wait();
            applicationId = receipt.events.find(e => e.event === "AgentProposed").args.proposalId;
            
            await agentRegistry.connect(user1).executeApplication(applicationId);

            // Try to execute again
            await expect(
                agentRegistry.connect(user1).executeApplication(applicationId)
            ).to.be.revertedWith("Invalid application status");
        });

        it("Should not allow withdrawing executed application", async function () {
            // Create and execute application
            const tx = await agentRegistry.connect(user1).proposeAgent(agentId, "Test Agent", "TEST");
            const receipt = await tx.wait();
            applicationId = receipt.events.find(e => e.event === "AgentProposed").args.proposalId;
            
            await agentRegistry.connect(user1).executeApplication(applicationId);

            // Try to withdraw
            await expect(
                agentRegistry.connect(user1).withdraw(applicationId)
            ).to.be.revertedWith("Application not pending");
        });

        it("Should correctly retrieve application by agent ID", async function () {
            // Create application
            const tx = await agentRegistry.connect(user1).proposeAgent(agentId, "Test Agent", "TEST");
            const receipt = await tx.wait();
            applicationId = receipt.events.find(e => e.event === "AgentProposed").args.proposalId;

            const application = await agentRegistry.getAgentApplication(agentId);
            expect(application.name).to.equal("Test Agent");
            expect(application.symbol).to.equal("TEST");
            expect(application.proposer).to.equal(user1.address);
            expect(application.withdrawableAmount).to.equal(ethers.utils.parseEther("1.0"));
        });

        it("Should return empty application for non-existent agent applications", async function () {
            const application = await agentRegistry.getAgentApplication(999);
            expect(application.proposer).to.equal(ethers.constants.AddressZero);
            expect(application.status).to.equal(0); // None
            expect(application.withdrawableAmount).to.equal(0);
        });
    });
}); 