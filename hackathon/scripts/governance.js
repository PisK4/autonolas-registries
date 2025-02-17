const hre = require("hardhat");
const fs = require("fs");
const process = require("process");

// Load deployment info
let deployInfo;
try {
    deployInfo = JSON.parse(fs.readFileSync("./hackathon/deployment.json"));
} catch (error) {
    console.error("Error loading deployment info. Please run deploy.js first");
    process.exit(1);
}

async function changeManager(agentRegistry, newManager) {
    const tx = await agentRegistry.changeManager(newManager);
    await tx.wait();
    console.log("Manager changed to:", newManager);
}

async function changeOwner(agentRegistry, newOwner) {
    const tx = await agentRegistry.changeOwner(newOwner);
    await tx.wait();
    console.log("Owner changed to:", newOwner);
}

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Executing with account:", deployer.address);
    console.log("Network:", hre.network.name);

    // Get contract instance
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    const agentRegistry = await AgentRegistry.attach(deployInfo.agentRegistry);

    const command = process.env.COMMAND;
    if (!command) {
        console.log(`
Available commands:
------------------
COMMAND=changeManager ADDR=<new_manager_address> : Change the manager address
COMMAND=changeOwner ADDR=<new_owner_address>     : Change contract owner
        `);
        return;
    }

    try {
        switch (command) {
        case "changeManager": {
            const { ADDR } = process.env;
            if (!ADDR) {
                throw new Error("Missing ADDR parameter for changeManager command");
            }
            await changeManager(agentRegistry, ADDR);
            break;
        }
        case "changeOwner": {
            const { ADDR } = process.env;
            if (!ADDR) {
                throw new Error("Missing ADDR parameter for changeOwner command");
            }
            await changeOwner(agentRegistry, ADDR);
            break;
        }
        default: {
            throw new Error("Unknown command: " + command);
        }
        }
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
} 