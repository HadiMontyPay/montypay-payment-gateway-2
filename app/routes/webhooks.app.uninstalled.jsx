import { authenticate } from "../shopify.server";
import {
  deleteSessionByShop,
  deleteConfigurationByShop,
} from "../payments.repository";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Always delete session for the shop, even if `session` is undefined
  await deleteSessionByShop(shop);
  await deleteConfigurationByShop(shop);

  return new Response();
};
