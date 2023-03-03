/* eslint-disable camelcase */
/* eslint-disable no-case-declarations */
import {
  UserOperationStruct,
  EntryPoint__factory,
} from '@account-abstraction/contracts';
import { resolveProperties } from 'ethers/lib/utils';
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, copyable, text, heading, divider } from '@metamask/snaps-ui';

import { ethers } from 'ethers';
import {
  HttpRpcClient,
  SimpleAccountAPI,
  PaymasterAPI,
} from '@account-abstraction/sdk';

import { getBIP44AddressKeyDeriver } from '@metamask/key-tree';
import deployments from '../../truffle/deployments.json';
import MockERC20Json from '../../truffle/build/MockERC20.json';
/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */

const entryPoint = '0x0576a174D229E3cFA37253523E645A78A0C91B57';
const bundlerUrls = {
  '5': 'http://localhost:3000/rpc',
  '80001': 'http://localhost:3001/rpc',
};
const chainName = {
  '5': 'goerli',
  '80001': 'polygon-mumbai',
};
type ChainId = keyof typeof bundlerUrls;
let currentChainId: ChainId | null;

// TODO: replace with defender address
const bundlerSigner = '0xa8dBa26608565e1F69d81Efae4cbB5cB8e87013d';
const verifyingPaymasterSigner = '0x7f5aa4c071671ad22edc02bb8a081418bb6c484f';
const fundManager = verifyingPaymasterSigner;

// TODO: move to safe place
const infuraProjectId = 'eedaad734dce46a4b08816a7f6df0b9b';

const tenderlyApiKey = 'LQCz-SOOynktbBecKFBpduGtnkCVFNiR';
const tenderlyUser = 'taijusanagi';
const tenderlyProject = 'hackathon';

const isChainId = (value: string): value is ChainId => {
  return Object.keys(bundlerUrls).includes(value);
};

const getConnectedProvider = () => {
  return new ethers.providers.Web3Provider(ethereum as any);
};

const getConnectedChainId = async (): Promise<ChainId> => {
  const provider = getConnectedProvider();
  const { chainId } = await provider.getNetwork();
  const chainIdString = chainId.toString();
  if (!isChainId(chainIdString)) {
    throw new Error(`Invalid chain ID: ${chainId}`);
  }
  return chainIdString;
};

const getJsonPRCProviderByChainId = (chainId: ChainId) => {
  return new ethers.providers.JsonRpcProvider(
    `https://${chainName[chainId]}.infura.io/v3/${infuraProjectId}`,
  );
};

const getSignerFromDerivedPrivateKey = async (chainId?: ChainId) => {
  // TODO: currently, only supports accounts[0] in metamask default account
  //       let's think about better private key creation way later
  const ethereumNode = await snap.request({
    method: 'snap_getBip44Entropy',
    params: {
      coinType: 60, // this is Ethereum type
    },
  });

  const derivedEthereumKeyDriver = await getBIP44AddressKeyDeriver(
    ethereumNode as any,
  );

  const { privateKey } = await derivedEthereumKeyDriver(0);

  if (!privateKey) {
    throw new Error('Private key is null or undefined');
  }

  const signer = new ethers.Wallet(privateKey);

  if (chainId) {
    const provider = getJsonPRCProviderByChainId(chainId);
    signer.connect(provider);
  }

  return signer;
};

class VerifyingPaymasterAPI extends PaymasterAPI {
  override async getPaymasterAndData(userOp: Partial<UserOperationStruct>) {
    console.log('VerifyingPaymasterAPI - getPaymasterAndData');
    console.log('currentChainId', currentChainId);
    const resolvedUserOp = await resolveProperties(userOp);
    const parsedUserOp = {
      ...resolvedUserOp,
    };
    const chainId = currentChainId;
    const method = 'POST';
    const headers = {
      'Content-Type': 'application/json',
    };
    const { paymasterAndData } = await fetch('http://localhost:8001/sign', {
      method,
      headers,
      body: JSON.stringify({
        userOp: parsedUserOp,
        chainId,
      }),
    }).then((res) => res.json());
    return paymasterAndData;
  }
}

const paymasterAPI = new VerifyingPaymasterAPI();

export const getAbstractAccount = async (
  chainId: ChainId,
): Promise<SimpleAccountAPI> => {
  console.log('getAbstractAccount');
  const { entryPointAddress, factoryAddress } = deployments;

  const provider = getJsonPRCProviderByChainId(chainId);
  const owner = await getSignerFromDerivedPrivateKey();

  const aa = new SimpleAccountAPI({
    provider,
    entryPointAddress,
    owner,
    factoryAddress,
    paymasterAPI,
  });
  return aa;
};

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  console.log('onRpcRequest');
  switch (request.method) {
    // This is the original code and should be kept as a reference for future use.
    case 'hello':
      console.log('hello');
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'Confirmation',
          content: panel([
            text(`Hello, **${origin}**!`),
            text('This custom confirmation is just for display purposes.'),
            text(
              'But you can edit the snap source code to make it do something, if you want to!',
            ),
          ]),
        },
      });
    case 'aa_getExternalOwnedAccount': {
      console.log('aa_getExternalOwnedAccount');
      const signer = await getSignerFromDerivedPrivateKey();
      return await signer.getAddress();
    }

    case 'aa_getAbstractAccount': {
      console.log('aa_getAbstractAccount');
      const chainId = await getConnectedChainId();
      const connectedAbstractAccount = await getAbstractAccount(chainId);
      return await connectedAbstractAccount.getAccountAddress();
    }

    case 'send_aa_sendTransactionWithCrossFuel': {
      console.log('send_aa_sendTransactionWithCrossFuel');

      const { target, data, gasPaymentChainId, gasPaymentToken } =
        request.params as {
          target: string;
          data: string;
          gasPaymentChainId: ChainId;
          gasPaymentToken: string;
        };

      const connectedChainId = await getConnectedChainId();

      console.log('confirm transaction...');
      const snapConfirmResult = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'Confirmation',
          content: panel([
            heading('Account Abstraction with Cross-Chain Gas Payment'),
            text(
              'By approving this request, you are authorizing Metamask Snap to access your private key and create a cross-chain batch transaction with gas payment.',
            ),
            heading('Gas Payment'),
            text('ChainId:'),
            copyable(gasPaymentChainId),
            text('Gas Payment Token:'),
            copyable(gasPaymentToken),
            heading('Execute'),
            text('ChainId:'),
            copyable(connectedChainId),
            text('Target Address:'),
            copyable(target),
            text('Transaction Data:'),
            copyable(data),
            text('Transaction Value:'),
            copyable('0'),
          ]),
        },
      });

      if (!snapConfirmResult) {
        return null;
      }

      console.log('init aa wallet');
      const gasPaymentAbstractAccount = await getAbstractAccount(
        gasPaymentChainId,
      );
      const executeAbstractAccount = await getAbstractAccount(connectedChainId);

      const aaAccount = await executeAbstractAccount.getAccountAddress();
      console.log('aaAccount', aaAccount);

      console.log('init aa bundlers');
      const gasPaymentChainBundler = new HttpRpcClient(
        bundlerUrls['5'],
        entryPoint,
        5,
      );

      const executeChainBundler = new HttpRpcClient(
        bundlerUrls[connectedChainId],
        entryPoint,
        parseInt(connectedChainId, 10),
      );

      console.log('process gas payment tx');

      let paymentTokenAmount = '0';
      if (gasPaymentToken === deployments.mockERC20Address) {
        paymentTokenAmount = ethers.utils.parseEther('0.01').toString();
      } else {
        paymentTokenAmount = ethers.utils.parseEther('0.01').toString();
      }

      currentChainId = gasPaymentChainId;
      const mockERO20 = new ethers.Contract(gasPaymentToken, MockERC20Json.abi);

      const gasPaymentData = mockERO20.interface.encodeFunctionData(
        'transfer',
        [verifyingPaymasterSigner, paymentTokenAmount],
      );

      const gasPaymentOp1 = await gasPaymentAbstractAccount.createSignedUserOp({
        target: gasPaymentToken,
        data: gasPaymentData,
        maxFeePerGas: 0x6507a5d0,
        maxPriorityFeePerGas: 0x6507a5c0,
      });

      const resolveGasPaymentUserOp1 = await resolveProperties(gasPaymentOp1);
      // @dev: This is fix preVerificationGas too low bug
      // https://github.com/eth-infinitism/bundler/pull/7
      resolveGasPaymentUserOp1.preVerificationGas = 100000;

      resolveGasPaymentUserOp1.paymasterAndData =
        await paymasterAPI.getPaymasterAndData(resolveGasPaymentUserOp1);

      const gasPaymentOp2 = await gasPaymentAbstractAccount.signUserOp(
        resolveGasPaymentUserOp1,
      );
      const resolvedGasPaymentUserOp2 = await resolveProperties(gasPaymentOp2);

      console.log('process execute tx', target, data);
      currentChainId = connectedChainId;
      const executeOp1 = await executeAbstractAccount.createSignedUserOp({
        target,
        data,
        maxFeePerGas: 0x6507a5d0,
        maxPriorityFeePerGas: 0x6507a5c0,
      });

      const resolvedExecuteUserOp1 = await resolveProperties(executeOp1);
      // @dev: This is fix preVerificationGas too low bug
      // https://github.com/eth-infinitism/bundler/pull/7
      resolvedExecuteUserOp1.preVerificationGas = 100000;

      resolvedExecuteUserOp1.paymasterAndData =
        await paymasterAPI.getPaymasterAndData(resolvedExecuteUserOp1);
      const executeOp2 = await executeAbstractAccount.signUserOp(
        resolvedExecuteUserOp1,
      );

      // executeAbstractAccount.
      const resolvedExecuteUserOp2 = await resolveProperties(executeOp2);

      currentChainId = null;
      console.log('resolvedGasPaymentUserOp2', resolvedGasPaymentUserOp2);
      console.log('resolvedExecuteUserOp2', resolvedExecuteUserOp2);

      // console.log('simulation...');

      // const tenderlyURL = `https://api.tenderly.co/api/v1/account/${tenderlyUser}/project/${tenderlyProject}/simulate`;
      // const entryPointInterface = new ethers.utils.Interface(
      //   EntryPoint__factory.abi,
      // );

      // const gasPaymentInput = entryPointInterface.encodeFunctionData(
      //   'handleOps',
      //   [[resolvedGasPaymentUserOp2], fundManager],
      // );

      // const tenderlySimulationOnGasPaymentResponse = await fetch(tenderlyURL, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'X-Access-Key': tenderlyApiKey,
      //   },
      //   body: JSON.stringify({
      //     /* Simulation Configuration */
      //     save: false, // if true simulation is saved and shows up in the dashboard
      //     save_if_fails: false, // if true, reverting simulations show up in the dashboard
      //     simulation_type: 'full', // full or quick (full is default)
      //     network_id: gasPaymentChainId, // network to simulate on
      //     /* Standard EVM Transaction object */
      //     from: bundlerSigner,
      //     to: deployments.entryPointAddress,
      //     input: gasPaymentInput,
      //     gas: 1000000,
      //     gas_price: resolvedGasPaymentUserOp2.maxFeePerGas.toString(),
      //     value: 0,
      //   }),
      // }).then((response) => response.json());

      // const executeInput = entryPointInterface.encodeFunctionData('handleOps', [
      //   [resolvedExecuteUserOp2],
      //   fundManager,
      // ]);

      // const tenderlySimulationOnExecuteResponse = await fetch(tenderlyURL, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'X-Access-Key': tenderlyApiKey,
      //   },
      //   body: JSON.stringify({
      //     /* Simulation Configuration */
      //     save: false, // if true simulation is saved and shows up in the dashboard
      //     save_if_fails: false, // if true, reverting simulations show up in the dashboard
      //     simulation_type: 'full', // full or quick (full is default)
      //     network_id: connectedChainId, // network to simulate on
      //     /* Standard EVM Transaction object */
      //     from: bundlerSigner,
      //     to: deployments.entryPointAddress,
      //     input: executeInput,
      //     gas: 1000000,
      //     gas_price: resolvedExecuteUserOp2.maxFeePerGas.toString(),
      //     value: 0,
      //   }),
      // }).then((response) => response.json());

      // console.log(
      //   'tenderlySimulationOnGasPaymentResponse',
      //   tenderlySimulationOnGasPaymentResponse,
      // );

      // console.log(
      //   'tenderlySimulationOnExecuteResponse',
      //   tenderlySimulationOnExecuteResponse,
      // );

      // if (
      //   tenderlySimulationOnGasPaymentResponse.error ||
      //   tenderlySimulationOnExecuteResponse.error
      // ) {
      //   return null;
      // }

      // // TODO: implement balance diff
      // // const gasPaymentBalanceChange =
      // //   tenderlySimulationOnGasPaymentResponse.transaction.transaction_info.balance_diff.filter(
      // //     (balanceDiff: { address: string }) =>
      // //       balanceDiff.address === aaAccount,
      // //   );

      // const formatTenderlySimlationLog = (log: any) => {
      //   const name = log.name ? log.name : 'unknown';
      //   const inputs = log.inputs
      //     ? log.inputs.map((input: any) => [
      //         text(input.soltype.name),
      //         copyable(input.value.toString()),
      //       ])
      //     : [];
      //   return panel([
      //     heading(`${name} at`),
      //     copyable(log.raw.address),
      //     ...inputs.flat(),
      //   ]);
      // };

      // const formattedTenderlySimulationOnGasPaymentResponse =
      //   tenderlySimulationOnGasPaymentResponse.transaction.transaction_info.logs.map(
      //     (log: any) => {
      //       return formatTenderlySimlationLog(log);
      //     },
      //   );

      // const formattedTenderlySimulationOnExecuteResponse =
      //   tenderlySimulationOnExecuteResponse.transaction.transaction_info.logs.map(
      //     (log: any) => {
      //       return formatTenderlySimlationLog(log);
      //     },
      //   );

      // const simlationResultConfirmResult = await snap.request({
      //   method: 'snap_dialog',
      //   params: {
      //     type: 'Confirmation',
      //     content: panel([
      //       heading('Transaction Simulation with Tenderly'),
      //       divider(),
      //       heading(`Gas payment made on chain ID: ${gasPaymentChainId}`),
      //       // text('Balance diff change:'),
      //       // text('detail...'),
      //       ...formattedTenderlySimulationOnGasPaymentResponse,
      //       divider(),
      //       heading(`Transaction made on chain ID: ${connectedChainId}`),
      //       // text('Balance diff  change:'),
      //       // text('detail...'),
      //       ...formattedTenderlySimulationOnExecuteResponse,
      //     ]),
      //   },
      // });

      // if (!simlationResultConfirmResult) {
      //   return null;
      // }

      console.log('send to bundler...');

      const [
        sendGasPaymentUserOpToBundlerResult,
        sendExecuteUserOpToBundlerResult,
      ] = await Promise.all([
        gasPaymentChainBundler.sendUserOpToBundler(resolvedGasPaymentUserOp2),
        executeChainBundler.sendUserOpToBundler(resolvedExecuteUserOp2),
      ]);

      console.log(
        'sendGasPaymentUserOpToBundlerResult',
        sendGasPaymentUserOpToBundlerResult,
      );

      console.log(
        'sendExecuteUserOpToBundlerResult',
        sendExecuteUserOpToBundlerResult,
      );

      return {
        sendGasPaymentUserOpToBundlerResult,
        sendExecuteUserOpToBundlerResult,
      };
    }
    default:
      throw new Error('Method not found.');
  }
};
