## Contract Deployement

To ensure uniformity of the service wallet across all chains, a custom development script utilizing create2 is necessary for deploying the contract.

The script can be found here: https://github.com/taijusanagi/2023-eth-denver-submission/blob/main/implementations/metamask-snap/packages/truffle/scripts/deploy-all-contracts.js

## Contract Verification

Contract verification is done by https://www.npmjs.com/package/truffle-plugin-verify. This verification is significantly helpful for development when using Tenderly to debug.

### MockERC20

```
yarn truffle run verify MockERC20@0x7ce1548c5f730e4cd2540756275f57bcd85f1148 --verifiers=etherscan --forceConstructorArgs string:0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000104d6f636b5061796d656e74546f6b656e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034d50540000000000000000000000000000000000000000000000000000000000 --network <network>
```

### MockSBTClaim

```
yarn truffle run verify MockSBTClaim@0x08bea6a6ca3a07861354194549512e46deebf490 --verifiers=etherscan --network <network>
```
