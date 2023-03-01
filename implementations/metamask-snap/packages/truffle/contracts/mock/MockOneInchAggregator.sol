// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MockERC20.sol";

contract MockOneInchAggregator {
    uint256 public rate;
    uint256[] public distribution;

    function setRate(uint256 _rate) public {
        rate = _rate;
    }

    function setDistribution(uint256[] memory _distribution) public {
        distribution = _distribution;
    }

    function getExpectedReturn(
        address,
        address,
        uint256 amout,
        uint256,
        uint256
    ) public view returns (uint256, uint256[] memory) {
        uint256 expectedReturn = amout * rate;
        return (expectedReturn, distribution);
    }

    function swap(
        address fromToken,
        address toToken,
        uint256 amount,
        uint256 minReturn,
        uint256[] memory,
        uint256
    ) public payable returns (uint256) {
        MockERC20(fromToken).transferFrom(msg.sender, address(this), amount);
        MockERC20(toToken).transfer(msg.sender, minReturn);
        return minReturn;
    }
}
