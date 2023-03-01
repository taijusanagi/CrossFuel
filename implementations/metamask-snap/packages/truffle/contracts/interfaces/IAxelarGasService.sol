// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAxelarGasService {
    function payNativeGasForContractCallWithToken(
        address recipient,
        address tokenAddress,
        uint256 tokenAmount
    ) external payable;
}
