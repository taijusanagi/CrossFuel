// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAxelarGateway {
    function callContractWithToken(
        uint256 destinationChain,
        bytes calldata destinationAddress,
        bytes calldata data,
        string calldata symbol,
        uint256 amount
    ) external payable;
}
