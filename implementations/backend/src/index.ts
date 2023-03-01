import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ethers } from "ethers";

import deployments from "../../metamask-snap/packages/truffle/deployments.json";
import PaymasterJson from "../../metamask-snap/packages/truffle/build/VerifyingPaymaster.json";

import MockERC20Json from "../../metamask-snap/packages/truffle/build/MockERC20.json";

dotenv.config();

const port = process.env.PORT || "8001";
const mnemonicPhrase = process.env.MNEMONIC_PHRASE || "";
const infuraProjectId = process.env.INFURA_PROJECT_ID;

const app: Express = express();
app.use(cors());
app.use(express.json());

type ChainId = "5" | "80001";

const chainName = {
  "5": "goerli",
  "80001": "polygon-mumbai",
};

const getSignerAndProviderForTargetChain = (chainId: ChainId) => {
  const provider = new ethers.providers.JsonRpcProvider(
    `https://${chainName[chainId]}.infura.io/v3/${infuraProjectId}`
  );
  const signer = ethers.Wallet.fromMnemonic(mnemonicPhrase).connect(provider);
  return { provider, signer };
};

app.get("/", (req: Request, res: Response) => {
  res.send("Hello");
});

app.post("/faucet", async (req: Request, res: Response) => {
  const { to } = req.body;
  const { signer } = getSignerAndProviderForTargetChain("5");
  const mockERO20 = new ethers.Contract(deployments.mockERC20Address, MockERC20Json.abi, signer);
  const currentBalance = await mockERO20.balanceOf(to);
  const amount = 1;
  const threshold = amount / 2;
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
  console.log("sign");
  const { chainId, userOp } = req.body;
  const { paymasterAddress } = deployments;
  const { provider, signer } = getSignerAndProviderForTargetChain(chainId);
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

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
