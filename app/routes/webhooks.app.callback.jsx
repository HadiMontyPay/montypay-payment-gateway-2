import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import axios from "axios";
import CryptoJS from "crypto-js";
import PaymentsAppsClient, { PAYMENT } from "../payments-apps.graphql";
import {
  getConfigurationByShop,
  getPaymentSession,
  getSessionByShop,
} from "../payments.repository";
import prisma from "../db";

// import prisma from "../db";

// export const loader = async ({ request }) => {
// console.log("object");
//   const body = await request.json();
//   console.log("Simulated webhook received:", body);
//   return { body: body };
// };

export const action = async ({ request }) => {
  const formData = await request.formData();

  const body = Object.fromEntries(formData.entries());

  const paymentSession = await getPaymentSession(body.order_number);
  //   const configuration = await getConfigurationByShop(paymentSession.shop);
  const session = await getSessionByShop(paymentSession.shop);
  const client = new PaymentsAppsClient(
    paymentSession.shop,
    session.accessToken,
    PAYMENT,
  );

  if (body.type == "sale" && body.status == "fail") {
    const response = await client.pendSession({
      id: paymentSession.id,
      gid: paymentSession.gid,
    });

    const userErrors = response?.userErrors || [];
    if (userErrors.length > 0)
      return json({ raiseBanner: true, errors: userErrors });

    return redirect(response.paymentSession.nextAction.context.redirectUrl);
  } else if (
    body.type == "sale" &&
    body.status == "success" &&
    body.card_token
  ) {
    console.log("Sale Success With Card Token");

    const existingCustomer = await prisma.customerData.findFirst({
      where: {
        shop: paymentSession.shop,
        email: body.customer_email,
        token: body.card_token, // check if the exact token already exists
      },
    });

    if (!existingCustomer) {
      // Token is different, create a new record
      const newCustomer = await prisma.customerData.create({
        data: {
          shop: paymentSession.shop,
          email: body.customer_email,
          token: body.card_token,
          phone: body.customer_phone || "",
        },
      });
      console.log("New customer entry created with a different token");
    } else {
      console.log("Token already exists, no action needed");
    }

    const response = await client.resolveSession({
      id: paymentSession.id,
      gid: paymentSession.gid,
    });
    const userErrors = response?.userErrors || [];
    if (userErrors.length > 0)
      return json({ raiseBanner: true, errors: userErrors });

    return redirect(response.paymentSession.nextAction.context.redirectUrl);
  } else if (
    body.type == "sale" &&
    body.status == "success" &&
    !body.card_token
  ) {
    console.log("Sale Success Without Card Token");
    const response = await client.resolveSession({
      id: paymentSession.id,
      gid: paymentSession.gid,
    });
    const userErrors = response?.userErrors || [];
    if (userErrors.length > 0)
      return json({ raiseBanner: true, errors: userErrors });

    return redirect(response.paymentSession.nextAction.context.redirectUrl);
  } else if (
    body.type == "3ds" &&
    body.status == "success" &&
    body.card_token
  ) {
    console.log("Card Token Found");

    const existingCustomer = await prisma.customerData.findFirst({
      where: {
        shop: paymentSession.shop,
        email: body.customer_email,
        token: body.card_token, // check if the exact token already exists
      },
    });

    if (!existingCustomer) {
      // Token is different, create a new record
      const newCustomer = await prisma.customerData.create({
        data: {
          shop: paymentSession.shop,
          email: body.customer_email,
          token: body.card_token,
          phone: body.customer_phone || "",
        },
      });
      console.log("New customer entry created with a different token");
    } else {
      console.log("Token already exists, no action needed");
    }
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// export default function App() {
// //   const { payment_id, trans_id, order_id } = useLoaderData();

//   return (
//     <>
//       {/* <h1>payment_id: {payment_id}</h1>
//       <h1>trans_id: {trans_id}</h1>
//       <h1>order_id: {order_id}</h1> */}
//     </>
//   );
// }
