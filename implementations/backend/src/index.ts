import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ethers } from "ethers";

import { DefenderRelaySigner, DefenderRelayProvider } from "defender-relay-client/lib/ethers";

import deployments from "../../metamask-snap/packages/truffle/deployments.json";
import PaymasterJson from "../../metamask-snap/packages/truffle/build/VerifyingPaymaster.json";
import { verifyingPaymasterSigner, covalentApiKey } from "../../metamask-snap/packages/truffle/config.json";

import MockERC20Json from "../../metamask-snap/packages/truffle/build/MockERC20.json";
import networksJson from "../../metamask-snap/packages/truffle/networks.json";

import { Squid } from "@0xsquid/sdk";

// instantiate the SDK
const squid = new Squid({
  baseUrl: "https://testnet.api.0xsquid.com", // for mainnet use "https://api.0xsquid.com"
});

dotenv.config();

const port = process.env.PORT || "8001";

// @dev: keep local signer implementation for zkSync integration
// const mnemonicPhrase = process.env.MNEMONIC_PHRASE || "";
// const infuraProjectId = process.env.INFURA_PROJECT_ID;
const fundManager = verifyingPaymasterSigner;

const app: Express = express();
app.use(cors());
app.use(express.json());
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

import { ChainId, isChainId } from "../../common/types/ChainId";

const getDefenderSignerByChainId = (chainId: ChainId) => {
  const credentials =
    chainId == "5"
      ? { apiKey: process.env.DEFENDER_GOERLI_PAI_KEY || "", apiSecret: process.env.DEFENDER_GOERLI_SECRET_KEY || "" }
      : { apiKey: process.env.DEFENDER_MUMBAI_PAI_KEY || "", apiSecret: process.env.DEFENDER_MUMBAI_SECRET_KEY || "" };
  const provider = new DefenderRelayProvider(credentials);
  const signer = new DefenderRelaySigner(credentials, provider, { speed: "fast" });
  return { provider, signer };
};

app.get("/", async (req: Request, res: Response) => {
  console.log("hello");
  res.send("Hello");
});

app.get("/getSupportedPaymentTokens", async (req: Request, res: Response) => {
  console.log("getSupportedPaymentTokens");
  const { chainId } = req.query;
  if (typeof chainId !== "string" || !isChainId(chainId)) {
    res.send([]);
    return;
  }
  await squid.init();
  res.send(squid.tokens.filter((t) => t.chainId === parseInt(chainId)));
});

// @dev: This function calculates the required target gas amount based on the input parameters
app.get("/getRequiredPaymentTokenAmount", async (req: Request, res: Response) => {
  console.log("getRequiredAmountForSwap");
  const { gasPaymentChainId, gasPaymentToken, executeChainId, gasWillBeUsed } = req.query as any;

  console.log("gasPaymentChainId", gasPaymentChainId);
  console.log("gasPaymentToken", gasPaymentToken);
  console.log("executeChainId", executeChainId);
  console.log("gasWillBeUsed", gasWillBeUsed);

  await squid.init();

  // The recipient of the funds is always the fund manager, so we set the recipient variable to the fund manager's address. The fund manager will receive the native token of the execute chain as payment.
  const recipient = fundManager;
  const nativeTokenOnExecuteChain = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  const { provider } = getDefenderSignerByChainId(executeChainId);

  const gasPriceInDestinationChain = await provider.getGasPrice();
  console.log("gasPriceInDestinationChain", gasPriceInDestinationChain.toString());
  const requiredNativeTokenOnExecuteChain = gasPriceInDestinationChain.mul(gasWillBeUsed).toString();
  console.log("requiredNativeTokenOnExecuteChain", requiredNativeTokenOnExecuteChain);

  // TODO: consider Axelar fee and gas fee
  const {
    route: {
      estimate: { toAmount },
    },
  } = await squid.getRoute({
    fromChain: parseInt(executeChainId),
    fromToken: nativeTokenOnExecuteChain,
    fromAmount: requiredNativeTokenOnExecuteChain,
    toChain: parseInt(gasPaymentChainId),
    toToken: gasPaymentToken,
    toAddress: recipient,
    slippage: 1.0, // 1.00 = 1% max slippage across the entire route
    enableForecall: true, // instant execution service, defaults to true
    quoteOnly: false, // optional, defaults to false
  });
  console.log("requiredGasPaymentTokenAmount", toAmount);
  res.send({ requiredGasPaymentTokenAmount: toAmount });
});

app.post("/faucet", async (req: Request, res: Response) => {
  console.log("faucet");
  const { to, chainId } = req.body;
  // const { signer } = getSignerAndProviderForTargetChain(gasPaymentChainId);
  const { signer } = getDefenderSignerByChainId(chainId);
  const mockERO20 = new ethers.Contract(deployments.mockERC20Address, MockERC20Json.abi, signer);
  const currentBalance = await mockERO20.balanceOf(to);
  const amount = 99;
  const threshold = 1;
  if (currentBalance.gte(ethers.utils.parseEther(threshold.toString()))) {
    res.send({
      status: "error",
      message: `AA wallet already has enough payment token in Georli`,
    });
  } else {
    const { hash } = await mockERO20.mint(to, ethers.utils.parseEther(amount.toString()));
    res.send({ status: "success", message: `Georli ${amount} mock payment token is sent to AA wallet: ${hash}` });
  }
});

app.post("/sign", async (req: Request, res: Response) => {
  const { chainId, userOp } = req.body;
  console.log("sign chainId:", chainId);
  if (!userOp.signature) {
    console.log("user sign is null, return null paymaster signature");
  } else {
    console.log("return actual paymaster signature with user sign");
  }
  const { paymasterAddress } = deployments;
  // const { provider, signer } = getSignerAndProviderForTargetChain(chainId);
  const { provider, signer } = getDefenderSignerByChainId(chainId);
  const paymasterContract = new ethers.Contract(paymasterAddress, PaymasterJson.abi, provider);
  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);
  const { timestamp } = block;

  const validUntil = timestamp + 1800;
  const validAfter = timestamp;

  const parsePaymasterAndDataWithoutAddressAndSignature = ethers.utils.defaultAbiCoder.encode(
    ["uint48", "uint48"],
    [validUntil, validAfter]
  );

  // @dev: firstly, let user sign user operation without paymaster signature
  if (!userOp.signature) {
    const paymasterAndData = ethers.utils.hexConcat([
      paymasterAddress,
      parsePaymasterAndDataWithoutAddressAndSignature,
      "0x" + "00".repeat(65),
    ]);
    res.send({ paymasterAndData });
  } else {
    // @dev: secondly, paymaster sign user operation with user signature, then user sign with user operation with paymaster signature
    const paymasterAndData = await paymasterContract
      .getHash(userOp, validUntil, validAfter)
      .then(async (hash: string) => {
        // await relayer.sign({ message: hash }).then(({ sig: signature }) => {
        //   console.log("recover test:", ethers.utils.recoverAddress(hash, signature));
        // });

        const signature = await signer.signMessage(ethers.utils.arrayify(hash));
        const paymasterAndData = ethers.utils.hexConcat([
          paymasterAddress,
          parsePaymasterAndDataWithoutAddressAndSignature,
          signature,
        ]);
        return paymasterAndData;
      })
      .catch((e: Error) => {
        console.error(e.message);
        return "0x";
      });
    res.send({ paymasterAndData });
  }
});

// If the priority is for bridging, use Axelar to bridge the asset.
// If the priority is for swapping, use 1Inch to swap the asset.
// In the production environment, the priority could be mixed, so it is necessary to optimize the approach for efficiency.
const syncMode = "Bridge Prioritized"; // "Swap Prioritized"

app.get("/syncFuelBySwapAndBridge", async (req: Request, res: Response) => {
  console.log("syncFuelBySwapAndBridge");

  //TODO: check if the request is from auto task
  console.log("called from Defender auto task");

  await squid.init();

  let bridgingTokens: {
    chainId: number;
    symbol: string;
    contractAddress: string;
    balance: string;
  }[] = [];

  console.log("check Defender Relayer balance by Covalent API");
  for (const chainId of Object.keys(networksJson)) {
    const supportedTokens = squid.tokens.filter((t) => t.chainId === parseInt(chainId));
    // const chainData = networksJson[chainId];
    // const { key: chainName } = chainData;
    const { covalentKey } = networksJson[chainId as ChainId];
    // console.log(`=== ${covalentKey} ===`);
    if (covalentKey) {
      // Call the Covalent API with the chain name and API key

      const covalentResponse = await fetch(
        `https://api.covalenthq.com/v1/${covalentKey}/address/${verifyingPaymasterSigner}/balances_v2/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${covalentApiKey}`,
          },
        }
      )
        .then((response) => response.json())
        .then(({ data }) => {
          console.log(`Chain ${chainId} data:`);
          const { items } = data;

          // The Covalent API response may include "dust" balances, which are very small amounts of tokens
          // that are not worth tracking. We can remove these balances to improve efficiency.
          // However, it's currently not possible to remove dust balances for ETH on the Goerli network, so we will temporarily keep them in the response.
          const tokenBalances = items.map((item: any) => {
            const { contract_ticker_symbol, balance, contract_address } = item;
            console.log(`- ${contract_address} - ${balance} ${contract_ticker_symbol}`);
            return { chainId, symbol: contract_ticker_symbol, contractAddress: contract_address, balance };
          });
          return tokenBalances;
        })
        .catch((error) => {
          console.error(`Failed to fetch data for chain ${chainId}:`, error);
        });

      const matchingTokens = covalentResponse.filter((response: any) => {
        let address = response.contractAddress;
        // If the chainId is 5 and the contractAddress is "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", use the default address
        if (response.chainId === "5" && address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
          address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        }
        // If the chainId is 80001 and the contractAddress is "0x0000000000000000000000000000000000001010", use the default address
        if (response.chainId === "80001" && address === "0x0000000000000000000000000000000000001010") {
          address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        }
        return supportedTokens.some((token) => token.address.toLowerCase() === address.toLowerCase());
      });

      /*
        This algorithm aims to optimize transaction efficiency.
        For the purposes of this demo, if a payment token is available,
        it will be bridged to the opposite network.
      */
      bridgingTokens = bridgingTokens.concat(matchingTokens);
    }
  }

  console.log("=== execute path finder ===");
  console.log("syncMode", syncMode);
  if (syncMode === "Bridge Prioritized") {
    console.log("only bridge aUSDC for testnet demo");
    let flag = false;
    for (const matchingToken of bridgingTokens) {
      if (matchingToken.symbol === "aUSDC") {
        flag = true;
        const destinationChain = matchingToken.chainId === 5 ? 80001 : 5;

        console.log("from chain id:", matchingToken.chainId);
        console.log("from token address:", matchingToken.contractAddress);
        console.log("to chain id:", destinationChain);
        console.log("to token address:", "native");

        // console.log("token address:", matchingToken);
      }
    }

    if (flag) {
      console.log("=== execute bridge with Axelar ===");

      for (const matchingToken of bridgingTokens) {
        if (matchingToken.symbol === "aUSDC") {
          const destinationChain = matchingToken.chainId === 5 ? 80001 : 5;
        }
      }
    } else {
      console.log("=== no token for bridge ===");
    }
  }
  res.send("ok");
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
