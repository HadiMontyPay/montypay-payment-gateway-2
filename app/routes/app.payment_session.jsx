import { useState } from "react";
import {
  createPaymentSession,
  getConfiguration,
  getPaymentSession,
} from "../payments.repository";
import CryptoJS from "crypto-js";
import prisma from "../db";
// import { redirect } from "@remix-run/react";

/**
 * Saves and starts a payment session.
 * Redirects back to shop if payment session was created.
 */

// function removeTrailingSlash(str) {
//   return str.endsWith("/") ? str.slice(0, -1) : str;
// }

export const action = async ({ request }) => {
  const requestBody = await request.json();

  console.log("Request", requestBody);

  const shopDomain = request.headers.get("shopify-shop-domain");
  const merchantWithRecurring = await prisma.configuration.findFirst({
    where: {
      shop: shopDomain,
      without_CVV: true,
    },
  });

  if (merchantWithRecurring) {
    // console.log("This merchant has tokenization");
    const paymentSession = await createPaymentSession(
      createParams(requestBody, shopDomain),
    );

    if (!paymentSession)
      throw new Response("A PaymentSession couldn't be created.", {
        status: 500,
      });
    return {
      redirect_url: `https://shopify-config-page.fly.dev/tokenization?shop=${shopDomain}&payment_session_id=${paymentSession.id}`,
      // redirect_url: `http://localhost:3000/tokenization?shop=${shopDomain}&payment_session_id=${paymentSession.id}`,
    };
  } else {
    const paymentSession = await createPaymentSession(
      createParams(requestBody, shopDomain),
    );

    if (!paymentSession)
      throw new Response("A PaymentSession couldn't be created.", {
        status: 500,
      });

    const result = await buildRedirectUrl(requestBody, paymentSession);

    // Check refund result
    if (result.status === "success") {
      return { redirect_url: result.data.redirect_url };
    }

    throw new Response(result.message || "SALE operation failed.", {
      status: 500,
    });
  }
};

const createParams = (
  {
    id,
    gid,
    group,
    amount,
    currency,
    test,
    kind,
    customer,
    payment_method,
    proposed_at,
    cancel_url,
  },
  shopDomain,
) => ({
  id,
  gid,
  group,
  amount,
  currency,
  test,
  kind,
  customer,
  paymentMethod: payment_method,
  proposedAt: proposed_at,
  shop: shopDomain,
  cancelUrl: cancel_url,
});
function removeTrailingSlash(str) {
  return str.endsWith("/") ? str.slice(0, -1) : str;
}
const buildRedirectUrl = async (request, paymentSession) => {
  try {
    const resultt = removeTrailingSlash(paymentSession.shop);
    const merchantInfo = await prisma.configuration.findUnique({
      where: { shop: resultt },
    });

    if (!merchantInfo) {
      return {
        status: "error",
        message: "Configuration not found",
        data: null,
      };
    }

    // Get all customer records for this shop + email
    const customerRecords = await prisma.customerData.findMany({
      where: {
        shop: resultt,
        email: request.customer.email,
      },
    });

    const cardTokens = customerRecords
      .map((c) => c.token)
      .filter((token) => token && token.trim() !== ""); // array of all tokens

    if (customerRecords.length === 0) {
      console.log("Customer Not Found");
    }

    let merchant_key = merchantInfo.merchantKey;
    let merchant_password = merchantInfo.merchantPassword;

    const to_md5 =
      request.id +
      request.amount +
      request.currency +
      request.kind +
      merchant_password;

    const hash = CryptoJS.SHA1(CryptoJS.MD5(to_md5.toUpperCase()).toString());
    const result = CryptoJS.enc.Hex.stringify(hash);

    let todoObject = {
      merchant_key,
      operation: "purchase",
      cancel_url: paymentSession.cancelUrl,
      success_url: "https://montypaylive.fly.dev/callback",
      hash: result,
      order: {
        description: request.kind,
        number: request.id,
        amount: request.amount,
        currency: request.currency,
      },
      customer: {
        name:
          request.customer.billing_address.given_name +
          " " +
          request.customer.billing_address.family_name,
        email: request.customer.email,
      },
      billing_address: {
        country: request.customer.billing_address.country_code,
        // state: request.customer.billing_address.province,
        city: request.customer.billing_address.city,
        address: `${request.customer.billing_address.line1}, ${request.customer.billing_address.line2}`,
        // zip: request.customer.billing_address.postal_code,
        phone: request.customer.billing_address.phone_number,
      },
    };

    if (merchantInfo.with_CVV && cardTokens.length > 0) {
      console.log(
        "Merchant Has Tokenization with CVV, tokens found:",
        cardTokens,
      );
      todoObject.req_token = true;
      todoObject.card_token = cardTokens; // set array of all tokens
    } else if (merchantInfo.with_CVV) {
      console.log("Merchant Has Tokenization with CVV, no tokens found");
      todoObject.req_token = true; // still request token if none exist
    } else {
      console.log("No Tokenization");
    }

    const response = await fetch(
      "https://checkout.montypay.com/api/v1/session",
      {
        method: "POST",
        body: JSON.stringify(todoObject),
        headers: { "Content-Type": "application/json" },
      },
    );

    const SaleResult = await response.json();

    if (SaleResult.errors) {
      const saleErrorMessage =
        SaleResult.errors[0]?.error_message ||
        SaleResult.error_message ||
        "Unknown sale error";
      return {
        status: "error",
        message: saleErrorMessage,
        data: SaleResult.errors,
      };
    }

    return { status: "success", message: "Sale success", data: SaleResult };
  } catch (error) {
    return {
      status: "error",
      message: "An unexpected error occurred",
      data: error.message,
    };
  }
};

function stringToFloat(str, currency) {
  const floatValue = parseFloat(str);
  if (currency === "USD") {
    return floatValue.toFixed(2);
  }
  if (currency === "JOD") {
    return floatValue.toFixed(3);
  }
}
