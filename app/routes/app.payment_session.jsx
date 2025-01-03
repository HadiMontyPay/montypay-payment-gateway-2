import { useState } from "react";
import { createPaymentSession, getConfiguration, getPaymentSession } from "../payments.repository";
import CryptoJS from "crypto-js";
import prisma from "../db";
// import { redirect } from "@remix-run/react";

/**
 * Saves and starts a payment session.
 * Redirects back to shop if payment session was created.
 */
export const action = async ({ request }) => {
  // try{
    const requestBody = await request.json();

    const shopDomain = request.headers.get("shopify-shop-domain");

    const paymentSession = await createPaymentSession(
      createParams(requestBody, shopDomain),
    );
    // this is a test

    if (!paymentSession)
      throw new Response("A PaymentSession couldn't be created.", {
        status: 500,
      });

    const result =  await buildRedirectUrl(requestBody, paymentSession);

    // Check refund result
    if (result.status === "success") {
      return { redirect_url: result.data.redirect_url };
    }

    throw new Response(result.message || "SALE operation failed.", { status: 500 });


    // return result.data.redirect_url;
    // return { redirect_url: await buildRedirectUrl(requestBody, paymentSession) };


  // } catch (result) {
  //   // Handle unexpected errors
  //   throw new Response(result.message || "An unexpected error occurred.", { status: 500 });
  // }
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

const buildRedirectUrl = async (request, paymentSession) => {
  try {
    // console.log(paymentSession);

    const merchantInfo = await prisma.configuration.findUnique({
      where: {
        shop: paymentSession.shop,
      },
    });

    if (!merchantInfo) {
      return { status: "error", message: "Configuration not found", data: null };
    }

    let merchant_key = merchantInfo.merchantKey;
    let merchant_password = merchantInfo.merchantPassword;
    // if (merchantInfo) {
    // const customer = JSON.parse(paymentSession.customer);
    // const shopDomain = request.headers.get("shopify-shop-domain");

    const to_md5 =
      request.id +
      request.amount +
      request.currency +
      request.kind +
      merchant_password;
    // merchantInfo.merchantPass;

    var hash = CryptoJS.SHA1(CryptoJS.MD5(to_md5.toUpperCase()).toString());
    var result = CryptoJS.enc.Hex.stringify(hash);

    const todoObject = {
      // merchant_key: merchantInfo.merchantKey,
      merchant_key: merchant_key,
      operation: "purchase",
      cancel_url: request.payment_method.data.cancel_url,
      success_url: "https://merchantapp.montypay.com/paysuccess",
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
    };

    const response = await fetch("https://checkout.montypay.com/api/v1/session", {
      method: "POST",
      body: JSON.stringify(todoObject),
      headers: { "Content-Type": "application/json" },
    });
    const SaleResult = await response.json();

    console.log(SaleResult)

    // Handle refund response
    if (SaleResult.errors) {
      const saleErrorMessage = SaleResult.errors[0]?.error_message || SaleResult.error_message || "Unknown sale error";
      return { status: "error", message: saleErrorMessage, data: SaleResult.errors };
    }

    return { status: "success", message: "Sale success", data: SaleResult };

    // return response;
    // console.log(todoObject);
    // const jsonResponse = await response.json();
    // console.log("Json Response:",jsonResponse)

    // return jsonResponse.redirect_url;

    // return jsonResponse;


  } catch (error) {
    // Catch any unexpected errors
    return { status: "error", message: "An unexpected error occurred", data: error.message };
  }
  // return `${request.url.slice(0, request.url.lastIndexOf("/"))}/payment_simulator/${id}`;
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
