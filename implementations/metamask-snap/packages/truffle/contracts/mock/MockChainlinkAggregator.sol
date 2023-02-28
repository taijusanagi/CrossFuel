// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IChainlinkAggregator.sol";

contract MockChainlinkAggregator is IChainlinkAggregator {
    int256 public _latestAnswer;

    constructor(int256 initialAnswer) {
        _latestAnswer = initialAnswer;
    }

    function latestAnswer() public view override returns (int256) {
        return _latestAnswer;
    }

    function setLatestAnswer(int256 newAnswer) public {
        _latestAnswer = newAnswer;
    }
}
