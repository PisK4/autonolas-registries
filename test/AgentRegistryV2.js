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
    const componentHash = "0x" + "5".repeat(64);
    const agentHash = "0x" + "9".repeat(64);
    const registrationFee = ethers.utils.parseEther("0.1"); // 0.1 ETH

    beforeEach(async function () {
        [owner, manager, user1, user2] = await ethers.getSigners();

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
}); 