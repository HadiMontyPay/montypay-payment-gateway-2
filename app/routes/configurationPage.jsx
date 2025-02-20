import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Button, Checkbox, FormLayout, TextField } from "@shopify/polaris";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { useState } from "react";
import styles from "./_index/styles.module.css";

import PaymentsAppsClient from "../payments-apps.graphql";
import {
  getConfigurationByShop,
  getOrCreateConfiguration,
  getSessionByShop,
} from "../payments.repository";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());

  const config = await getConfigurationByShop(queryParams.shop);
  const session = await getSessionByShop(queryParams.shop);

  return json({ config: config, session: session });
};

const verifyTestMode = async (tst) => {
  if (tst === "true") {
    return true;
  }
  if (tst === null) {
    return false;
  }
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());

  const config = await getConfigurationByShop(queryParams.shop);
  const session = await getSessionByShop(config.shop);
  console.log("Session:", session);

  const conf = {
    shop: config.shop,
    merchantKey: formData.get("merchantKey"),
    merchantPassword: formData.get("merchantPass"),
    testMode: await verifyTestMode(formData.get("testMode")),
    sessionId: config.sessionId,
  };
  const ifExists = await getOrCreateConfiguration(config.sessionId, conf);
  if (!ifExists) {
    const configuration = await getOrCreateConfiguration(conf.sessionId, conf);
    const client = new PaymentsAppsClient(session.shop, session.accessToken);
    const response = await client.paymentsAppConfigure(
      configuration?.merchantKey,
      configuration.ready,
    );
    const userErrors = response?.userErrors || [];

    if (userErrors.length > 0)
      return json({ raiseBanner: true, errors: userErrors });

    console.log(
      `https://${configuration.shop}/services/payments_partners/gateways/${process.env.SHOPIFY_API_KEY}/settings`,
    );
    // https://monty-pay-dev.myshopify.com/services/payments_partners/gateways/95516f271f63cbefada64c8a3302c1ca/settings
    // https://${session.shop}/services/payments_partners/gateways/${process.env.SHOPIFY_API_KEY}/settings
    return redirect(
      `https://${configuration.shop}/services/payments_partners/gateways/${process.env.SHOPIFY_API_KEY}/settings`,
    );
    // window.location.href = `https://${configuration.shop}/services/payments_partners/gateways/${process.env.SHOPIFY_API_KEY}/settings`;
    // return json({ raiseBanner: true, errors: userErrors });
  } else {
    const configuration = await getOrCreateConfiguration(
      config.sessionId,
      conf,
    );
    const client = new PaymentsAppsClient(config.shop, session.accessToken);
    const response = await client.paymentsAppConfigure(
      configuration?.merchantKey,
      configuration.ready,
    );
    const userErrors = response?.userErrors || [];

    if (userErrors.length > 0)
      return json({ raiseBanner: true, errors: userErrors });
    return redirect(
      `https://${configuration.shop}/services/payments_partners/gateways/${process.env.SHOPIFY_API_KEY}/settings`,
    );
  }
};

export default function App() {
  const { config, session } = useLoaderData();

  const [merchantKey, setMerchantKey] = useState(
    config ? config.merchantKey : "",
  );
  const [merchantPass, setMerchantPass] = useState(
    config ? config.merchantPassword : "",
  );
  const [testMode, setTestMode] = useState(config ? config.testMode : false);

  return (
    <AppProvider>
      <div className={styles.index}>
        <div className={styles.gradient}></div>
        <div className={styles.content}>
          <h1 className={styles.heading}>MontyPay Payment Gateway</h1>
          {/* <p className={styles.text}>
            A tagline about [your app] that describes your value proposition.
          </p> */}
          {/* {showForm && ( */}
          <Form method="post" className={styles.form}>
            {/* <FormLayout> */}
            <label className={styles.label}>
              <span className={styles.lbl}>Merchant Key</span>
              <input
                className={styles.input}
                type="text"
                name="merchantKey"
                onChange={(change) => setMerchantKey(change)}
                value={merchantKey}
              />
            </label>
            <label className={styles.label}>
              <span className={styles.lbl}>Merchant Password</span>
              <input
                className={styles.input}
                type="password"
                name="merchantPass"
                onChange={(change) => setMerchantPass(change)}
                value={merchantPass}
              />
            </label>
            {/* <Checkbox
                label="Test Mode"
                name="testMode"
                checked={testMode}
                onChange={(change) => {
                  console.log(change);
                  setTestMode(change);
                }}
                value={testMode.toString()}
              /> */}
            <label className={styles.label}>
              <span className={styles.lbl}>Test Mode</span>
              <input
                className={styles.input}
                type="checkbox"
                name="testMode"
                checked={testMode}
                onChange={(change) => {
                  setTestMode(change.target.checked);
                }}
                value={testMode}
              />
            </label>
            <button className={styles.button} type="submit">
              Submit
            </button>
            {/* </FormLayout> */}
          </Form>
          {/* )} */}
        </div>
      </div>
    </AppProvider>
  );
}
