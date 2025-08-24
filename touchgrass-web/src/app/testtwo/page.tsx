"use client";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import CliqueNFT from "../../../../backend/src/abis/CliqueNFT.json";
import Header from "@/components/Header";

export default function TestTwoPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  const {
    writeContract,
    data: txHash, // transaction hash when user submits tx
    isPending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt, // transaction receipt after confirmation
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const mintNFT = async (ipfsLink: string) => {
    if (!isConnected) return;
    writeContract({
      address: "0x35AcB41e1c3a0B35478ce9d01FC1aa45E15416E2", // contract address
      abi: CliqueNFT,
      functionName: "mintClique",
      args: [ipfsLink],
    });
  };

  return (
    <>
      <Header />
      <div className="text-white p-6 space-y-4">
        {/* Connect / Disconnect Button */}
        {!isConnected ? (
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="bg-blue-500 px-4 py-2 rounded"
          >
            Connect Sequence Wallet
          </button>
        ) : (
          <button
            onClick={() => disconnect()}
            className="bg-red-500 px-4 py-2 rounded"
          >
            Disconnect ({address?.slice(0, 6)}…{address?.slice(-4)})
          </button>
        )}

        {/* Mint Button */}
        {isConnected && (
          <button
            onClick={() =>
              mintNFT(
                "ipfs://bafkreicbyqzmauheew6gcvyw3l5k4cfxuzxneqx2lesq3mcbua5k2wfuiq"
              )
            }
            disabled={isPending || isConfirming}
            className="bg-green-500 px-6 py-3 rounded text-lg"
          >
            {isPending
              ? "Preparing..."
              : isConfirming
              ? "Minting..."
              : "Mint NFT"}
          </button>
        )}

        {/* Status Messages */}
        {txHash && (
          <p className="text-yellow-400 break-words">
            📝 Tx Submitted:{" "}
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-400"
            >
              {txHash}
            </a>
          </p>
        )}

        {isSuccess && receipt && (
          <div className="text-green-400 space-y-2">
            <p>✅ NFT minted successfully!</p>
            <p>
              ⛓ Block: <span className="font-mono">{receipt.blockNumber}</span>
            </p>
            <p>
              👤 Minter:{" "}
              <span className="font-mono">{receipt.from?.slice(0, 10)}...</span>
            </p>
          </div>
        )}

        {writeError && (
          <p className="text-red-400">❌ Error: {writeError.message}</p>
        )}

        {connectError && (
          <p className="text-red-400">❌ {connectError.message}</p>
        )}
      </div>
    </>
  );
}
