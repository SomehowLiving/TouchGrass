const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying TouchGrass MVP contracts...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // 1. Deploy NFT contract first
    console.log("\n1. Deploying TouchGrassNFT...");
    const TouchGrassNFT = await ethers.getContractFactory("TouchGrassNFT");
    const nftContract = await TouchGrassNFT.deploy();
    await nftContract.waitForDeployment();
    console.log("TouchGrassNFT deployed to:", nftContract.target);

    // 2. Deploy Core contract
    console.log("\n2. Deploying TouchGrassCore...");
    const TouchGrassCore = await ethers.getContractFactory("TouchGrassCore");
    const coreContract = await TouchGrassCore.deploy();
    await coreContract.waitForDeployment();
    console.log("TouchGrassCore deployed to:", coreContract.target);

    // 3. Connect contracts
    console.log("\n3. Connecting contracts...");
    await nftContract.setCoreContract(coreContract.target);
    console.log("✓ NFT contract linked to Core");
    
    await coreContract.setNFTContract(nftContract.target);
    console.log("✓ Core contract linked to NFT");

    // 4. Deploy Paymaster
    console.log("\n4. Deploying TouchGrassPaymaster...");
    const TouchGrassPaymaster = await ethers.getContractFactory("TouchGrassPaymaster");
    const paymasterContract = await TouchGrassPaymaster.deploy(
        coreContract.target,
        nftContract.target
    );
    await paymasterContract.waitForDeployment();
    console.log("TouchGrassPaymaster deployed to:", paymasterContract.target);

    // 5. Fund paymaster
    console.log("\n5. Funding paymaster...");
    await paymasterContract.addFunds({
        value: ethers.parseEther("0.1")
    });
    console.log("✓ Paymaster funded with 0.1 ETH");

    // 6. Verification checks
    console.log("\n6. Verification checks...");
    const nftCoreAddress = await nftContract.coreContract();
    console.log("NFT->Core link:", nftCoreAddress === coreContract.target ? "✓" : "✗");
    
    const coreNftAddress = await coreContract.nftContract();
    console.log("Core->NFT link:", coreNftAddress === nftContract.target ? "✓" : "✗");
    
    const paymasterBalance = await ethers.provider.getBalance(paymasterContract.target);
    console.log("Paymaster balance:", ethers.formatEther(paymasterBalance), "ETH");

    // 7. Output deployment info
    console.log("\n🎉 Deployment Complete!");
    console.log("=====================================");
    console.log("Network:", await ethers.provider.getNetwork());
    console.log("Deployer:", deployer.address);
    console.log("TouchGrassCore:", coreContract.target);
    console.log("TouchGrassNFT:", nftContract.target);
    console.log("TouchGrassPaymaster:", paymasterContract.target);
    console.log("=====================================");

    // Save deployment info
    const deploymentInfo = {
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId,
        deployer: deployer.address,
        contracts: {
            TouchGrassCore: coreContract.target,
            TouchGrassNFT: nftContract.target,
            TouchGrassPaymaster: paymasterContract.target
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
