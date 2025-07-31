/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from "express";
import { decryptRequest, encryptResponse, FlowEndpointException } from "./encryption.js";
import { getNextScreen } from "./flow.js";
import crypto from "crypto";

const app = express();

app.use(
  express.json({
    // store the raw request body to use it for signature verification
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf?.toString(encoding || "utf8");
    },
  }),
);


const { 
  APP_SECRET, 
  PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----Proc-Type: 4,ENCRYPTEDDEK-Info: DES-EDE3-CBC,91BE3CE1E3F380B7Mgp95P45SDUMu206OCnQWWRzWAqLp3K3EoeHd3ms9ejoC95kBNDpe8HvzuKsfvlBEsANowg/SfJjhWgUNWuzcSEEI8lX5f7B4rH/DQXB8xsTCOStyLiGSNf/arItQcDHfS18JqIL0yVdkecrU7h0Wz3qJHc4aesL0zqEIjICFGhB/WKoIjAc5UrDAMKYZiVD/GncGkbRk5UE42nbWET8otAeB1KHj2JRqIbjWqKvv/lqATumEY9QwpvxgkAj/3ZsUS7UV9I6quh4wdZT95RAzmilbL+PjWbDkewIdMiXui+BtZt9cpBVhOhRIqNS6KBM8Rx7se+oFUedSCmEwzrKm2HPAPup8AkuWh+kfoJjd4hV0RCyRNUG/0Bm3a3x4vy6QZfX23rWv334R1utzWYOyBRDaeQ0m3h4d0qhTsz2Ybaxfk7JKsx4I9yzv/AtQraJze8ClLSBd2zbxBqX74sQmcsGS8Rcdg7+YTNiM/nDb7PJf3qxBcEfxrOS9ll1DrzB+B10peBAbGjwKSsOJlezR13hhiiLlHtLelfKduaCf4MivWaozzNYkz5PBUR7/27YVKSFH/OvmNxfrFbbajkbbxt1c0LuqOAYdt9xAMv/dnWwSNcLtP7tzq5SBH75zCBPC/vBv1cqiaxPyBIDSw0M6MRcFBZaU5phtQiMDjtYdhA+0t9PPbm5KRg/E3O3oecRi4WopIeLSgpcV8dicLeKdW5bK/+Q2JKeWdsPTvYHGbg92eyY4ppw/yApc4cCgnjmIj6k8q9Kqc57oaRqPgmJSujE6wvOJr2aiaoiJ5fEn3GFBWwE55IPvjml7C1PYYIkGVXCmBSnR1Y1Ixq4jGZ2vKsc0y2wiOUpDcq/ntkArkFbG4QxqlpbVSnzgO+Z5aVcHr99WKSHSL8rdNGKfQG0Mj8H+WslvVuaaI+PA+ntbj/dplQSKFMvMedJw04margJwfUpXx5Kz3HaIiyERt1Zwq7HXTMJwZ0HjB8uRb7ZHb0F8CrTyN1V5nyBBlzwHlFqMBus9krvxRJdwVPKzfKYgUfXmkoFWT6xhM6/giZSJ9Bq8X7ewtTP7y6mIFzvdpQfIqb6LmpMVTwtacEvX1bvPzx4eYUMJqSD7rbT7fW/rCNRRtdZ++gNzztja7NPrV0qx2AbBF2dt7593fUh1ygU6zatoG6Lw3HVr95XEtWX59es1V8xDj1rGAkR7pqpei0EIZHv3OWgqSOkW++haVnXdioJ7BrycWsfVGMjBZ14U60Z0HD4zTxzO9Ix6kZZa2mqGc/Mmq/RdxuFP1qNgYxDT2UlLHqlFyKZn/Ag4amRmbBl2aspp1rWCyee4OiRPkgXosAGRs/LJRD1/lxp+4tBF3b7QMVaTd05ckS/8gUmW+sRhEMgoMbGaAcHs+960X5U7DWtJSCwxzD1QliZuOBjOA4jW4C3uI+mu8JNz8TY3jcphvhQCLe4JZ2cFGK22rSZqzmWj1d1uJ/guQUnl0pz/krjOtDjpd5VULYg9w1b6GGwu1w7GBBG/04GD92KbilX3nFO5qbMltDUL2KXGll9060ooIt2flUCejZJTrPSiPTtexjfG//XtlvJU3TKAQjJ-----END RSA PRIVATE KEY-----", 
  PASSPHRASE = "ACG-WPP_Key_2025", 
  PORT = "3000" } = process.env;

/*
Example:
```-----[REPLACE THIS] BEGIN RSA PRIVATE KEY-----
MIIE...
...
...AQAB
-----[REPLACE THIS] END RSA PRIVATE KEY-----```
*/

app.post("/", async (req, res) => {
  if (!PRIVATE_KEY) {
    throw new Error(
      'Private key is empty. Please check your env variable "PRIVATE_KEY".'
    );
  }

  if(!isRequestSignatureValid(req)) {
    // Return status code 432 if request signature does not match.
    // To learn more about return error codes visit: https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes
    return res.status(432).send();
  }

  let decryptedRequest = null;
  try {
    decryptedRequest = decryptRequest(req.body, PRIVATE_KEY, PASSPHRASE);
  } catch (err) {
    console.error(err);
    if (err instanceof FlowEndpointException) {
      return res.status(err.statusCode).send();
    }
    return res.status(500).send();
  }

  const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
  console.log("💬 Decrypted Request:", decryptedBody);

  // TODO: Uncomment this block and add your flow token validation logic.
  // If the flow token becomes invalid, return HTTP code 427 to disable the flow and show the message in `error_msg` to the user
  // Refer to the docs for details https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes

  /*
  if (!isValidFlowToken(decryptedBody.flow_token)) {
    const error_response = {
      error_msg: `The message is no longer available`,
    };
    return res
      .status(427)
      .send(
        encryptResponse(error_response, aesKeyBuffer, initialVectorBuffer)
      );
  }
  */

  const screenResponse = await getNextScreen(decryptedBody);
  console.log("👉 Response to Encrypt:", screenResponse);

  res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
});

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});

function isRequestSignatureValid(req) {
  if(!APP_SECRET) {
    console.warn("App Secret is not set up. Please Add your app secret in /.env file to check for request validation");
    return true;
  }

  const signatureHeader = req.get("x-hub-signature-256");
  const signatureBuffer = Buffer.from(signatureHeader.replace("sha256=", ""), "utf-8");

  const hmac = crypto.createHmac("sha256", APP_SECRET);
  const digestString = hmac.update(req.rawBody).digest('hex');
  const digestBuffer = Buffer.from(digestString, "utf-8");

  if ( !crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.error("Error: Request Signature did not match");
    return false;
  }
  return true;
}
