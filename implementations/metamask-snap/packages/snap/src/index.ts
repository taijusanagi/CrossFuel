/* eslint-disable no-case-declarations */
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, text } from '@metamask/snaps-ui';
import { ethers } from 'ethers';
import { HttpRpcClient, SimpleAccountAPI } from '@account-abstraction/sdk';

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

export const getAbstractAccount = async (): Promise<SimpleAccountAPI> => {
  // const { entryPointAddress, factoryAddress } = deployments;

  const entryPointAddress = '0x0576a174D229E3cFA37253523E645A78A0C91B57';
  const factoryAddress = '0x09c58cf6be8E25560d479bd52B4417d15bCA2845';

  const provider = new ethers.providers.Web3Provider(ethereum as any);
  const owner = provider.getSigner();
  const aa = new SimpleAccountAPI({
    provider,
    entryPointAddress,
    owner,
    factoryAddress,
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
      const aa = await getAbstractAccount();

      const bundler = new HttpRpcClient(
        'http://localhost:3000/rpc',
        '0x0576a174D229E3cFA37253523E645A78A0C91B57',
        5,
      );

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

      const op = await aa.createSignedUserOp({
        target,
        data: '0x',
        maxFeePerGas: 0x6507a5d0,
        maxPriorityFeePerGas: 0x6507a5c0,
      });

      console.log(op);

      const sendUserOpToBundlerResult = await bundler.sendUserOpToBundler(op);
      console.log(sendUserOpToBundlerResult);
      return sendUserOpToBundlerResult;
    }
    default:
      throw new Error('Method not found.');
  }
};
