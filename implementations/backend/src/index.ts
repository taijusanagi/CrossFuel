import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ethers } from "ethers";

import deployments from "../../metamask-snap/packages/truffle/deployments.json";
import PaymasterJson from "../../metamask-snap/packages/truffle/build/VerifyingPaymaster.json";

dotenv.config();

const port = process.env.PORT || "8001";
const mnemonicPhrase = process.env.MNEMONIC_PHRASE || "";
const infuraProjectId = process.env.INFURA_PROJECT_ID;

const app: Express = express();
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello");
});

app.post("/sign", async (req: Request, res: Response) => {
  const { userOp } = req.body;
  const provider = new ethers.providers.JsonRpcProvider(`https://goerli.infura.io/v3/${infuraProjectId}`);
  const { paymasterAddress } = deployments;
  const paymasterContract = new ethers.Contract(paymasterAddress, PaymasterJson.abi, provider);
  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);
  const { timestamp } = block;
  const validUntil = timestamp + 1800;
  const validAfter = timestamp;
  const paymasterAndData = await paymasterContract
    .getHash({ signature: "0x", ...userOp }, validUntil, validAfter)
    .then(async (hash: string) => {
      const signer = ethers.Wallet.fromMnemonic(mnemonicPhrase).connect(provider);

      console.log("signer");
      console.log(await signer.getAddress());

      const signature = await signer.signMessage(hash);

      const parsePaymasterAndDataWithoutAddressAndSignature = ethers.utils.defaultAbiCoder.encode(
        ["uint48", "uint48"],
        [validUntil, validAfter]
      );

      const paymasterAndData = ethers.utils.solidityPack(
        ["address", "bytes", "bytes"],
        [paymasterAddress, parsePaymasterAndDataWithoutAddressAndSignature, signature]
      );

      const data = await paymasterContract.parsePaymasterAndData(paymasterAndData).catch((e) => {
        console.log(e);
        return "";
      });
      console.log("parse", data);

      return paymasterAndData;
    })
    .catch(() => {
      return "0x";
    });
  res.send({ paymasterAndData });
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
