// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IOneInchAggregator.sol";

contract MockOneInchAggregator is IOneInchAggregator {
    uint256[] public swapAmounts;
    uint256[] public getExpectedReturnAmounts;

    function setSwap(uint256[] memory amounts) public {
        swapAmounts = amounts;
    }

    function getExpectedReturn(
        address,
        address,
        uint256,
        uint256,
        uint256
    ) public view returns (uint256, uint256[] memory) {
        return (getExpectedReturnAmounts[0], new uint256[](0));
    }

    function swap(
        address,
        address,
        uint256,
        uint256,
        uint256[] memory,
        uint256
    ) public payable returns (uint256) {
        return swapAmounts[0];
    }
}
