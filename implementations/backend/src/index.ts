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

  const MOCK_VALID_UNTIL = "0x00000000deadbeef";
  const MOCK_VALID_AFTER = "0x0000000000001234";

  // const validUntil = timestamp + 1800;
  // const validAfter = timestamp;
  const validUntil = MOCK_VALID_UNTIL;
  const validAfter = MOCK_VALID_AFTER;

  const parsePaymasterAndDataWithoutAddressAndSignature = ethers.utils.defaultAbiCoder.encode(
    ["uint48", "uint48"],
    [validUntil, validAfter]
  );

  console.log("before create paymaster data");
  console.log(userOp);

  if (!userOp.signature) {
    console.log("1st");
    const paymasterAndData = ethers.utils.hexConcat(
      // ["address", "bytes", "bytes"],
      [paymasterAddress, parsePaymasterAndDataWithoutAddressAndSignature, "0x" + "00".repeat(65)]
    );
    res.send({ paymasterAndData });
  } else {
    console.log("2nd");
    const paymasterAndData = await paymasterContract
      .getHash(userOp, validUntil, validAfter)
      .then(async (hash: string) => {
        const signer = ethers.Wallet.fromMnemonic(mnemonicPhrase).connect(provider);
        const signature = await signer.signMessage(ethers.utils.arrayify(hash));
        const paymasterAndData = ethers.utils.hexConcat(
          // ["address", "bytes", "bytes"],
          [paymasterAddress, parsePaymasterAndDataWithoutAddressAndSignature, signature]
        );
        return paymasterAndData;
      })
      .catch(() => {
        return "0x";
      });
    res.send({ paymasterAndData });
  }
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
