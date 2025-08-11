/* import { Wallet } from "@0xsequence/wallet";
import { ethers } from "ethers";
import MemoryNFT from "@/contracts/MemoryNFT_contract.json"; // adjust path as needed

const contractAddress = process.env.NEXT_PUBLIC_MEMORY_NFT_ADDRESS!; // put this in .env

export async function mintMemory(planId: number) {
  try {
    // Set up Sequence wallet for Etherlink
    const wallet = new Wallet("etherlink");
    await wallet.connect({ network: "etherlink" });
    const provider = wallet.getProvider();

    // Create contract instance
    const memoryNFT = new ethers.Contract(
      contractAddress,
      MemoryNFT.abi,
      provider.getSigner()
    );

    // Call mint function
    const tx = await memoryNFT.mintMemory(planId);
    await tx.wait();

    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error("Minting failed:", error);
    return { success: false, error };
  }
}
 */
