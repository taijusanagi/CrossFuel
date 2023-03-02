## Maintaining the Same Address Across Chains

![defender-keep-the-same-address](./defender-keep-the-same-address.png)

Enabling the "Clone to another network" option allows us to use the same signing key for multiple chains, which is highly beneficial as the deployed paymaster contract's address can be impacted by the address used.

This address is used for verifying the paymaster signer key and fund manager: 0x7f5aa4c071671ad22edc02bb8a081418bb6c484f.

## Verifiying Paymaster Signer Key

We are utilizing the Defender relayer key as the signer in the Verifying Paymaster Contract.

![defender-with-verifying-paymaster](./defender-with-verifying-paymaster.png)

Defender only signs when the user creates enough gas payment, and the Verifying Paymaster checks the off-chain signature created by Defender. This is the core function of cross-chain gas payment.

For contract details, please see [here](https://goerli.etherscan.io/address/0xab49271f86d99aa6efa4a96a00efc5ac864b051a#code).

## Fund Manager

### Faucet

We are using Defender to mint mock gas payment faucet tokens, which is a mock function for a simple demo.
