import { json, redirect } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { Button, Checkbox, FormLayout, TextField } from "@shopify/polaris";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { useEffect, useState } from "react";
import styles from "./_index/styles.module.css";

import PaymentsAppsClient, { PAYMENT } from "../payments-apps.graphql";
import {
  getConfigurationByShop,
  getOrCreateConfiguration,
  getSessionByShop,
  getPaymentSession,
} from "../payments.repository";
import axios from "axios";
import CryptoJS from "crypto-js";

export const loader = async ({ request }) => {
  // console.log("object");
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());

  const payment_id = queryParams.payment_id;
  const trans_id = queryParams.trans_id;
  const order_id = queryParams.order_id;
  const paymentSession = await getPaymentSession(order_id);

  const configuration = await getConfigurationByShop(paymentSession.shop);

  const to_md5 = payment_id + configuration.merchantPassword;

  //   var hash = CryptoJS.SHA1(CryptoJS.MD5(to_md5.toUpperCase()).toString());
  const hash = CryptoJS.SHA1(CryptoJS.MD5(to_md5.toUpperCase()).toString());
  const result = CryptoJS.enc.Hex.stringify(hash);
  const status = await axios
    .post("https://checkout.montypay.com/api/v1/payment/status", {
      merchant_key: configuration.merchantKey,
      payment_id: payment_id,
      hash: `${result}`,
    })
    .then((resp) => {
      return resp.data.status;
    })
    .catch((err) => {
      console.log("Error Getting Transaction Status");
      return "Error Getting Transaction Status";
    });

  const session = await getSessionByShop(paymentSession.shop);
  const client = new PaymentsAppsClient(
    paymentSession.shop,
    session.accessToken,
    PAYMENT,
  );
  if (status == "settled") {
    const response = await client.resolveSession({
      id: paymentSession.id,
      gid: paymentSession.gid,
    });
    const userErrors = response?.userErrors || [];
    if (userErrors.length > 0)
      return json({ raiseBanner: true, errors: userErrors });

    // console.log(
    //   "response URL:",
    //   response.paymentSession.nextAction.context.redirectUrl,
    // );

    return redirect(response.paymentSession.nextAction.context.redirectUrl);
  }
  if (status == "decline") {
    const response = await client.rejectSession({
      id: paymentSession.id,
      gid: paymentSession.gid,
    });
    const userErrors = response?.userErrors || [];
    if (userErrors.length > 0)
      return json({ raiseBanner: true, errors: userErrors });

    console.log(
      "Redirect from Callback:",
      response.paymentSession.nextAction.context.redirectUrl,
    );
    return redirect(response.paymentSession.nextAction.context.redirectUrl);
  }

  return json({ payment_id, trans_id, order_id });
};

export const action = async ({ request }) => {
  //   const formData = await request.formData();
  //   const url = new URL(request.url);
  //   const queryParams = Object.fromEntries(url.searchParams.entries());
  //   const config = await getConfigurationByShop(
  //     queryParams.shop || queryParams.domain,
  //   );
  //   const session = await getSessionByShop(
  //     queryParams.shop || queryParams.domain,
  //   );
  //   console.log("Session:", session);
  //   const conf = {
  //     shop: queryParams.shop || queryParams.domain,
  //     merchantKey: formData.get("merchantKey"),
  //     merchantPassword: formData.get("merchantPass"),
  //     testMode: await verifyTestMode(formData.get("testMode")),
  //     sessionId: session.id,
  //   };
  //   const ifExists = await getOrCreateConfiguration(conf.sessionId, conf);
  //   if (!ifExists) {
  //     const configuration = await getOrCreateConfiguration(conf.sessionId, conf);
  //     const client = new PaymentsAppsClient(session.shop, session.accessToken);
  //     const response = await client.paymentsAppConfigure(
  //       configuration?.merchantKey,
  //       configuration.ready,
  //     );
  //     const userErrors = response?.userErrors || [];
  //     if (userErrors.length > 0)
  //       return json({ raiseBanner: true, errors: userErrors });
  //     console.log(
  //       `https://${configuration.shop}/services/payments_partners/gateways/${process.env.SHOPIFY_API_KEY}/settings`,
  //     );
  //     // https://monty-pay-dev.myshopify.com/services/payments_partners/gateways/95516f271f63cbefada64c8a3302c1ca/settings
  //     // https://${session.shop}/services/payments_partners/gateways/${process.env.SHOPIFY_API_KEY}/settings
  //     return redirect(
  //       `https://${configuration.shop}/services/payments_partners/gateways/${process.env.SHOPIFY_API_KEY}/settings`,
  //     );
  //     // window.location.href = `https://${configuration.shop}/services/payments_partners/gateways/${process.env.SHOPIFY_API_KEY}/settings`;
  //     // return json({ raiseBanner: true, errors: userErrors });
  //   } else {
  //     const configuration = await getOrCreateConfiguration(conf.sessionId, conf);
  //     const client = new PaymentsAppsClient(conf.shop, session.accessToken);
  //     const response = await client.paymentsAppConfigure(
  //       configuration?.merchantKey,
  //       configuration.ready,
  //     );
  //     const userErrors = response?.userErrors || [];
  //     if (userErrors.length > 0)
  //       return json({ raiseBanner: true, errors: userErrors });
  //     return redirect(
  //       `https://${configuration.shop}/services/payments_partners/gateways/${process.env.SHOPIFY_API_KEY}/settings`,
  //     );
  //   }
};

export default function App() {
  const { payment_id, trans_id, order_id } = useLoaderData();

  return (
    <>
      <h1>payment_id: {payment_id}</h1>
      <h1>trans_id: {trans_id}</h1>
      <h1>order_id: {order_id}</h1>
    </>
  );
}
