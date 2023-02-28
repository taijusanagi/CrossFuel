const { expect } = require('chai');
const { ethers } = require('ethers');
const { BigNumber } = ethers;

const GasPaymentGateway = artifacts.require('GasPaymentGateway');
const MockOneInchAggregator = artifacts.require('MockOneInchAggregator');
const MockChainlinkAggregator = artifacts.require('MockChainlinkAggregator');
const MockAxelarGasService = artifacts.require('MockAxelarGasService');
const MockAxelarGateway = artifacts.require('MockAxelarGateway');
const MockERC20 = artifacts.require('ERC20');

contract('GasPaymentGateway', function ([owner, gasPaymentRecipient, user]) {
  const DEFAULT_DECIMALS = 18;
  const DEFAULT_BALANCE = BigNumber.from(10).pow(6 + DEFAULT_DECIMALS);

  const MOCK_DESTINATION_CHAIN_ID = 1234;
  const MOCK_DESTINATION_CHAIN_NATIVE_TOKEN =
    '0x000000000000000000000000000000000000dead';
  const MOCK_DESTINATION_CHAIN_NATIVE_TOKEN_SYMBOL = 'DEAD';

  let oneInchAggregator, chainlinkAggregator, axelarGasService, axelarGateway;
  let gasPaymentGateway, paymentToken;
  let mockDestinationChainNativeToken;

  beforeEach(async function () {
    oneInchAggregator = await MockOneInchAggregator.new();
    chainlinkAggregator = await MockChainlinkAggregator.new();
    axelarGasService = await MockAxelarGasService.new();
    axelarGateway = await MockAxelarGateway.new();

    paymentToken = await MockERC20.new(
      'Payment Token',
      'PAY',
      DEFAULT_DECIMALS,
      DEFAULT_BALANCE,
    );
    mockDestinationChainNativeToken = await MockERC20.new(
      'Mock Token',
      'MCK',
      DEFAULT_DECIMALS,
      DEFAULT_BALANCE,
    );

    gasPaymentGateway = await GasPaymentGateway.new(
      axelarGateway.address,
      oneInchAggregator.address,
      chainlinkAggregator.address,
      ethers.constants.AddressZero,
      axelarGasService.address,
      gasPaymentRecipient,
      [MOCK_DESTINATION_CHAIN_ID],
      [MOCK_DESTINATION_CHAIN_NATIVE_TOKEN],
      [MOCK_DESTINATION_CHAIN_NATIVE_TOKEN_SYMBOL],
    );

    await paymentToken.transfer(user, DEFAULT_BALANCE.div(10));
    await paymentToken
      .connect(user)
      .approve(gasPaymentGateway.address, DEFAULT_BALANCE.div(20));
  });

  describe('getRequiredPaymentTokenAmountWithDistribution', function () {
    it('should return required payment token amount with distribution', async function () {
      const gasWillBeUsed = 100;
      const paymentTokenAmount = DEFAULT_BALANCE.div(20);
      const swapAmounts = [0, 0, 0];

      const [expectedReturn, distribution] =
        await gasPaymentGateway.getRequiredPaymentTokenAmountWithDistribution(
          MOCK_DESTINATION_CHAIN_ID,
          gasWillBeUsed,
          paymentTokenAmount,
          swapAmounts,
          paymentToken.address,
        );

      expect(expectedReturn).to.be.gt(0);
      expect(distribution.length).to.eq(swapAmounts.length);
    });
  });

  describe('swapAndBridge', function () {
    it('should swap payment token to destination native token and bridge to the destination chain using Axelar gateway', async () => {
      // Set up mock values
      const requestId = ethers.utils.formatBytes32String('123');
      const destinationChainId = 2;
      const gasWillBeUsed = 100000;
      const paymentTokenAmount = ethers.utils.parseEther('1');
      const swapAmounts = [0, 0];
      const paymentTokenAddress = paymentTokenMock.address;
      const expectedReturn = ethers.utils.parseEther('10');
      const distribution = [10000, 0, 0];

      // Set up expected values
      const destinationNativeToken = destinationNativeTokenMock.address;
      const destinationChainNativeTokenAmount = ethers.utils.parseEther('1');

      // Mock external function calls
      chainlinkAggregatorMock.mock.latestRoundData.returns(0, 1000000, 0, 0, 0);
      oneInchAggregatorMock.mock.getExpectedReturn.returns(
        expectedReturn,
        distribution,
      );
      oneInchAggregatorMock.mock.swap.returns(
        destinationChainNativeTokenAmount,
      );

      // Make the function call
      await gasPaymentGateway.swapAndBridge(
        requestId,
        destinationChainId,
        gasWillBeUsed,
        paymentTokenAmount,
        swapAmounts,
        paymentTokenAddress,
        { value: ethers.utils.parseEther('0.1') },
      );

      // Check the mock contract state
      expect(paymentTokenMock.mock.allowance).to.have.been.calledWith(
        gasPaymentGateway.address,
        oneInchRouterAddress,
      );
      expect(destinationNativeTokenMock.mock.approve).to.have.been.calledWith(
        gatewayMock.address,
        destinationChainNativeTokenAmount,
      );
      expect(gatewayMock.mock.callContractWithToken).to.have.been.calledWith(
        destinationChainId,
        gasPaymentRecipient,
        ethers.utils.defaultAbiCoder.encode(['bytes32'], [requestId]),
        destinationNativeToken,
        destinationChainNativeTokenAmount,
      );
    });
  });
});
