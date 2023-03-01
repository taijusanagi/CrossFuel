const { expect } = require('chai');
const { ethers } = require('ethers');

// Import contracts
const GasPaymentGateway = artifacts.require('GasPaymentGateway');

const MockAxelarGasService = artifacts.require('MockAxelarGasService');
const MockAxelarGateway = artifacts.require('MockAxelarGateway');
const MockChainlinkAggregator = artifacts.require('MockChainlinkAggregator');
const MockERC20 = artifacts.require('MockERC20');
const MockOneInchAggregator = artifacts.require('MockOneInchAggregator');

contract('GasPaymentGateway', (accounts) => {
  const GAS_PRICE = ethers.utils.parseUnits('10', 'gwei');

  let gasPaymentGateway;
  let mockAxelarGasService;
  let mockAxelarGateway;
  let mockOneInchAggregator;
  let mockChainlinkAggregator;

  let destinationChainIds;
  let destinationChainNativeTokenAddresses;
  let destinationChainNativeTokenSymbols;

  beforeEach(async () => {
    // Deploy mock contracts
    mockAxelarGasService = await MockAxelarGasService.new();
    mockAxelarGateway = await MockAxelarGateway.new();
    mockOneInchAggregator = await MockOneInchAggregator.new();
    mockChainlinkAggregator = await MockChainlinkAggregator.new(GAS_PRICE);
    paymentToken = await MockERC20.new('', '');
    ethNativeToken = await MockERC20.new('', '');
    polygonNativeToken = await MockERC20.new('', '');

    destinationChainIds = ['eth', 'polygon'];
    destinationChainNativeTokenSymbols = {
      eth: 'ETH',
      polygon: 'MATIC',
    };
    destinationChainNativeTokenAddresses = {
      eth: ethNativeToken.address,
      polygon: polygonNativeToken.address,
    };
    await mockAxelarGateway.setTokenAddress(
      destinationChainNativeTokenSymbols.eth,
      destinationChainNativeTokenAddresses.eth,
    );
    await mockAxelarGateway.setTokenAddress(
      destinationChainNativeTokenSymbols.polygon,
      destinationChainNativeTokenAddresses.polygon,
    );
    // Deploy GasPaymentGateway contract
    gasPaymentGateway = await GasPaymentGateway.new(
      mockAxelarGateway.address,
      mockOneInchAggregator.address,
      mockChainlinkAggregator.address,
      mockAxelarGasService.address,
      destinationChainIds,
      Object.values(destinationChainNativeTokenAddresses),
      Object.values(destinationChainNativeTokenSymbols),
    );
  });

  it('getRequiredPaymentTokenAmountWithDistribution', async function () {
    const destinationChainId = 'eth';
    const gasWillBeUsed = ethers.BigNumber.from(100000);
    const gasPrice = ethers.utils.parseUnits('10', 'gwei');
    const destribution = [0];
    const rate = 5;
    await mockChainlinkAggregator.setLatestAnswer(gasPrice);
    await mockOneInchAggregator.setDistribution(destribution);
    await mockOneInchAggregator.setRate(rate);
    const result =
      await gasPaymentGateway.getRequiredPaymentTokenAmountWithDistribution(
        destinationChainId,
        gasWillBeUsed,
        paymentToken.address,
      );
    expect(result['0'].toString()).to.equal(
      gasWillBeUsed.mul(gasPrice).mul(rate).toString(),
    );
  });

  it('swapAndBridge', async function () {
    const destinationChainId = 'eth';
    const gasWillBeUsed = ethers.BigNumber.from(100000);
    const gasPrice = ethers.utils.parseUnits('10', 'gwei');
    const destribution = [0];
    const rate = 5;
    await mockChainlinkAggregator.setLatestAnswer(gasPrice);
    await mockOneInchAggregator.setDistribution(destribution);
    await mockOneInchAggregator.setRate(rate);
    const getRequiredPaymentTokenAmountWithDistributionResult =
      await gasPaymentGateway.getRequiredPaymentTokenAmountWithDistribution(
        destinationChainId,
        gasWillBeUsed,
        paymentToken.address,
      );

    const paymentTokenAmount =
      getRequiredPaymentTokenAmountWithDistributionResult['0'].toString();
    const distribution = getRequiredPaymentTokenAmountWithDistributionResult[
      '1'
    ].map((v) => v.toString());

    const requestId =
      '0x0000000000000000000000000000000000000000000000000000000000000001';

    await paymentToken.mint(accounts[0], paymentTokenAmount);
    await paymentToken.approve(gasPaymentGateway.address, paymentTokenAmount);
    await ethNativeToken.mint(mockOneInchAggregator.address, gasWillBeUsed);

    await gasPaymentGateway.swapAndBridge(
      requestId,
      destinationChainId,
      gasWillBeUsed,
      paymentToken.address,
      paymentTokenAmount,
      distribution,
    );
  });
});
