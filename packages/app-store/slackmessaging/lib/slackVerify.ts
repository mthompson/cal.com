import { createHmac, timingSafeEqual } from "crypto";
import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

let signingSecret = "";

export default async function slackVerify(req: NextApiRequest, res: NextApiResponse) {
  const timeStamp = req.headers["x-slack-request-timestamp"] as string; // Always returns a string and not a string[]
  const slackSignature = req.headers["x-slack-signature"] as string;
  const currentTime = dayjs().unix();
  const { signing_secret } = await getAppKeysFromSlug("slack");
  if (typeof signing_secret === "string") signingSecret = signing_secret;

  if (!timeStamp) {
    return res.status(400).json({ message: "Missing X-Slack-Request-Timestamp header" });
  }

  if (!signingSecret) {
    return res.status(400).json({ message: "Missing Slack's signing_secret" });
  }

  if (Math.abs(currentTime - parseInt(timeStamp)) > 60 * 5) {
    return res.status(400).json({ message: "Request is too old" });
  }

  const signature_base = `v0:${timeStamp}:${stringify(req.body)}`;
  const signed_sig = "v0=" + createHmac("sha256", signingSecret).update(signature_base).digest("hex");

  console.log(signed_sig, slackSignature);

  if (!timingSafeEqual(Buffer.from(signed_sig, "hex"), Buffer.from(slackSignature, "hex"))) {
    return res.status(400).send("Invalid Signature");
  }
}
