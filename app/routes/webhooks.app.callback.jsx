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
  } else if (body.type == "sale" && body.status == "success") {
    const response = await client.resolveSession({
      id: paymentSession.id,
      gid: paymentSession.gid,
    });
    const userErrors = response?.userErrors || [];
    if (userErrors.length > 0)
      return json({ raiseBanner: true, errors: userErrors });

    return redirect(response.paymentSession.nextAction.context.redirectUrl);
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
