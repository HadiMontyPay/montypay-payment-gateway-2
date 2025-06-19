import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <>
      <div className={styles.index}>
        <div className={styles.gradient}></div>
        <div className={styles.content}>
          <h1 className={styles.heading}>MontyPay Payment Gateway</h1>
          {/* <p className={styles.text}>
            A tagline about [your app] that describes your value proposition.
          </p> */}
          {showForm && (
            <Form className={styles.form} method="post" action="/auth/login">
              <div className={styles.images}>
                <img src="/shopify-icon.png" alt="shopify" />
                <p>+</p>
                <img src="/Logo 512x512.png" alt="montypay" />
              </div>
              <label className={styles.label}>
                <span className={styles.lbl}>Shopify Store Domain</span>
                <input className={styles.input} type="text" name="shop" />
                <span>e.g: my-shop-domain.myshopify.com</span>
              </label>
              <button className={styles.button} type="submit">
                Log in
              </button>
            </Form>
          )}
          <ul className={styles.list}>
            <li>
              <strong>MontyPay</strong> allows merchants to collect payments
              globally with ease, using features like online and mobile
              checkouts, payment links, and fraud prevention, MontyPay addresses
              your payment challenges effectively.
            </li>
            <li>
              <strong>MontyPay</strong> is designed to simplify integration,
              even in the face of high transaction rates and low acceptance. Our
              advanced tools, including smart routing and detailed reporting,
              ensure optimized payment processes for your business.
            </li>
            <li>
              <strong>MontyPay's</strong> unified dashboard and mobile app
              provide real-time transaction insights, empowering merchants on
              the go. With our global reach, we enable businesses worldwide to
              streamline transactions using a single payment gateway.
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
