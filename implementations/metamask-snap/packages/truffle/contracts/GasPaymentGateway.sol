// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

// @dev
// copied minimum interfaces
import "./interfaces/IAxelarGasService.sol";
import "./interfaces/IChainlinkAggregator.sol";
import "./interfaces/IOneInchAggregator.sol";

contract GasPaymentGateway is AxelarExecutable {
    IOneInchAggregator public immutable oneInchAggregator;
    IChainlinkAggregator public immutable chainlinkAggregator;
    address public immutable axelarGasServiceAddress;

    mapping(string => address) public destinationChainNativeTokenAddresses;
    mapping(string => string) public destinationChainNativeTokenSymbols;

    constructor(
        address _gateway,
        address _oneInchAggregatorAddress,
        address _chainlinkAggregatorAddress,
        address _axelarGasServiceAddress,
        string[] memory _destinationChainIds,
        address[] memory _destinationChainNativeTokenAddresses,
        string[] memory _destinationChainNativeTokenSymbols
    ) AxelarExecutable(_gateway) {
        oneInchAggregator = IOneInchAggregator(_oneInchAggregatorAddress);
        chainlinkAggregator = IChainlinkAggregator(_chainlinkAggregatorAddress);
        axelarGasServiceAddress = _axelarGasServiceAddress;
        for (uint256 i = 0; i < _destinationChainIds.length; i++) {
            destinationChainNativeTokenAddresses[_destinationChainIds[i]] = _destinationChainNativeTokenAddresses[i];
            destinationChainNativeTokenSymbols[_destinationChainIds[i]] = _destinationChainNativeTokenSymbols[i];
        }
    }

    function getRequiredPaymentTokenAmountWithDistribution(
        string memory destinationChainId,
        uint256 gasWillBeUsed,
        address paymentToken
    ) public view returns (uint256, uint256[] memory) {
        // Get the gas price of the destination token from the Chainlink aggregator
        (, int256 latestAnswer, , , ) = chainlinkAggregator.latestRoundData();
        uint256 destinationTokenGasPrice = uint256(latestAnswer);

        // Calculate the required destination chain native token amount
        uint256 requiredNativeTokenAmount = gasWillBeUsed * destinationTokenGasPrice;

        // Use the 1inch aggregator to estimate the required payment token amount
        (address destinationNativeTokenAddress,) = _getDestinationNativeTokenInfo(destinationChainId);
        (uint256 expectedReturn, uint256[] memory distribution) = oneInchAggregator.getExpectedReturn(
            destinationNativeTokenAddress,
            paymentToken,
            requiredNativeTokenAmount,
            0,
            0
        );
        return (expectedReturn, distribution);
    }

    function swapAndBridge(
        bytes32 requestId,
        string memory destinationChainId,
        uint256 gasWillBeUsed,
        address paymentTokenAddress,
        uint256 paymentTokenAmount,
        uint256[] memory distribution
    ) public payable {
        // Swap payment token to destination chain native token using 1inch aggregator
        (address destinationNativeTokenAddress, string memory destinationNativeTokenSymbol) = _getDestinationNativeTokenInfo(destinationChainId);

        IERC20(paymentTokenAddress).transferFrom(msg.sender, address(this), paymentTokenAmount);
        IERC20(paymentTokenAddress).approve(address(oneInchAggregator), paymentTokenAmount);

        uint256 destinationChainNativeTokenAmount = oneInchAggregator.swap(
            paymentTokenAddress,
            destinationNativeTokenAddress,
            paymentTokenAmount,
            gasWillBeUsed,
            distribution,
            0
        );

        // Send the native token to the destination chain using the Axelar gateway
        IERC20(destinationNativeTokenAddress).approve(address(gateway), destinationChainNativeTokenAmount);

        if (msg.value > 0) {
            IAxelarGasService(axelarGasServiceAddress)
                .payNativeGasForContractCallWithToken{ value: msg.value }(
                address(gateway),
                paymentTokenAddress,
                paymentTokenAmount
            );
        }

        bytes memory payload = abi.encode(requestId);
        gateway.callContractWithToken(
            destinationChainId,
            Strings.toHexString(address(this)),
            payload,
            destinationNativeTokenSymbol,
            destinationChainNativeTokenAmount
        );
    }

    function _getDestinationNativeTokenInfo(string memory chainId) private view returns (address, string memory) {
        address nativeTokenAddress = destinationChainNativeTokenAddresses[chainId];
        string memory nativeTokenSymbol = destinationChainNativeTokenSymbols[chainId];
        return (nativeTokenAddress, nativeTokenSymbol);
    }
}
