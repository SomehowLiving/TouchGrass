"use client";
import Image from "next/image";
import Logo from "../../public/logo.png";
import { BellRing, CircleUserRound } from "lucide-react";
import {
  useOpenConnectModal,
  useSignInEmail,
  useListAccounts,
} from "@0xsequence/connect";
import { useAccount, useSendTransaction } from "wagmi";

export default function Header() {
  const { setOpenConnectModal } = useOpenConnectModal();
  const { address } = useAccount();
  const email = useSignInEmail();
  const { data, isLoading, error, refetch } = useListAccounts();
  console.log("Data from header ", data);

  return (
    <header className="flex justify-between items-center bg-green-900 text-white px-4 py-3 opacity-95">
      <div className="">
        <Image
          src={Logo}
          alt="touch grass logo"
          className="w-16 h-16 object-contain"
        />
      </div>
      <div className="flex items-center space-x-6">
        {!address ? (
          <button
            className="border border-[#32FF3E] text-white cursor-pointer font-semibold px-4 py-4 rounded hover:bg-white hover:text-[#32FF3E]"
            onClick={() => setOpenConnectModal(true)}
          >
            Sign In
          </button>
        ) : (
          <div className="flex items-center space-x-4">
            <BellRing className="cursor-pointer" />
            <CircleUserRound
              onClick={() => setOpenConnectModal(true)}
              className="cursor-pointer"
            />
          </div>
        )}
      </div>
      {/*  <div>
        <div>Current Account ID: {data?.currentAccountId}</div>
        {data?.accounts.map((account) => (
          <div key={account.id} className="account-item">
            <div>ID: {account.id}</div>
            <div>Type: {account.type}</div>
            {account.email && <div>Email: {account.email}</div>}
            {account.issuer && <div>Issuer: {account.issuer}</div>}
          </div>
        ))}
      </div> */}
    </header>
  );
}
