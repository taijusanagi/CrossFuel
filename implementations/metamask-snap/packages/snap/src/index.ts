/* eslint-disable no-case-declarations */
import { UserOperationStruct } from '@account-abstraction/contracts';
import { resolveProperties } from 'ethers/lib/utils';
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, text } from '@metamask/snaps-ui';
import { ethers } from 'ethers';
import {
  HttpRpcClient,
  SimpleAccountAPI,
  PaymasterAPI,
} from '@account-abstraction/sdk';

import deployments from '../../truffle/deployments.json';

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

class VerifyingPaymasterAPI extends PaymasterAPI {
  override async getPaymasterAndData(userOp: Partial<UserOperationStruct>) {
    const resolvedUserOp = await resolveProperties(userOp);
    const parsedUserOp = {
      ...resolvedUserOp,
    };
    const method = 'POST';
    const headers = {
      'Content-Type': 'application/json',
    };
    const { paymasterAndData } = await fetch('http://localhost:8001/sign', {
      method,
      headers,
      body: JSON.stringify({
        userOp: parsedUserOp,
      }),
    }).then((res) => res.json());
    return paymasterAndData;
  }
}

const paymasterAPI = new VerifyingPaymasterAPI();

export const getAbstractAccount = async (): Promise<SimpleAccountAPI> => {
  const { entryPointAddress, factoryAddress } = deployments;

  const provider = new ethers.providers.Web3Provider(ethereum as any);
  const owner = provider.getSigner();

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
  switch (request.method) {
    case 'hello':
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
    case 'get_eoa_address': {
      const provider = new ethers.providers.Web3Provider(ethereum as any);
      const accounts = await provider.send('eth_requestAccounts', []);
      return accounts[0];
    }

    case 'get_aa_address': {
      const aa = await getAbstractAccount();
      const address = await aa.getAccountAddress();
      return address;
    }

    case 'send_aa_tx': {
      const target = '0xa8dBa26608565e1F69d81Efae4cbB5cB8e87013d';
      const snapConfirmResult = await snap.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: 'Transfer',
            description: 'Transfer from your Abstraction Account',
            textAreaContent: `target: ${target}`,
          },
        ],
      });
      if (!snapConfirmResult) {
        return null;
      }
      const aa = await getAbstractAccount();
      const bundler = new HttpRpcClient(
        'http://localhost:3000/rpc',
        '0x0576a174D229E3cFA37253523E645A78A0C91B57',
        5,
      );
      const op1 = await aa.createSignedUserOp({
        target,
        data: '0x',
        maxFeePerGas: 0x6507a5d0,
        maxPriorityFeePerGas: 0x6507a5c0,
      });
      const resolvedUserOp1 = await resolveProperties(op1);
      // @dev: This is fix preVerificationGas too low bug
      // https://github.com/eth-infinitism/bundler/pull/7
      resolvedUserOp1.preVerificationGas = 100000;
      resolvedUserOp1.paymasterAndData = await paymasterAPI.getPaymasterAndData(
        resolvedUserOp1,
      );
      const op2 = await aa.signUserOp(resolvedUserOp1);
      const resolvedUserOp2 = await resolveProperties(op2);
      const sendUserOpToBundlerResult = await bundler.sendUserOpToBundler(
        resolvedUserOp2,
      );
      return sendUserOpToBundlerResult;
    }
    default:
      throw new Error('Method not found.');
  }
};
