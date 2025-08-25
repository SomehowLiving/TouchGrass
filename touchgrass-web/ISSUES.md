## Hurdle & Solution

One of the biggest hurdles I faced was trying to use **Sequence alone** to interact with my smart contract and mint the Clique NFT.  
The contract call wasn’t going through as expected, and since the entire project depends on this minting flow, it became a huge blocker.

After some trial and error, I figured out that combining **Sequence with Wagmi** solved the problem. With this setup, I was finally able to mint the NFT successfully.

I didn’t have enough time to polish the UI to the level I wanted, and the chat feature had to be postponed. But I’m happy that the **core minting flow works** as expected. 🎉

---

### Proof of Transaction

Here’s the proof of a successful minting transaction:

![Transaction Proof](https://github.com/SomehowLiving/TouchGrass/blob/main/touchgrass-web/public/mintProof/transactionProof.png?raw=true)

🔗 [View on Block Explorer](https://sepolia.basescan.org/tx/0x595d82f22d7bb41d07ab4a650f1b5a3eb09aa7e8ec4bac39b1173ac96d10786e)
