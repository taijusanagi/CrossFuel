## Multi-Network Deployment using Infura

Our team utilizes Infura, a multichain node service, for deploying multichain contracts, including the Account Abstraction infrastructure contract, which we are deploying to each chain. Meanwhile, Truffle, a core development tool, provides a starter kit for Metamask Snap and smart contract.

## Required Video Demo

In this video demonstration, we will elucidate our approach to contract deployments using Infura.

https://youtu.be/tn9IiMZHTJ4

## Defining Target Chains - Thought Process

https://github.com/taijusanagi/CrossFuel/issues/1

The final target network can be found at https://github.com/taijusanagi/CrossFuel/blob/main/implementations/metamask-snap/packages/truffle/networks.json.

## Addressing Vulnerabilities in Multi-Network Contract Deployment

To address the increased risk of encountering vulnerabilities when deploying a contract across multiple networks, we take several measures to ensure the security of the contract.

Firstly, we use an audited Account Abstraction smart contract that was released during ETHDenver. This ensures that the contract has undergone a thorough security review and any potential vulnerabilities have been identified and addressed.

Secondly, we use create2 to ensure the contract is verified and not modified across chains. This helps to reduce the risk of an attacker exploiting vulnerabilities in one network to gain access to another network where the same contract is deployed.

## References

To ensure consistency of the service wallet across all chains, we use a custom development script that deploys the contract using create2. The script can be found at https://github.com/taijusanagi/2023-eth-denver-submission/blob/main/implementations/metamask-snap/packages/truffle/scripts/deploy-all-contracts.js.

We also utilize the truffle config located at https://github.com/taijusanagi/CrossFuel/blob/main/implementations/metamask-snap/packages/truffle/truffle-config.js#L27.

To ensure all contract addresses are the same, we use create2. The deployed contracts can be found at https://github.com/taijusanagi/CrossFuel/blob/main/implementations/metamask-snap/packages/truffle/deployments.json.
