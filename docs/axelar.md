## Axelar

Axelar Network is a crucial component of our cross-chain gas payment service. In the event of insufficient funds, we leverage the cross-chain bridge to transfer funds from a chain with a surplus. Additionally, we utilize Squid, the cross-chain swap and liquidity routing protocol, on the Axelar Network to facilitate our operations.

### Details of the Transaction

We sent aUSDC from the Goerli network to the Mumbai network. You can view the transaction details at these links:

https://goerli.etherscan.io/tx/0x7190acb605bd71d5c34e6883c4d895201f1e234fec0a61d8bd2dc9acbedd8a2a

https://testnet.axelarscan.io/gmp/0x7190acb605bd71d5c34e6883c4d895201f1e234fec0a61d8bd2dc9acbedd8a2a

### Integration

Originally, we attempted to use Axelar from within our smart contract, as seen in this code: https://github.com/taijusanagi/CrossFuel/blob/main/implementations/metamask-snap/packages/truffle/contracts/GasPaymentGateway.sol

However, after receiving mentorship in a Discord channel, we learned about Squid. We now utilize Squid in the backend process to perform bridge and swap functions.

### Challenge

The amount of testnet tokens available in the faucet is limited, so we must be mindful of how much we use during testing. Additionally, I discovered a bug in the Squid library related to hex formatting, but I was able to find a workaround and shared it with the Squid official Discord channel.

### Benefit

We've experienced several benefits while working with Axelar:

The transaction process is straightforward and easy to track using the Axelar explorer.
Our Goerli to Mumbai aUSDC bridge test yielded good response times.
Integrating the smart contract and third-party SDK has been a smooth process.
