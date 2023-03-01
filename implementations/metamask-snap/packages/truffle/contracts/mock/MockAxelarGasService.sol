// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockAxelarGasService {
    function payGasForContractCallWithToken(address, bytes memory, address, address) external payable returns (bool) {
        return true;
    }

    function payNativeGasForContractCallWithToken(address, bytes memory) external payable returns (bool) {
        return true;
    }
}
