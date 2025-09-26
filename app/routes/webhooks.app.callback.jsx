import { json, redirect } from "@remix-run/node";
import PaymentsAppsClient, { PAYMENT } from "../payments-apps.graphql";
import { getPaymentSession, getSessionByShop } from "../payments.repository";
import prisma from "../db";

async function handleCustomer({
  shop,
  email,
  phone,
  token,
  recurring_token,
  recurring_init_trans_id,
  card,
  save_card = false,
}) {
  const whereClause = {
    shop,
    email,
    token: token || "",
  };

  if (recurring_token && recurring_init_trans_id) {
    Object.assign(whereClause, {
      recurring_token,
      recurring_init_trans_id,
      card,
      save_card: true,
    });
  }

  const existingCustomer = await prisma.customerData.findFirst({
    where: whereClause,
  });

  if (!existingCustomer) {
    await prisma.customerData.create({
      data: {
        shop,
        email,
        token: token || "",
        phone: phone || "",
        recurring_token,
        recurring_init_trans_id,
        save_card,
        card,
      },
    });
    console.log("New customer entry created");
  } else {
    console.log("Customer already exists, no action needed");
  }
}

async function handleSessionResponse(response) {
  const userErrors = response?.userErrors || [];
  console.log("Response:", response);
  if (userErrors.length > 0) {
    return new Response(
      JSON.stringify({ raiseBanner: true, errors: userErrors }),
      {
        status: 400, // or 200 if you prefer
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  // console.log("Response:", response);
  return redirect(response.paymentSession.nextAction.context.redirectUrl);
}

export const action = async ({ request }) => {
  const body = Object.fromEntries((await request.formData()).entries());
  const { type, status, card_token } = body;

  const paymentSession = await getPaymentSession(body.order_number);
  const session = await getSessionByShop(paymentSession.shop);

  const client = new PaymentsAppsClient(
    paymentSession.shop,
    session.accessToken,
    PAYMENT,
  );

  // ---- SALE FAIL ----
  if (type === "sale" && status === "fail") {
    const response = await client.pendSession({
      id: paymentSession.id,
      gid: paymentSession.gid,
    });
    return handleSessionResponse(response);
  }

  // ---- RECURRING CUSTOMER ----
  if (body.recurring_init_trans_id && body.recurring_token) {
    console.log("Recurring Init");
    await handleCustomer({
      shop: paymentSession.shop,
      email: body.customer_email,
      phone: body.customer_phone,
      token: card_token,
      recurring_token: body.recurring_token,
      recurring_init_trans_id: body.recurring_init_trans_id,
      card: body.card,
      save_card: true,
    });
  }

  // ---- SALE SUCCESS ----
  if (type === "sale" && status === "success") {
    if (card_token) {
      console.log("Sale Success With Card Token");
      await handleCustomer({
        shop: paymentSession.shop,
        email: body.customer_email,
        phone: body.customer_phone,
        token: card_token,
      });
    } else {
      console.log("Sale Success Without Card Token");
    }

    const response = await client.resolveSession({
      id: paymentSession.id,
      gid: paymentSession.gid,
    });
    return handleSessionResponse(response);
  }

  // ---- 3DS SUCCESS ----
  if (type === "3ds" && status === "success" && card_token) {
    console.log("Card Token Found");
    await handleCustomer({
      shop: paymentSession.shop,
      email: body.customer_email,
      phone: body.customer_phone,
      token: card_token,
    });
  }
  console.log("Default");
  // ---- Default Fallback ----
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
