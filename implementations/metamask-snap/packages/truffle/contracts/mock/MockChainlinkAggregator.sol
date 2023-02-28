// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../interfaces/IChainlinkAggregator.sol";

contract MockChainlinkAggregator is IChainlinkAggregator {
    int256 private _latestAnswer;

    constructor(int256 latestAnswer) {
        _latestAnswer = latestAnswer;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint256,
            int256 answer,
            uint256,
            uint256,
            uint80
        )
    {
        return (0, _latestAnswer, 0, 0, 0);
    }

    function setLatestAnswer(int256 latestAnswer) external {
        _latestAnswer = latestAnswer;
    }
}
