const hre = require("hardhat");
const fs = require("fs");
const process = require("process");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Executing with account:", deployer.address);
    console.log("Network:", hre.network.name);

    // Load deployment info
    const deployInfo = JSON.parse(fs.readFileSync("./hackathon/deployment.json"));

    // Get MockToken instance
    const MockToken = await hre.ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.attach(deployInfo.mockToken);

    // Mint tokens to deployer
    const amount = hre.ethers.utils.parseEther("1000.0");
    await mockToken.mint(deployer.address, amount);
    console.log("Minted", hre.ethers.utils.formatEther(amount), "tokens to", deployer.address);

    // Get balance
    const balance = await mockToken.balanceOf(deployer.address);
    console.log("Current balance:", hre.ethers.utils.formatEther(balance), "tokens");
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
} 