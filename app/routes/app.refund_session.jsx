import { json } from "@remix-run/node";

import { createRefundSession, getPaymentSession } from "../payments.repository";

import CryptoJS from "crypto-js";
import prisma from "../db";

/**
 * Saves and starts a refund session.
 */
// export const action = async ({ request }) => {
//   const requestBody = await request.json();

//   const refundSessionHash = createParams(requestBody);
//   const refundSession = await createRefundSession(refundSessionHash);

//   const refundresult = await makeRefund(refundSessionHash.paymentId, refundSessionHash.amount);

//   if (!refundSession) throw new Response("A RefundSession couldn't be created.", { status: 500 });

//   return json(refundSessionHash);
//   // return json(refundresult);
// }

export const action = async ({ request }) => {
  // try {
    const requestBody = await request.json();

    // Create refund session hash and session
    const refundSessionHash = createParams(requestBody);
    const refundSession = await createRefundSession(refundSessionHash);

    // Check if refundSession was created successfully
    if (!refundSession) {
      throw new Response("A RefundSession couldn't be created.", { status: 500 });
    }

    // Make refund
    const refundResult = await makeRefund(refundSessionHash.paymentId, refundSessionHash.amount);

    // Check refund result
    if (refundResult.status === "success" && refundResult.data?.result === "accepted") {
      return json(refundSessionHash);
    }

    // Refund not successful; throw error
    throw new Response(refundResult.message || "Refund operation failed.", { status: 500 });
  // } catch (error) {
  //   // Handle unexpected errors
  //   throw new Response(error.message || "An unexpected error occurred.", { status: 500 });
  // }
};

const createParams = ({id, gid, amount, currency, payment_id, proposed_at}) => (
  {
    id,
    gid,
    amount,
    currency,
    paymentId: payment_id,
    proposedAt: proposed_at,
  }
)


// 1- call get transaction details by order ID
// 2- we have the payment ID from the first step
// 3- call the refund API based on the payment ID we get


// const makeRefund = async (id, amount) => {

//   // get the payment session to get the shop
//   const paymentSession = await prisma.paymentSession.findUnique({
//     where: {
//       id: id,
//     },
//   });

//   // get the configuration to get merchant key and password
//   const configuration = await prisma.configuration.findUnique({
//     where: {
//       shop: paymentSession.shop,
//     },
//   });

//   const to_md5_get_details = id + configuration.merchantPassword;
//   // merchantInfo.merchantPass;

//   var hash = CryptoJS.SHA1(CryptoJS.MD5(to_md5_get_details.toUpperCase()).toString());
//   var resulthash = CryptoJS.enc.Hex.stringify(hash);

//   const todoObject = {

//     merchant_key: configuration.merchantKey,
//     order_id: id,
//     hash: resulthash,

//   };

//   const get_transaction_details = await fetch("https://checkout.montypay.com/api/v1/payment/status", {
//     method: "POST",
//     body: JSON.stringify(todoObject),
//     headers: { "Content-Type": "application/json" },
//   });

//   const transaction_details = await get_transaction_details.json();


//   const to_md5_make_refund = transaction_details.payment_id + amount + configuration.merchantPassword;
//   // merchantInfo.merchantPass;

//   var refundhash = CryptoJS.SHA1(CryptoJS.MD5(to_md5_make_refund.toUpperCase()).toString());
//   var Refundresulthash = CryptoJS.enc.Hex.stringify(refundhash);

//   const makeRefundBody = {

//     merchant_key: configuration.merchantKey,
//     payment_id: transaction_details.payment_id,
//     amount: amount,
//     hash: Refundresulthash,

//   };

//   const makeRefundRequest = await fetch("https://checkout.montypay.com/api/v1/payment/refund", {
//     method: "POST",
//     body: JSON.stringify(makeRefundBody),
//     headers: { "Content-Type": "application/json" },
//   });

//   const jsonResponse = await makeRefundRequest.json();


//   return jsonResponse;

// }


const makeRefund = async (id, amount) => {
  try {
    // Get the payment session to get the shop
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { id: id },
    });
    if (!paymentSession) {
      return { status: "error", message: "Payment session not found", data: null };
    }

    // Get the configuration to get merchant key and password
    const configuration = await prisma.configuration.findUnique({
      where: { shop: paymentSession.shop },
    });
    if (!configuration) {
      return { status: "error", message: "Configuration not found", data: null };
    }

    // Generate hash for getting transaction details
    const to_md5_get_details = id + configuration.merchantPassword;
    const hash = CryptoJS.SHA1(CryptoJS.MD5(to_md5_get_details.toUpperCase()).toString());
    const resulthash = CryptoJS.enc.Hex.stringify(hash);

    const transactionDetailsRequest = {
      merchant_key: configuration.merchantKey,
      order_id: id,
      hash: resulthash,
    };

    // Fetch transaction details
    const transactionResponse = await fetch("https://checkout.montypay.com/api/v1/payment/status", {
      method: "POST",
      body: JSON.stringify(transactionDetailsRequest),
      headers: { "Content-Type": "application/json" },
    });
    const transactionDetails = await transactionResponse.json();

    // Check if the transaction details contain an error
    if (transactionDetails.errors) {
      return { status: "error", message: "Transaction not found or invalid", data: transactionDetails.errors };
    }

    // Generate hash for making a refund
    const to_md5_make_refund = transactionDetails.payment_id + amount + configuration.merchantPassword;
    const refundhash = CryptoJS.SHA1(CryptoJS.MD5(to_md5_make_refund.toUpperCase()).toString());
    const Refundresulthash = CryptoJS.enc.Hex.stringify(refundhash);

    const refundRequest = {
      merchant_key: configuration.merchantKey,
      payment_id: transactionDetails.payment_id,
      amount: amount,
      hash: Refundresulthash,
    };

    // Make refund request
    const refundResponse = await fetch("https://checkout.montypay.com/api/v1/payment/refund", {
      method: "POST",
      body: JSON.stringify(refundRequest),
      headers: { "Content-Type": "application/json" },
    });
    const refundResult = await refundResponse.json();

    // Handle refund response
    if (refundResult.errors) {
      const refundErrorMessage = refundResult.errors[0]?.error_message || refundResult.error_message || "Unknown refund error";
      return { status: "error", message: refundErrorMessage, data: refundResult.errors };
    }

    if (refundResult.result === "accepted") {
      return { status: "success", message: "Refund successful", data: refundResult };
    }

    return { status: "error", message: "Unknown refund status", data: refundResult };
  } catch (error) {
    // Catch any unexpected errors
    return { status: "error", message: "An unexpected error occurred", data: error.message };
  }
};



// response if payment_id was not found:

// {
//   "error_code": 0,
//   "error_message": "Request data is invalid.",
//   "errors": [
//       {
//           "error_code": 100000,
//           "error_message": "hash: Hash is not valid."
//       }
//   ]
// }

// response if payment_id was found

// {
//   "payment_id": "a9045370-a1c9-11ef-b776-267df6bb30e0",
//   "date": "2024-11-13 14:14:56",
//   "status": "refund",
//   "order": {
//       "number": "u0nwmSrNntjIWozNsKgdfssgTsjdfsrrtystsss",
//       "amount": "123",
//       "currency": "USD",
//       "description": "sale"
//   },
//   "customer": {
//       "name": "MONTY PAY",
//       "email": "buyer@example.com"
//   }
// }

// if transaction already refunded

// {
//   "error_code": 0,
//   "error_message": "Request data is invalid.",
//   "errors": [
//       {
//           "error_code": 100000,
//           "error_message": "Refund is not allowed."
//       }
//   ]
// }

// if success refund

// {
//   "payment_id": "5573cca6-a3f7-11ef-a471-7aaaa02c7eba",
//   "result": "accepted"
// }


// next steps: to try a new payment and make a successful refund for it
