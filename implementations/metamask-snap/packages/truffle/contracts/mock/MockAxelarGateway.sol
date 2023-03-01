// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MockERC20.sol";

contract MockAxelarGateway {
    mapping(string => address) public tokenAddresses;

    function setTokenAddress(string memory token, address tokenAddress) public {
        tokenAddresses[token] = tokenAddress;
    }

    function callContractWithToken(
        string memory destinationChainId,
        string memory to,
        bytes memory data,
        string memory token,
        uint256 amount
    ) external {
        MockERC20(tokenAddresses[token]).transferFrom(msg.sender, address(this), amount);
    }
}
