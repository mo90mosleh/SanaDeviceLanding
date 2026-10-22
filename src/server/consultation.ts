import process from "node:process";
import { z } from "zod";
import { products } from "../components/landing/products";
import { normalizeMobile, validateLead } from "../lib/consultation";
import type { LeadPayload } from "../lib/consultation";
import { utmKeys } from "../lib/attribution";
import type { Attribution } from "../lib/attribution";

const attributionValue = z.string().max(200).optional();
const schema = z.object({
  name: z.string().max(100),
  organization: z.string().max(150),
  mobile: z.string().max(20),
  productModel: z.string().max(64),
  landingPage: z.string().max(100),
  utm: z.object({
    utm_source: attributionValue,
    utm_medium: attributionValue,
    utm_campaign: attributionValue,
    utm_content: attributionValue,
    utm_term: attributionValue,
  }).default({}),
});
const failureMessage = "ارسال درخواست تأیید نشد. لطفاً دوباره تلاش کنید یا با کارشناسان تماس بگیرید.";
const reply = (body: object, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store" },
});

export async function handleConsultation(request: Request): Promise<Response> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") {
    return reply({ message: "نوع درخواست معتبر نیست." }, 415);
  }
  // Bound the body before parsing; never log or persist personal fields here.
  const reader = request.body?.getReader();
  if (!reader) return reply({ message: "اطلاعات درخواست کامل نیست." }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      return reply({ message: "حجم درخواست بیش از حد مجاز است." }, 413);
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return reply({ message: "اطلاعات درخواست معتبر نیست." }, 400);
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return reply({ message: "اطلاعات درخواست کامل یا معتبر نیست." }, 422);
  const data = parsed.data;
  const fields = { name: data.name.trim(), organization: data.organization.trim(), mobile: normalizeMobile(data.mobile) };
  const errors = validateLead(fields);
  const product = products.find((item) => item.model === data.productModel);
  if (Object.keys(errors).length || !product || !["/", product.route].includes(data.landingPage)) {
    return reply({ message: "اطلاعات تماس و دستگاه انتخاب‌شده را بررسی کنید." }, 422);
  }
  const utm: Attribution = {};
  for (const key of utmKeys) {
    const value = data.utm[key]?.trim();
    if (value) utm[key] = value;
  }
  const payload: LeadPayload = {
    ...fields,
    productModel: product.model,
    manufacturer: product.manufacturer,
    productCategory: product.category,
    landingPage: data.landingPage,
    utm,
  };
  const webhook = process.env["SANA_LEAD_WEBHOOK_URL"];
  if (!webhook) return reply({ message: failureMessage }, 503);
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });
    await response.body?.cancel();
    if (!response.ok) return reply({ message: failureMessage }, 502);
    return reply({ status: "submitted" });
  } catch {
    return reply({ message: failureMessage }, 502);
  }
}
