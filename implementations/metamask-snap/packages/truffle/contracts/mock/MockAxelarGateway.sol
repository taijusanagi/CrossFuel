// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface MockAxelarGateway {
    function tokenAddresses(address token) external view returns (address);

    function transferNativeToken(
        uint256 destinationChainId,
        address payable recipient,
        address gasReceiver
    ) external payable;

    function callContractWithToken(
        uint256 destinationChainId,
        address to,
        bytes memory data,
        address token,
        uint256 amount
    ) external;
}
