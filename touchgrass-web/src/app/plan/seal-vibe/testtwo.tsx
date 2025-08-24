"use client";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import CliqueNFT from "../../../../../backend/src/abis/CliqueNFT.json";

export function MintNFT() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const mintNFT = async (ipfsLink: string) => {
    if (!isConnected) return;

    writeContract({
      address: "0x35AcB41e1c3a0B35478ce9d01FC1aa45E15416E2",
      abi: CliqueNFT,
      functionName: "mintClique",
      args: [ipfsLink],
    });
  };

  return (
    <div>
      <button
        onClick={() =>
          mintNFT(
            "ipfs://bafkreicbyqzmauheew6gcvyw3l5k4cfxuzxneqx2lesq3mcbua5k2wfuiq"
          )
        }
        disabled={!isConnected || isPending || isConfirming}
      >
        {isPending ? "Preparing..." : isConfirming ? "Minting..." : "Mint NFT"}
      </button>

      {isSuccess && <p>NFT minted successfully!</p>}
    </div>
  );
}
