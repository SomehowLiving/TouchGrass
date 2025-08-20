const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying TouchGrass MVP CliqueNFT contract...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // 1. Deploy NFT contract first
    console.log("\n1. Deploying CliqueNFT...");
    const CliqueNFT = await ethers.getContractFactory("CliqueNFT");
    const nftContract = await CliqueNFT.deploy();
    await nftContract.waitForDeployment();
    console.log("CliqueNFT deployed to:", nftContract.target);

    // 7. Output deployment info
    console.log("\n🎉 Deployment Complete!");
    console.log("=====================================");
    console.log("Network:", await ethers.provider.getNetwork());
    console.log("Deployer:", deployer.address);
    console.log("CliqueNFT:", nftContract.target);
    console.log("=====================================");

    // Save deployment info
    const deploymentInfo = {
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId,
        deployer: deployer.address,
        contracts: {
            CliqueNFT: nftContract.target
        },
        deploymentTime: new Date().toISOString()
    };

    const fs = require('fs');
    fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
        2
    ));
    console.log("Deployment info saved to deployment-info.json");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
