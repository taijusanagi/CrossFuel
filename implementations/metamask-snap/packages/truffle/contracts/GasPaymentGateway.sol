// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// @dev
// copied minimum interfaces
import "./interfaces/IAxelarGasService.sol";
// @dev this is included in Axelar sdk
import "./interfaces/IChainlinkAggregator.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IOneInchAggregator.sol";

contract GasPaymentGateway is AxelarExecutable {
    IOneInchAggregator public immutable oneInchAggregator;
    IChainlinkAggregator public immutable chainlinkAggregator;
    address public immutable oneInchRouterAddress;
    address public immutable axelarGasServiceAddress;

    mapping(string => address) public destinationChainNativeTokenAddresses;
    mapping(string => string) public destinationChainNativeTokenSymbols;

    constructor(
        address _gateway,
        address _oneInchAggregatorAddress,
        address _chainlinkAggregatorAddress,
        address _oneInchRouterAddress,
        address _axelarGasServiceAddress,
        string[] memory _destinationChainIds,
        address[] memory _destinationChainNativeTokenAddresses,
        string[] memory _destinationChainNativeTokenSymbols
    ) AxelarExecutable(_gateway) {
        oneInchAggregator = IOneInchAggregator(_oneInchAggregatorAddress);
        chainlinkAggregator = IChainlinkAggregator(_chainlinkAggregatorAddress);
        oneInchRouterAddress = _oneInchRouterAddress;
        axelarGasServiceAddress = _axelarGasServiceAddress;
        for (uint256 i = 0; i < _destinationChainIds.length; i++) {
            destinationChainNativeTokenAddresses[_destinationChainIds[i]] = _destinationChainNativeTokenAddresses[i];
            destinationChainNativeTokenSymbols[_destinationChainIds[i]] = _destinationChainNativeTokenSymbols[i];
        }
    }

    function getRequiredPaymentTokenAmountWithDistribution(
        string memory destinationChainId,
        uint256 gasWillBeUsed,
        uint256 paymentTokenAmount,
        address paymentToken
    ) public view returns (uint256, uint256[] memory) {
        // Get the gas price of the destination token from the Chainlink aggregator
        (, int256 latestAnswer, , , ) = chainlinkAggregator.latestRoundData();
        uint256 destinationTokenGasPrice = uint256(latestAnswer);

        // Calculate the required destination chain native token amount
        uint256 requiredNativeTokenAmount = gasWillBeUsed * destinationTokenGasPrice;

        // Use the 1inch aggregator to estimate the required payment token amount
        address destinationNativeToken = _getDestinationAddress(destinationChainId);
        (uint256 expectedReturn, uint256[] memory distribution) = oneInchAggregator.getExpectedReturn(
            paymentToken,
            destinationNativeToken,
            paymentTokenAmount,
            requiredNativeTokenAmount,
            0
        );
        return (expectedReturn, distribution);
    }

    function swapAndBridge(
        bytes32 requestId,
        string memory destinationChainId,
        uint256 gasWillBeUsed,
        uint256 paymentTokenAmount,
        address paymentTokenAddress
    ) public payable {
        // Swap payment token to destination chain native token using 1inch aggregator
        (address destinationNativeToken, string memory destinationNative) = _getDestinationTokenInfo(destinationChainId);
        (uint256 expectedReturn, uint256[] memory distribution) = getRequiredPaymentTokenAmountWithDistribution(destinationChainId, gasWillBeUsed, paymentTokenAmount, paymentTokenAddress);
        uint256 requiredPaymentTokenAmount = expectedReturn;

        uint256 destinationChainNativeTokenAmount = oneInchAggregator.swap(
            paymentTokenAddress,
            destinationNativeToken,
            paymentTokenAmount,
            requiredPaymentTokenAmount,
            distribution,
            0
        );

        // Send the native token to the destination chain using the Axelar gateway
        IERC20(destinationNativeToken).approve(address(gateway), destinationChainNativeTokenAmount);
        bytes memory payload = abi.encode(requestId);

        if (msg.value > 0) {
            IAxelarGasService(axelarGasServiceAddress)
                .payNativeGasForContractCallWithToken{ value: msg.value }(
                address(gateway),
                paymentTokenAddress,
                paymentTokenAmount
            );
        }

        gateway.callContractWithToken(
            destinationChainId,
            Strings.toHexString(address(this)),
            payload,
            destinationNative,
            destinationChainNativeTokenAmount
        );
    }

    function _getDestinationTokenInfo(string memory chainId) private view returns (address, string memory) {
        address nativeTokenAddress = destinationChainNativeTokenAddresses[chainId];
        string memory nativeTokenSymbol = destinationChainNativeTokenSymbols[chainId];
        return (nativeTokenAddress, nativeTokenSymbol);
    }

    function _getDestinationAddress(string memory chainId) private view returns (address) {
        return destinationChainNativeTokenAddresses[chainId];
    }

    function _getDestinationSymbol(string memory chainId) private view returns (string memory) {
        return destinationChainNativeTokenSymbols[chainId];
    }
}
