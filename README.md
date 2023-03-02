# CrossFuel

CrossFuel is a seamless cross-chain gas payment infrastructure that leverages Account Abstraction.

With CrossFuel, users can easily pay gas fees for dApps across multiple chains, making it easy to interact with different blockchains without worrying about swapping tokens or bridging them between chains.

![banner](./docs/banner_wide.png)

## Account Abstraction

Our smart contract and bundler are fully compatible with the newly released version of the Account Abstraction contract from Ethereum Foundation, which was activated during ETHDenver 2023.

[Ethereum Says ERC-4337 Deployed, Tested, Beginning Era of Smart Accounts](https://www.coindesk.com/tech/2023/03/01/ethereum-activates-account-abstraction-touted-by-founder-buterin-as-key-advance/)

With its compatibility with the latest version of Account Abstraction, CrossFuel provides a secure and easy-to-use platform for cross-chain gas payments. It is an ideal solution for anyone looking to make cross-chain transactions with ease.

## How It Works

![how-it-works](./docs/how-it-works.jpg)

### Metamask Snap

Metamask Snap is an extension function of Metamask that enables the addition of the Account Abstraction function to Metamask.

[Detail](https://github.com/taijusanagi/2023-eth-denver-submission/blob/main/docs/metamask-snap.md)

### Infura & Truffle

Infura is a multichain node service used to deploy multichain contracts, while Truffle is a core development tool in our team that provides a starter kit for Metamask Snap.

[Detail](https://github.com/taijusanagi/2023-eth-denver-submission/blob/main/docs/infura-truffle.md)

### Defender

Defender creates a signature for verifying paymaster contract and automates multichain deposit syncing.

[Detail](https://github.com/taijusanagi/2023-eth-denver-submission/blob/main/docs/defender.md)

### Tenderly

Tenderly enables transaction simulation.

By working together, these services provide a seamless and secure user experience, allowing users to interact with dApps across multiple chains without worrying about managing tokens across different chains.
