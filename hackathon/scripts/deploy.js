const hre = require("hardhat");
const process = require("process");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy ComponentRegistry first
    const ComponentRegistry = await hre.ethers.getContractFactory("ComponentRegistry");
    const componentRegistry = await ComponentRegistry.deploy(
        "Autonolas Components",
        "COMPONENT",
        "https://component.olas.network/"
    );
    await componentRegistry.deployed();
    console.log("ComponentRegistry deployed to:", componentRegistry.address);

    // Deploy AgentRegistry
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    const agentRegistry = await AgentRegistry.deploy(
        "Autonolas Agents",
        "AGENT",
        "https://agent.olas.network/",
        componentRegistry.address
    );
    await agentRegistry.deployed();
    console.log("AgentRegistry deployed to:", agentRegistry.address);

    // Set initial registration fee (0.1 ETH)
    const registrationFee = hre.ethers.utils.parseEther("0.1");
    await agentRegistry.setRegistrationFee(registrationFee);
    console.log("Registration fee set to:", hre.ethers.utils.formatEther(registrationFee), "ETH");

    // Enable open registration mode by default
    await agentRegistry.setRegistrationMode(true);
    console.log("Open registration mode enabled");

    // Save deployment info
    const fs = require("fs");
    const deployInfo = {
        componentRegistry: componentRegistry.address,
        agentRegistry: agentRegistry.address,
        registrationFee: registrationFee.toString(),
        network: hre.network.name
    };

    fs.writeFileSync(
        "./hackathon/deployment.json",
        JSON.stringify(deployInfo, null, 2)
    );

    console.log("\nDeployment Summary:");
    console.log("===================");
    console.log("ComponentRegistry:", componentRegistry.address);
    console.log("AgentRegistry:", agentRegistry.address);
    console.log("Registration Fee:", hre.ethers.utils.formatEther(registrationFee), "ETH");
    console.log("Network:", hre.network.name);
    console.log("\nDeployment info saved to hackathon/deployment.json");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 