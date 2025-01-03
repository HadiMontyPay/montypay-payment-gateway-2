import express from 'express';
const app = express();

export const action = async ({ request }) => {
  const requestBody = await request.json();
  return requestBody;
};
