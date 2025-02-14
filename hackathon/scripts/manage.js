const hre = require("hardhat");
const fs = require("fs");
const process = require("process");

// Load deployment info
let deployInfo;
try {
    deployInfo = JSON.parse(fs.readFileSync("./hackathon/deployment.json"));
} catch (error) {
    console.error("Error loading deployment info. Please run deploy.js first");
    return;
}

async function setRegistrationFee(agentRegistry, newFee) {
    const tx = await agentRegistry.setRegistrationFee(hre.ethers.utils.parseEther(newFee.toString()));
    await tx.wait();
    console.log("Registration fee set to:", newFee, "ETH");
}

async function withdrawFees(agentRegistry) {
    const tx = await agentRegistry.withdrawFees();
    await tx.wait();
    console.log("Fees withdrawn successfully");
}

async function updateBlacklist(agentRegistry, address, isBlacklisted) {
    const tx = await agentRegistry.updateBlacklist(address, isBlacklisted);
    await tx.wait();
    console.log(`Address ${address} ${isBlacklisted ? "blacklisted" : "unblacklisted"}`);
}

async function setRegistrationMode(agentRegistry, isOpen) {
    const tx = await agentRegistry.setRegistrationMode(isOpen);
    await tx.wait();
    console.log(`Registration mode set to: ${isOpen ? "Open" : "Manager Only"}`);
}

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Executing with account:", deployer.address);
    console.log("Network:", hre.network.name);

    // Get contract instance
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    const agentRegistry = await AgentRegistry.attach(deployInfo.agentRegistry);

    const command = process.env.COMMAND;
    const param1 = process.env.PARAM1;
    const param2 = process.env.PARAM2;

    if (!command) {
        console.log(`
Available commands:
------------------
COMMAND=setFee PARAM1=<amount_in_eth>     : Set registration fee
COMMAND=withdraw                          : Withdraw collected fees
COMMAND=blacklist PARAM1=<addr> PARAM2=<t/f> : Update blacklist status
COMMAND=setMode PARAM1=<t/f>             : Set registration mode (true=open, false=manager)
        `);
        return;
    }

    try {
        switch (command) {
        case "setFee": {
            if (!param1) {
                throw new Error("Usage: COMMAND=setFee PARAM1=<amount_in_eth>");
            }
            await setRegistrationFee(agentRegistry, parseFloat(param1));
            break;
        }
        case "withdraw": {
            await withdrawFees(agentRegistry);
            break;
        }
        case "blacklist": {
            if (!param1 || !param2) {
                throw new Error("Usage: COMMAND=blacklist PARAM1=<address> PARAM2=<true/false>");
            }
            await updateBlacklist(agentRegistry, param1, param2.toLowerCase() === "true");
            break;
        }
        case "setMode": {
            if (!param1) {
                throw new Error("Usage: COMMAND=setMode PARAM1=<true/false>");
            }
            await setRegistrationMode(agentRegistry, param1.toLowerCase() === "true");
            break;
        }
        default: {
            throw new Error("Unknown command: " + command);
        }
        }
    } catch (error) {
        console.error("Error:", error.message);
        return;
    }
}

main()
    .then(() => console.log("Done"))
    .catch(error => {
        console.error(error);
        return;
    }); 