import { json, redirect, useFetcher } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  BlockStack,
  Button,
  Card,
  InlineStack,
  Layout,
  Link,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useEffect } from "react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = `https://montypaylive.fly.dev/configurationPage?domain=${session.shop}`;

  return json({ url });
};

export default function Index() {
  const fetcher = useFetcher();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.url) {
      window.open(fetcher.data.url, "_blank");
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <Page>
      <TitleBar title="MontyPay Payment Gateway"></TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Congrats on installing our payment gateway 🎉
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Please Register Your Account:
                  </Text>
                </BlockStack>
                <InlineStack gap="300">
                  <fetcher.Form method="post">
                    <Button submit>Register</Button>
                  </fetcher.Form>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
