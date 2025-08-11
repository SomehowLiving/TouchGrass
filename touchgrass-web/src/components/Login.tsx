"use client";

import { useOpenConnectModal } from "@0xsequence/connect";

function Home() {
  const { setOpenConnectModal } = useOpenConnectModal();

  return (
    <>
      <button onClick={() => setOpenConnectModal(true)}>Connect</button>
    </>
  );
}

export default Home;
