## Contract Deployement

- To ensure uniformity of the service wallet across all chains, a custom development script utilizing create2 is necessary for the deployment of the contract.

https://github.com/taijusanagi/2023-eth-denver-submission/blob/main/implementations/metamask-snap/packages/truffle/scripts/deploy-all-contracts.js

## Contract Verification

Contract Verification is done by https://www.npmjs.com/package/truffle-plugin-verify.
This verification is significantly helpful for development when using Tenderly to debug.

### EntryPoint

- EntryPoint is verified by default

### SimpleAccountFactory

```
yarn truffle run verify SimpleAccountFactory@0x4899c9db043dba05f2b15bf4b1149fd58bf00e08 --verifiers=etherscan --forceConstructorArgs string:0000000000000000000000000576a174d229e3cfa37253523e645a78a0c91b57 --network <network>
```

### Paymaster

```
yarn truffle run verify VerifyingPaymaster@0x4899c9db043dba05f2b15bf4b1149fd58bf00e08 --verifiers=etherscan --forceConstructorArgs string:0000000000000000000000000576a174d229e3cfa37253523e645a78a0c91b57000000000000000000000000a8dba26608565e1f69d81efae4cbb5cb8e87013d --network <network>
```

### MockERC20

```
yarn truffle run verify MockERC20@0x8bfceb73d45dc5f39e61b4a060bf23c12aa5a444 --verifiers=etherscan --forceConstructorArgs string:0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000104d6f636b5061796d656e74546f6b656e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034d50540000000000000000000000000000000000000000000000000000000000 --network <network>
```
