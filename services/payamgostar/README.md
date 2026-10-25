# SANA → PayamGostar Form delivery

## وضعیت فعلی و مانع‌های واقعی

این سرویس در branch جدا پیاده شده و روی سایت اصلی فعال نشده است. مسیر فعلی سایت همچنان مرورگر → وب‌هوک n8n است. ظاهر فرم‌ها، فیلدها، اعتبارسنجی، UTM و گردش‌کار n8n تغییر نکرده‌اند.

نسخهٔ اعلام‌شدهٔ CRM برابر 2.8.8.2 است، اما سازگاری با نصب واقعی هنوز تأیید نشده است:

- صفحهٔ رسمی `https://developer.payamgostar.com/soap-docs/` در ابزار مرورگر قابل دریافت نبود؛ در GitHub Actions خطای DNS با `No address associated with hostname` دریافت شد.
- دریافت WSDL از محیط کار به دلیل در دسترس نبودن پراکسی `proxy:8080` ممکن نشد. این خطا اثبات نمی‌کند که خود CRM خاموش است. دسترسی واقعی سرور اجراکننده به پورت CRM هنوز باید بررسی شود.
- آدرس نصب و رمزها در مخزن یا workflow قرار نگرفته‌اند. هیچ متد SOAP روی CRM واقعی فراخوانی نشده و رکورد آزمایشی ساخته نشده است.
- سرور اجرای دائمی، volume دائمی، فایل قرارداد واقعی و credential در این جلسه پیکربندی نشده‌اند. GitHub Pages توان اجرای این سرویس یا نگهداری دیتابیس ندارد.

**در نتیجه این branch یک سرویس قابل تست با فعال‌سازی مشروط است؛ اتصال نصب واقعی را فعال یا تأییدشده معرفی نمی‌کند.** فایل `tests/synthetic.wsdl` فقط قرارداد ساختگی تست است و نباید به‌عنوان قرارداد پیام‌گستر استفاده شود.

## مسیر ارسال

```text
فرم مشترک فعلی (صفحهٔ اصلی + پنج محصول)
  → src/lib/consultation.ts، فقط در server mode
  → HTTPS POST /api/leads
  → commit اتمیک payload + subject + دو delivery در SQLite دائمی
      ├─ وب‌هوک قبلی n8n با همان payload → اتصال‌های موجود Sheets / Telegram
      └─ worker → WSDL واقعی → فقط SaveForm برای ایجاد Form با CBCSalesOpp
```

دریافت موفق HTTP از gateway به معنی ذخیرهٔ دائمی لید برای پردازش است، نه ثبت قطعی CRM. رابط فعلی همان popup موفقیت را دارد؛ خطای CRM به ازبین‌رفتن payload یا حذف صف منجر نمی‌شود. وضعیت کانال webhook و CRM مستقل نگهداری می‌شود.

حالت پیش‌فرض مرورگر همچنان ارسال مستقیم سابق است. فعال‌سازی سرور فقط پس از آماده‌شدن پیش‌نیازهای زیر، با تنظیمات build انجام می‌شود:

```dotenv
VITE_CONSULTATION_SERVER_MODE=true
VITE_CONSULTATION_API_URL=https://YOUR_GATEWAY_HOST/api/leads
```

این دو مقدار عمومی‌اند. آدرس CRM، WSDL، نام کاربری و رمز **هرگز** نباید متغیر `VITE_` باشند. هیچ فایل UI تغییر نکرده؛ تغییر فرانت‌اند فقط لایهٔ انتقال مشترک و تست آن است. n8n نیازی به تغییر ندارد. gateway، payload ورودی را بدون حذف کلیدها یا تغییر زمان/UTM به وب‌هوک قبلی می‌فرستد؛ `submissionId` تنها کلید افزودهٔ حالت سروری است.

## نگاشت واقعی

| payload واقعی (نام‌های جایگزین پشتیبانی‌شده) | UserKey |
| --- | --- |
| fullName / name | DeviceOppLeadName |
| mobile / Mobile | DeviceOppPhoneNumber |
| labName / organization / LabName | DeviceOppOrgName |
| utm.utm_campaign / utm_campaign / campaign | DeviceOppCampaign |
| utm.utm_source / utm_source / source | DeviceOppSource |
| utm.utm_medium / utm_medium / medium | DeviceOppMedium |
| utm.utm_content / utm_content / content | DeviceOppContent |
| utm.utm_term / utm_term / term | DeviceOppTerm |
| time / Time | DeviceOppTimeOfDataEntry |
| product / productModel / Product | DeviceOppProduct |
| company / manufacturer / Company | DeviceOppCompany |

همهٔ خروجی‌ها رشته‌اند. مقدار غایب خالی می‌ماند؛ محصول، برند، کمپین یا زمان مصنوعی ساخته نمی‌شود. زمان receipt محلی فقط برای صف است و به DeviceOppTimeOfDataEntry نگاشت نمی‌شود. aliasهای متناقض به‌جای انتخاب دلخواه رد می‌شوند. honeypot غیرخالی ذخیره و مانند قبل به n8n منتقل می‌شود، اما وارد CRM نمی‌شود.

## ذخیره‌سازی و شمارنده

SQLite روی **یک volume محلی و دائمی**، با WAL، synchronous=FULL، transaction از نوع BEGIN IMMEDIATE و کلیدهای UNIQUE کار می‌کند. چند thread و چند process روی همان فایل پشتیبانی می‌شوند؛ چند ماشین با فایل‌های جدا یا mount شبکه‌ای/NFS پشتیبانی نمی‌شوند.

- اولین درخواست معتبر: DeviceOpp100100؛ درخواست‌های جدید بعدی یک واحد افزایش.
- تخصیص subject، ثبت submission و هر دو delivery در یک transaction است.
- submissionId یکسان و payload یکسان همان subject را می‌گیرد؛ payload متفاوت با همان ID خطای 409 دارد.
- شمارنده، payload اولیه، subject، attempts، state و CrmId روی دیسک هستند؛ حافظهٔ process منبع حقیقت نیست.
- startup دیتابیس نمی‌سازد و شمارنده را seed نمی‌کند. فایل DB و marker هم‌هویت باید از قبل موجود باشند. volume خالی/عوض‌شده باعث توقف می‌شود.
- `init-db` تنها یک بار و دستی اجرا می‌شود؛ اگر فایل موجود باشد آن را بازنویسی نمی‌کند.

پشتیبان سازگار SQLite، DB و marker را با هم نگه دارد؛ از کپی جداگانهٔ فایل زنده بدون WAL/backup API استفاده نشود. restore نسخهٔ قدیمی می‌تواند رکوردهای بعد از backup را از دست بدهد؛ پیش از فعال‌کردن worker پس از restore باید شمارنده و submissionها با CRM و outbox تطبیق داده شوند. این سرویس یکتایی Subject نسبت به نویسندگان خارجی CRM یا DB از‌دست‌رفته را ادعا نمی‌کند. از همان volume و همان DB در هر deploy استفاده کنید.

## قرارداد SOAP: بدون حدس

Zeep از WSDL/XSD واقعی namespace، binding، SOAPAction، ترتیب عناصر و serialization را می‌سازد. مسیر endpoint فقط `/services/api/iform.svc` پذیرفته می‌شود. هیچ envelope ثابت production در کد وجود ندارد.

ابتدا روی میزبان دارای دسترسی، envهای فایل `.env.example` را از secret manager یا EnvironmentFile خارج مخزن بارگذاری کنید؛ فایل به‌صورت خودکار source نمی‌شود. سپس:

```sh
python -m venv services/payamgostar/.venv
services/payamgostar/.venv/bin/python -m pip install -r services/payamgostar/requirements.txt
services/payamgostar/.venv/bin/python -m services.payamgostar inspect-wsdl
```

این فرمان فقط GET مربوط به WSDL و XSDها را انجام می‌دهد. هیچ SOAP operation را اجرا نمی‌کند. خروجی، fingerprint محتوای تمام قراردادها و signature واقعی متدهاست؛ نام binding و متد خواندن Form باید از همین خروجی و مستندات قابل‌دسترسی تأیید شوند.

فایل JSON قراردادِ خارج مخزن با `PAYAMGOSTAR_CONTRACT_FILE` معرفی می‌شود و این کلیدها را لازم دارد:

- `verified: true` و `wsdl_fingerprint` از inspect-wsdl؛ تغییر WSDL باعث توقف می‌شود.
- `binding`: QName واقعی binding؛ نه namespace فرضی.
- `save_arguments`: ساختار پارامترهای واقعی SaveForm.
- `custom_fields`: نام واقعی propertyهای UserKey و مقدار متنی در DTO نصب؛ `key_property` و `value_property`.
- `reconcile_operation`: متد خواندن موجود Form، تأییدشده از WSDL، همراه `read_arguments`. ایجاد/جست‌وجوی Identity و هر متد Opportunity ممنوع است.
- `save_result`: مسیرهای آرایه‌ای `success`، `message` و `crm_id` در نتیجهٔ واقعی Zeep.
- `read_result`: مسیرهای `success`، `message` و `records` در نتیجهٔ متد خواندن.
- `record_paths`: مسیرهای واقعی `subject`، `type_code`، `identity`، `parent`، `crm_id`، `fields`، `field_key` و `field_value` در هر Form برگشتی.

در template پارامترها فقط این placeholderها وجود دارند: `{"$value":"username"}`، `password`، `subject`، `crmObjectTypeCode`، `emptyIdentity` و `emptyParent`. `{"$fields":true}` یازده جفت نگاشت‌شده را با propertyهای تأییدشده می‌سازد. جایگاه/ساختار این داده‌ها باید از DTO واقعی تعیین شود؛ نمونهٔ تست یا namespace رایج WCF جایگزین آن نیست.

type code در کد CBCSalesOpp است. پیش از هر SaveForm، XML تولیدشده بررسی می‌شود: Subject ثابت، type code درست، تمام یازده UserKey/مقدار دقیقاً یک بار و IdentityId، ParentCrmObjectId و CrmId خالی. بنابراین عملیات ایجاد است، نه ویرایش یک CrmId موجود. هیچ هویت، فرم تعریف‌شده، فیلد یا workflow جدیدی ساخته نمی‌شود.

```sh
services/payamgostar/.venv/bin/python -m services.payamgostar check-contract
```

check-contract فقط serialization را بررسی می‌کند و SaveForm یا متد خواندن را اجرا نمی‌کند. بدون قرارداد واقعی تأییدشده، سرویس serve راه‌اندازی نمی‌شود. اگر نصب، متد خواندن Form مناسب ندارد، آن را حدس نزنید؛ این مورد مانع فعال‌سازی امن تطبیق timeout است.

## راه‌اندازی پس از رفع مانع‌ها

1. سرور Python 3.12+ با شبکهٔ قابل‌دسترسی به CRM و HTTPS خروجی به وب‌هوک موجود فراهم شود.
2. volume دائمی محلی با دسترسی محدود و backup سازگار به SANA_DB_PATH متصل شود. DB/marker و WAL باید روی همان volume بمانند. init-db را در build/start/deploy خودکار قرار ندهید.
3. envهای سروری را با مقادیر واقعی خارج مخزن تنظیم کنید؛ endpoint و WSDL همان نصب CRM باشند. HTTP نصب موجود به `PAYAMGOSTAR_ALLOW_HTTP=true` نیاز دارد؛ این flag TLS ایجاد نمی‌کند. از مسیر شبکهٔ مورد اعتماد یا تونل استفاده کنید.
4. inspect-wsdl و check-contract بدون نوشتن در CRM موفق شوند. ساخت قرارداد واقعی و بررسی مجوز حساب سرویس هنوز باقی است.
5. یک بار initialize کنید، سپس سرویس را زیر process supervisor پشت reverse proxy HTTPS اجرا کنید:

```sh
services/payamgostar/.venv/bin/python -m services.payamgostar init-db
services/payamgostar/.venv/bin/python -m services.payamgostar serve
```

6. SANA_WEBHOOK_URL دقیقاً مقصد فعلی n8n باشد. SANA_ALLOWED_ORIGIN مبدأ واقعی سایت بدون slash نهایی است. `/api/leads` برای مرورگر همان origin یا replay سروری با SANA_INGEST_TOKEN پذیرفته می‌شود؛ توکن replay را در مرورگر نگذارید. reverse proxy باید محدودیت اندازه/زمان درخواست و rate limit عمومی داشته باشد.
7. فقط بعد از آماده‌شدن سرویس، دو env عمومی build بالا تغییر کنند. در این branch هیچ env production، n8n یا main تغییر داده نشده است.

برای مشاهدهٔ وضعیت بدون نمایش payload یا افشای API عمومی:

```sh
services/payamgostar/.venv/bin/python -m services.payamgostar status --submission-id ID
```

## retry و محدودیت عدم تکرار

ConnectTimeout پیش از برقراری اتصال حداکثر چهار بار با backoff تلاش می‌شود. خطای صریح CRM/SOAP Sender به failed می‌رود و payload حفظ می‌شود. Success و Message بررسی می‌شوند؛ Success بدون CrmId معتبر موفقیت قطعی نیست. Fault، خطای parse، timeout خواندن و lease منقضی، ambiguous محسوب می‌شوند. متن خام SOAP Fault/Message که ممکن است رمز یا دادهٔ شخصی را بازتاب دهد، در لاگ و last_error قرار نمی‌گیرد؛ فقط کد خطای کنترل‌شده ذخیره می‌شود.

در حالت ambiguous، فقط خواندن Form و تطبیق دقیق Subject، CBCSalesOpp، هویت/والد خالی و یازده مقدار اولیه انجام می‌شود. یک تطبیق معتبر، CrmId را ذخیره و وضعیت را submitted می‌کند. چند نتیجه یا دادهٔ ناسازگار به needs_review می‌رود. چهار تلاش خواندنِ بی‌نتیجه نیز needs_review است؛ **نتیجهٔ خالی مجوز SaveForm دوباره نیست**، چون CRM ممکن است با تأخیر commit کند. CRM فاقد idempotency/unique constraint اجازهٔ ادعای exactly-once در همهٔ قطع‌شدن‌های شبکه را نمی‌دهد؛ این طراحی برای پرهیز از رکورد تکراری، وضعیت نامعلوم را نگه می‌دارد و خودکار دوباره ایجاد نمی‌کند.

worker مرده پس از ۱۸۰ ثانیه با همین مسیر تطبیق بازیابی می‌شود. token lease مانع overwrite توسط worker قدیمی است. برای وب‌هوک قبلی نیز پاسخ مبهم خودکار replay نمی‌شود، چون بدون تغییر n8n نمی‌توان نبودن ثبت قبلی در Sheets/Telegram را ثابت کرد؛ به needs_review می‌رود. خطای کانال CRM مانع پردازش مستقل وب‌هوک نمی‌شود.

شناسه و زمان اولیهٔ retry مرورگر در حافظهٔ تب ثابت می‌مانند؛ بعد از acknowledgement، ثبت جدید ID جدید می‌گیرد. پس از reload تب، UI فعلی draft را نگه نمی‌دارد؛ بازیابی بین تب/دستگاه پیاده نشده است. برای replay لیدهای قدیمی که submissionId نداشتند، شناسهٔ پایدار upstream لازم است؛ آن‌ها را صرفاً از روی نام و شماره deduplicate نکنید.

## تست

```sh
python -m pip install -r services/payamgostar/requirements.txt
python -m unittest discover -s services/payamgostar/tests -v
node --test tests/server-consultation.test.mjs
```

تست‌ها از CRM واقعی استفاده نمی‌کنند: WSDL ساختگی و SOAP فقط روی localhost، DBهای موقت و webhook mock هستند. پوشش شامل یازده نگاشت، مقدار غایب/alias متناقض، هم‌زمانی چندپردازه، restart، duplicate ID، timeout مبهم، matching/collision، retry محدود، lease منقضی، Fault، XML escaping، SOAPAction از WSDL، secret redaction، پذیرش اتمیک HTTP و حفظ payload قبلی است. workflow شاخه lint، typecheck، تست‌های قبلی و export/static-browser فرم‌ها را هم اجرا می‌کند.
