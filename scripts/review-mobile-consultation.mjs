import assert from "node:assert/strict";

export async function openMobileConsultation(page, route, width) {
  if (width > 640) return;
  assert.equal(await page.locator(".consult-section").count(), 0, "Mobile must not contain an inline form");
  const dialog = page.getByRole("dialog", { name: "درخواست مشاوره خرید" });
  assert.equal(await dialog.isVisible(), false);
  const trigger = page.locator(".mobile-cta a[href='#consultation']");
  await trigger.click();
  await dialog.waitFor({ state: "visible" });
  assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
  const radios = dialog.getByRole("radio");
  assert.equal(await radios.count(), route === "/" ? 5 : route.startsWith("/cbc") ? 3 : 2);
  if (route !== "/") {
    assert.equal(await dialog.locator('input[type="radio"]:checked').inputValue(), route.split("/").at(-1));
  }
  await dialog.locator("#lead-name").fill("متن حفظ‌شده");
  await dialog.getByRole("button", { name: "بستن فرم مشاوره" }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
  await trigger.click();
  assert.equal(await dialog.locator("#lead-name").inputValue(), "متن حفظ‌شده");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await trigger.click();
  await dialog.locator("#lead-name").fill("");
  await dialog.getByRole("button", { name: "بستن فرم مشاوره" }).focus();
  await page.keyboard.press("Shift+Tab");
  assert.equal(await dialog.locator('button[type="submit"]').evaluate(node => node === document.activeElement), true);
  await page.keyboard.press("Tab");
  assert.equal(await dialog.getByRole("button", { name: "بستن فرم مشاوره" }).evaluate(node => node === document.activeElement), true);
  const box = await dialog.boundingBox();
  assert.ok(box.y >= 0 && box.y + box.height <= 961, "Dialog must stay inside the mobile viewport");
  assert.equal(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
  const body = dialog.locator(".consult-dialog-body");
  await body.evaluate(node => { node.scrollTop = 0; });
}

export async function selectConsultationProduct(form, width, value) {
  if (width <= 640) await form.locator(`input[type="radio"][value="${value}"]`).check();
  else await form.getByLabel("دستگاه موردنظر").selectOption(value);
}

export async function reviewPhoneInput(page, form) {
  const phone = form.locator("#lead-mobile");
  assert.equal(await phone.getAttribute("maxlength"), "11");
  assert.equal(await phone.getAttribute("inputmode"), "numeric");
  for (const value of ["۰۹۱۲۳۴۵۶۷۸۹", "٠٩١٢٣٤٥٦٧٨٩"]) {
    await phone.fill(value);
    const alert = page.getByRole("alertdialog", { name: "کیبورد را به انگلیسی تغییر دهید" });
    await alert.waitFor({ state: "visible" });
    assert.equal(await phone.inputValue(), "");
    await alert.getByRole("button", { name: "متوجه شدم" }).click();
    await alert.waitFor({ state: "hidden" });
    assert.equal(await phone.evaluate(node => node === document.activeElement), true);
  }
  for (const value of ["02123456789", "9123456789", "+9891234567", "09abc", "09 123", "09-123"]) {
    await phone.fill(value);
    assert.equal(await phone.inputValue(), "", `Rejected mobile input: ${value}`);
  }
  await phone.fill("0");
  await phone.pressSequentially("2");
  assert.equal(await phone.inputValue(), "0");
  await phone.pressSequentially("9");
  assert.equal(await phone.inputValue(), "09");
  await phone.pressSequentially("1234567890");
  assert.equal(await phone.inputValue(), "09123456789");
  await phone.fill("");
  await phone.evaluate(node => {
    const data = new DataTransfer();
    data.setData("text/plain", "۰۹۱۲۳۴۵۶۷۸۹");
    node.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  const alert = page.getByRole("alertdialog", { name: "کیبورد را به انگلیسی تغییر دهید" });
  await alert.waitFor({ state: "visible" });
  await alert.getByRole("button", { name: "متوجه شدم" }).click();
  assert.equal(await phone.inputValue(), "");
}
