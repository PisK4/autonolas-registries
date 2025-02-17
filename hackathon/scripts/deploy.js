const hre = require("hardhat");
const process = require("process");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy mock contracts first
    console.log("\nDeploying mock contracts...");
    
    // Deploy MockToken (for testing)
    const MockToken = await hre.ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy();
    await mockToken.deployed();
    console.log("MockToken deployed to:", mockToken.address);

    // Deploy MockFactory
    const MockFactory = await hre.ethers.getContractFactory("MockFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.deployed();
    console.log("MockFactory deployed to:", mockFactory.address);

    // Deploy MockRouter
    const MockRouter = await hre.ethers.getContractFactory("MockRouter");
    const mockRouter = await MockRouter.deploy(mockFactory.address);
    await mockRouter.deployed();
    console.log("MockRouter deployed to:", mockRouter.address);

    // Deploy AgentToken implementation
    console.log("\nDeploying AgentToken implementation...");
    const AgentToken = await hre.ethers.getContractFactory("AgentToken");
    const agentTokenImpl = await AgentToken.deploy();
    await agentTokenImpl.deployed();
    console.log("AgentToken implementation deployed to:", agentTokenImpl.address);

    // Deploy ComponentRegistry
    console.log("\nDeploying core registries...");
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

    // Configure token system
    console.log("\nConfiguring token system...");
    
    // Set token system parameters
    const applicationThreshold = hre.ethers.utils.parseEther("1.0");
    await agentRegistry.setTokenSystem(
        agentTokenImpl.address,
        mockToken.address,
        mockRouter.address,
        applicationThreshold
    );
    console.log("Token system configured with:");
    console.log("- Implementation:", agentTokenImpl.address);
    console.log("- Asset Token:", mockToken.address);
    console.log("- Router:", mockRouter.address);
    console.log("- Application Threshold:", hre.ethers.utils.formatEther(applicationThreshold), "ETH");

    // Set default token parameters
    const defaultTokenParams = {
        maxSupply: hre.ethers.utils.parseEther("600000"),
        lpSupply: hre.ethers.utils.parseEther("500000"),
        vaultSupply: hre.ethers.utils.parseEther("100000"),
        maxTokensPerWallet: hre.ethers.utils.parseEther("10000"),
        maxTokensPerTxn: hre.ethers.utils.parseEther("1000"),
        botProtectionDurationInSeconds: 60,
        vault: deployer.address
    };
    await agentRegistry.setDefaultTokenParams(defaultTokenParams);
    console.log("\nDefault token parameters set:");
    console.log("- Max Supply:", hre.ethers.utils.formatEther(defaultTokenParams.maxSupply));
    console.log("- LP Supply:", hre.ethers.utils.formatEther(defaultTokenParams.lpSupply));
    console.log("- Vault Supply:", hre.ethers.utils.formatEther(defaultTokenParams.vaultSupply));
    console.log("- Max Per Wallet:", hre.ethers.utils.formatEther(defaultTokenParams.maxTokensPerWallet));
    console.log("- Max Per Txn:", hre.ethers.utils.formatEther(defaultTokenParams.maxTokensPerTxn));
    console.log("- Bot Protection:", defaultTokenParams.botProtectionDurationInSeconds, "seconds");
    console.log("- Vault:", defaultTokenParams.vault);

    // Save deployment info
    const fs = require("fs");
    const deployInfo = {
        mockToken: mockToken.address,
        mockFactory: mockFactory.address,
        mockRouter: mockRouter.address,
        agentTokenImpl: agentTokenImpl.address,
        componentRegistry: componentRegistry.address,
        agentRegistry: agentRegistry.address,
        registrationFee: registrationFee.toString(),
        applicationThreshold: applicationThreshold.toString(),
        defaultTokenParams: {
            maxSupply: defaultTokenParams.maxSupply.toString(),
            lpSupply: defaultTokenParams.lpSupply.toString(),
            vaultSupply: defaultTokenParams.vaultSupply.toString(),
            maxTokensPerWallet: defaultTokenParams.maxTokensPerWallet.toString(),
            maxTokensPerTxn: defaultTokenParams.maxTokensPerTxn.toString(),
            botProtectionDurationInSeconds: defaultTokenParams.botProtectionDurationInSeconds,
            vault: defaultTokenParams.vault
        },
        network: hre.network.name
    };

    fs.writeFileSync(
        "./hackathon/deployment.json",
        JSON.stringify(deployInfo, null, 2)
    );

    console.log("\nDeployment Summary:");
    console.log("===================");
    console.log("Mock Contracts:");
    console.log("- MockToken:", mockToken.address);
    console.log("- MockFactory:", mockFactory.address);
    console.log("- MockRouter:", mockRouter.address);
    console.log("\nToken System:");
    console.log("- AgentToken Implementation:", agentTokenImpl.address);
    console.log("\nCore Registries:");
    console.log("- ComponentRegistry:", componentRegistry.address);
    console.log("- AgentRegistry:", agentRegistry.address);
    console.log("\nConfiguration:");
    console.log("- Registration Fee:", hre.ethers.utils.formatEther(registrationFee), "ETH");
    console.log("- Application Threshold:", hre.ethers.utils.formatEther(applicationThreshold), "ETH");
    console.log("- Network:", hre.network.name);
    console.log("\nDeployment info saved to hackathon/deployment.json");

    // Verify contracts if not on localhost
    if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
        console.log("\nVerifying contracts...");
        
        // Wait for a few block confirmations
        const WAIT_BLOCK_CONFIRMATIONS = 6;
        await mockToken.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
        await mockFactory.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
        await mockRouter.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
        await agentTokenImpl.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
        await componentRegistry.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
        await agentRegistry.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);

        // Verify MockToken
        console.log("Verifying MockToken...");
        await hre.run("verify:verify", {
            address: mockToken.address,
            constructorArguments: []
        });

        // Verify MockFactory
        console.log("Verifying MockFactory...");
        await hre.run("verify:verify", {
            address: mockFactory.address,
            constructorArguments: []
        });

        // Verify MockRouter
        console.log("Verifying MockRouter...");
        await hre.run("verify:verify", {
            address: mockRouter.address,
            constructorArguments: [mockFactory.address]
        });

        // Verify AgentToken
        console.log("Verifying AgentToken implementation...");
        await hre.run("verify:verify", {
            address: agentTokenImpl.address,
            constructorArguments: []
        });

        // Verify ComponentRegistry
        console.log("Verifying ComponentRegistry...");
        await hre.run("verify:verify", {
            address: componentRegistry.address,
            constructorArguments: [
                "Autonolas Components",
                "COMPONENT",
                "https://component.olas.network/"
            ]
        });

        // Verify AgentRegistry
        console.log("Verifying AgentRegistry...");
        await hre.run("verify:verify", {
            address: agentRegistry.address,
            constructorArguments: [
                "Autonolas Agents",
                "AGENT",
                "https://agent.olas.network/",
                componentRegistry.address
            ]
        });

        console.log("\nAll contracts verified successfully!");
    }
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