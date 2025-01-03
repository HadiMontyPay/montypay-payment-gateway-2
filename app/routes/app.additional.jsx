import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  BlockStack,
  Card,
  Button,
  Banner,
  FormLayout,
  TextField,
  Checkbox,
  Select,
  Spinner,
  FooterHelp,
  Link,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import {
  getConfiguration,
  getOrCreateConfiguration,
  // updateConfiguration,
} from "../payments.repository";
import PaymentsAppsClient from "../payments-apps.graphql";
// import Welcome from "../components/welcome";

/**
 * Loads the app's configuration if it exists.
 */
export const loader = async ({ request }) => {

  console.log(request);
  const { session } = await authenticate.admin(request);
  const apiKey = process.env.SHOPIFY_API_KEY;

  const config = await getConfiguration(session.id);

  return json({ shopDomain: session.shop, apiKey: apiKey, config: config });
};

/**
 * Saves the app's configuration.
 */

const verifyTestMode = async (tst) => {
  if (tst === "true") {
    return true;
  }
  if (tst === null) {
    return false;
  }
};
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();

  const config = {
    shop: session.shop,
    merchantKey: formData.get("merchantKey"),
    merchantPassword: formData.get("merchantPass"),
    testMode: await verifyTestMode(formData.get("testMode")),
    sessionId: session.id,
  };
  const ifExists = await getOrCreateConfiguration(session.id, config);
  if (!ifExists) {
    const configuration = await getOrCreateConfiguration(config.sessionId, config);
    const client = new PaymentsAppsClient(session.shop, session.accessToken);
    const response = await client.paymentsAppConfigure(
      configuration?.merchantKey,
    );
    const userErrors = response?.userErrors || [];

    if (userErrors.length > 0) return json({ errors: userErrors });
    return json({ raiseBanner: true, errors: userErrors });
  } else {
    const configuration = await getOrCreateConfiguration(session.id, config);
    const client = new PaymentsAppsClient(session.shop, session.accessToken);
    const response = await client.paymentsAppConfigure(
      configuration?.merchantKey,
    );
    const userErrors = response?.userErrors || [];

    if (userErrors.length > 0) return json({ errors: userErrors });
    return json({ raiseBanner: true, errors: userErrors });
  }
};

export default function Index() {
  const nav = useNavigation();
  const { shopDomain, apiKey, config } = useLoaderData();
  const action = useActionData();

  const [merchantKey, setMerchantKey] = useState(
    config ? config.merchantKey : "",
  );
  const [merchantPass, setMerchantPass] = useState(
    config ? config.merchantPassword : "",
  );
  const [testMode, setTestMode] = useState(config ? config.testMode : false);

  const [showBanner, setShowBanner] = useState(
    action ? action.raiseBanner : false,
  );
  const [errors, setErrors] = useState([]);

  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

  useEffect(() => {
    if (action?.raiseBanner) setShowBanner(true);
    if (action?.errors.length > 0) setErrors(action.errors);
  }, [action]);

  const errorBanner = () =>
    errors.length > 0 && (
      <Banner
        title={"😢 An error ocurred!"}
        status="critical"
        onDismiss={() => {
          setErrors([]);
        }}
      >
        {errors.map(({ message }, idx) => (
          <Text as="p" key={idx}>
            {message}
          </Text>
        ))}
      </Banner>
    );

  const banner = () =>
    showBanner && (
      <Banner
        title={"🥰 Settings updated!"}
        // action={{
        //   content: "Return to Shopify",
        //   url: `https://${shopDomain}/services/payments_partners/gateways/${apiKey}/settings`,
        // }}
        status="success"
        onDismiss={() => {
          setShowBanner(false);
        }}
      />
    );

  if (isLoading) {
    return (
      <Page fullWidth>
        <div
          style={{
            display: "flex",
            height: "100vh",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spinner accessibilityLabel="Spinner" size="large" />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <BlockStack gap="5">
        <Layout>
          <Layout.Section>
            <BlockStack gap="4">
              {banner()}
              {errorBanner()}
            </BlockStack>
          </Layout.Section>
          {/* <Layout.Section>
            <Welcome />
          </Layout.Section> */}
          <Layout.Section>
            <Card>
              <BlockStack gap="5">
                <BlockStack gap="2">
                  <Text as="h2" variant="headingMd">
                    Configure your Payments App
                  </Text>
                  <Text as="p">
                    Below you'll find a form to configure your app with the
                    current shop:{" "}
                    <Text as="span" color="success">
                      {shopDomain}
                    </Text>
                  </Text>
                  <Text as="p">
                    If any details are already present, your app has already
                    been configured with the shop.
                  </Text>
                </BlockStack>
                <BlockStack gap="2">
                  <Card>
                    <Form method="post">
                      <FormLayout>
                        <TextField
                          label="Merchant Key"
                          name="merchantKey"
                          onChange={(change) => setMerchantKey(change)}
                          value={merchantKey}
                          autoComplete="off"
                        />
                        <TextField
                          label="Merchant Password"
                          name="merchantPass"
                          onChange={(change) => setMerchantPass(change)}
                          value={merchantPass}
                          autoComplete="off"
                        />
                        <Checkbox
                          label="Test Mode"
                          name="testMode"
                          checked={testMode}
                          onChange={(change) => {
                            console.log(change);
                            setTestMode(change);
                          }}
                          value={testMode.toString()}
                        />
                        {/* <Select
                          label="API Version"
                          name="apiVersion"
                          onChange={(change) => setApiVersion(change)}
                          options={apiVersionOptions}
                          value={apiVersion}
                        /> */}
                        <Button submit>Submit</Button>
                      </FormLayout>
                    </Form>
                  </Card>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <FooterHelp>
          <Text as="span">Learn more about </Text>
          <Link url="https://shopify.dev/docs/apps/payments" target="_blank">
            payments apps
          </Link>
        </FooterHelp>
      </BlockStack>
    </Page>
  );
}
