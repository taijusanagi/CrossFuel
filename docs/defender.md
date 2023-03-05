## Defender

Defender automates the verification of the signature within the paymaster contract, as well as the paymaster deposit balance check and any required fund transfers, making it an excellent choice for CrossFuel, which requires a stable infrastructure for signing and health check.

### Verifiying Paymaster Signer Key with Relayer

We are utilizing the Defender relayer key as the signer in the Verifying Paymaster Contract.

This address is used for verifying the paymaster signer key and fund manager: 0x7f5aa4c071671ad22edc02bb8a081418bb6c484f.

![defender-with-verifying-paymaster](./defender-with-verifying-paymaster.png)

Defender only signs when the user creates enough gas payment, and the Verifying Paymaster checks the off-chain signature created by Defender. This is the core function of cross-chain gas payment.

For contract details, please see [here](https://goerli.etherscan.io/address/0x78a5baab4684c0ffa719d07a0d3e036897f9b5ad#code).

![defender-keep-the-same-address](./defender-keep-the-same-address.png)

Enabling the "Clone to another network" option allows us to use the same signing key for multiple chains, which is highly beneficial as the deployed paymaster contract's address can be impacted by the address used.

## Paymaster Balance Tracking with Autotasks

We utilize the Defender auto task to monitor paymaster deposits in the Account Abstraction entrypoint. This is essential as it ensures that there is always sufficient deposit available.
