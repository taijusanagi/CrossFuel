// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@account-abstraction/contracts/samples/VerifyingPaymaster.sol";

contract CrossFuelPaymaster is VerifyingPaymaster {
    constructor(IEntryPoint _entryPoint, address _verifyingSigner, address owner) VerifyingPaymaster(_entryPoint, _verifyingSigner) {
        // We need to include this because we're utilizing the factory pattern.
        transferOwnership(owner);
    }
}
