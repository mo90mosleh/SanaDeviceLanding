# اتصال مستقل SANA به پیام‌گستر

## وضعیت فعلی

سرویس در branch جداست؛ سایت اصلی، n8n و هیچ تنظیم production تغییر نکرده‌اند. هیچ رکورد آزمایشی در CRM واقعی ساخته نشده است.

WSDL اصلی و هر پنج XSD ارسالی مالک دریافت و بررسی شدند. شکل واقعی SaveForm، FormInfo، فیلدهای سفارشی و نتیجه‌ها اکنون در `profile.py` پیاده شده است. snapshot بدون آدرس نصب در `contracts/owner-2.8.8.2/` نگهداری می‌شود و تست‌ها آن را فقط روی localhost اجرا می‌کنند. شمارهٔ 2.8.8.2 نسخهٔ اعلام‌شدهٔ مالک است؛ ارتباط و مجوز حساب نصب زنده هنوز آزمایش نشده‌اند.

مانع معنای SearchForm با [PDF رسمی Form](https://developer.payamgostar.com/wp-content/uploads/2023/08/Form.pdf#page=9) رفع شد: صفحهٔ PDF ۹، typeKey را کد نوع فرم معرفی می‌کند؛ صفحات ۱۰ و ۱۱، Subject، عملگر == و مقدار رشته‌ای داخل کوتیشن را تأیید می‌کنند. تنظیم مستند این پروژه typeKey=CBCSalesOpp و query به‌شکل `Subject == "{subject}"` است. این تأیید مستندات است؛ دسترسی و رفتار نصب زنده هنوز آزمایش نشده‌اند.

برای فعال‌سازی، میزبان دارای دسترسی شبکه، دیسک دائمی و envهای حساب سرویس هم لازم‌اند. GitHub Pages نمی‌تواند این سرویس یا دیتابیس آن را اجرا کند.

## استقلال از workflow مربوط به n8n

```text
فرم مشترک سایت → HTTPS gateway → ذخیرهٔ اتمیک و دائمی لید
                                  ├─ پردازشگر webhook → n8n فعلی → Sheets / Telegram
                                  └─ پردازشگر CRM     → SOAP SaveForm
```

CRM را هیچ نود یا مرحله‌ای در n8n اجرا نمی‌کند. هر کانال thread، client initialization، lease، status و retry خود را دارد. کندی یا خرابی n8n مانع CRM نیست و نقص WSDL یا credential پیام‌گستر نیز ارسال webhook را متوقف نمی‌کند. خطای آماده‌سازی یک کانال حداکثر چهار بار تلاش می‌شود؛ سپس فقط همان کانال blocked و لیدهای آن queued باقی می‌مانند. پس از اصلاح تنظیمات، restart آن را دوباره آماده می‌کند. وضعیت کلی کانال‌ها در /healthz، بدون اطلاعات محرمانه، نمایش داده می‌شود.

این استقلال مربوط به مقصدها و workflow است؛ gateway، میزبان و دیسک زیرساخت مشترک‌اند. خرابی خود این زیرساخت با خرابی یکی از مقصدها یکسان نیست.

پاسخ موفق gateway یعنی payload روی دیسک commit شده، نه اینکه CRM یا همهٔ مراحل n8n حتماً تکمیل شده‌اند. رابط فعلی همان رفتار پیام موفقیت را حفظ می‌کند. خطای downstream لید را حذف نمی‌کند.

## قرارداد واقعی Form

- binding: `{http://tempuri.org/}BasicHttpBinding_IForm`
- SaveForm inputs: `userName`، `password`، `formInfo: FormInfo`.
- SOAPAction: `http://tempuri.org/IForm/SaveForm`.
- custom fields: `formInfo.ExtendedProperties.BaseCrmObjectExtendedPropertyInfo` با UserKey و Value متنی.
- SaveForm result: Message، Success و CrmId از نوع GUID.
- SearchForm inputs: userName، password، typeKey و query.
- SearchForm results: `FormInfoList.FormInfo` یا `FormInfo` منفرد. متد FindFormById نیز FormInfo دارد، اما در مسیر ایجاد یا تطبیق بدون ID استفاده نمی‌شود.

Zeep از WSDL واقعی namespace، ترتیب عناصر، SOAPAction و XML را می‌سازد. profile، actionهای تأییدشده و fingerprint همهٔ WSDL/XSDهای خوانده‌شده را کنترل می‌کند. snapshot ارسالی جایگزین fingerprint قرارداد زنده نیست؛ آدرس‌های import آن فقط برای تست محلی تغییر کرده‌اند.

تنها عملیات نوشتن SaveForm است. CrmObjectTypeCode همیشه CBCSalesOpp است؛ IdentityId، ParentCrmObjectId و CrmId درخواست خالی‌اند. هیچ Identity، Opportunity، تعریف فرم، فیلد یا workflow ایجاد یا تغییر داده نمی‌شود. مقادیر اختیاری مانند CreatDate، ModifyDate، AssignedTo و CrmObjectTypeId جعل نمی‌شوند.

## نگاشت payload واقعی

| مبدأ و aliasهای پشتیبانی‌شده | UserKey |
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

همهٔ خروجی‌ها رشته‌اند. مقادیر غایب خالی می‌مانند؛ زمان receipt صف جای زمان ثبت اولیه نگاشت نمی‌شود. alias متناقض رد می‌شود. honeypot غیرخالی ذخیره و مانند قبل به n8n فرستاده می‌شود، اما رکورد CRM ایجاد نمی‌کند.

## تنظیمات و فعال‌سازی

1. Python 3.12+ و volume **محلی و دائمی** روی میزبان قابل‌دسترسی به CRM و وب‌هوک HTTPS موجود فراهم شود. آدرس CRM، رمز و فایل قرارداد بیرون مخزن باشند.
2. متغیرهای `.env.example` از secret manager یا EnvironmentFile امن بارگذاری شوند؛ برنامه فایل .env را خودکار source نمی‌کند. هیچ مقدار محرمانه‌ای VITE_ نباشد.
3. SANA_DB_PATH مسیر مطلق روی volume باشد. SANA_WEBHOOK_URL همان مقصد فعلی n8n و SANA_ALLOWED_ORIGIN مبدأ HTTPS سایت بدون slash نهایی است. bind پیش‌فرض 127.0.0.1 است؛ reverse proxy HTTPS، محدودیت زمان/اندازه و rate limit عمومی لازم است.
4. PAYAMGOSTAR_WSDL_URL و PAYAMGOSTAR_ENDPOINT فقط در env سرور تنظیم شوند؛ مسیر endpoint باید /Services/API/IForm.svc باشد. HTTP نیازمند PAYAMGOSTAR_ALLOW_HTTP=true است؛ این flag رمزنگاری ایجاد نمی‌کند. ارتباط باید روی مسیر شبکهٔ مورد اعتماد باشد.
5. پیش‌فرض مستند `Subject == "{subject}"` در PAYAMGOSTAR_SEARCH_QUERY_TEMPLATE آماده است. قالب باید دقیقاً یک `{subject}` داشته باشد. مقدار تأییدشدهٔ انتخابگر را نیز در PAYAMGOSTAR_SEARCH_TYPE_KEY قرار دهید؛ پیش‌فرض CBCSalesOpp از کد فرم مالک و تعریف رسمی typeKey گرفته شده است. PAYAMGOSTAR_SEARCH_QUERY_VERIFIED=true نشان‌دهندهٔ تأیید مستندات رسمی است؛ آزمون نصب زنده همچنان باقی است.
6. snapshot محلی هیچ grammar جست‌وجوی production پیشنهاد نمی‌کند. عبارت fixture-subject در تست‌ها صرفاً زبان mock است و نباید در env واقعی کپی شود.

```sh
python -m venv services/payamgostar/.venv
services/payamgostar/.venv/bin/python -m pip install -r services/payamgostar/requirements.txt
services/payamgostar/.venv/bin/python -m services.payamgostar inspect-wsdl
services/payamgostar/.venv/bin/python -m services.payamgostar prepare-contract
services/payamgostar/.venv/bin/python -m services.payamgostar check-contract
```

prepare-contract فقط GET مربوط به WSDL/XSD و ساخت/اعتبارسنجی محلی XML را انجام می‌دهد؛ SaveForm یا SearchForm را فراخوانی نمی‌کند. manifest در PAYAMGOSTAR_CONTRACT_FILE، با مسیر مطلق و مجوز 0600 ساخته می‌شود و فایل موجود بازنویسی نمی‌شود. در اجرای بعدی fingerprint زنده باید همان باشد؛ تغییر metadata باعث مسدودشدن کانال CRM می‌شود.

قبل از اجرای worker، حساب سرویس باید مجوز ثبت فرم موجود و خواندن Form برای تطبیق داشته باشد. اعتبارسنجی XML، مجوز واقعی حساب یا درستی grammar query را اثبات نمی‌کند. هر تست ثبت واقعی همچنان به اجازهٔ جداگانهٔ مالک نیاز دارد.

DB را فقط یک‌بار و دستی initialize کنید؛ init-db نباید جزئی از build/start/deploy خودکار باشد:

```sh
services/payamgostar/.venv/bin/python -m services.payamgostar init-db
services/payamgostar/.venv/bin/python -m services.payamgostar serve
services/payamgostar/.venv/bin/python -m services.payamgostar status --submission-id ID
```

بعد از آماده‌شدن و بررسی سرور، فقط تنظیمات build عمومی مرورگر تغییر می‌کنند:

```dotenv
VITE_CONSULTATION_SERVER_MODE=true
VITE_CONSULTATION_API_URL=https://YOUR_GATEWAY_HOST/api/leads
```

پیش‌فرض همچنان مسیر مستقیم قبلی n8n است. هیچ فایل UI، فیلد فرم یا workflow n8n تغییر نمی‌کند. gateway همان JSON را بدون حذف یا بازنویسی زمان/UTM به webhook می‌فرستد؛ submissionId تنها کلید افزودهٔ حالت سروری است. SANA_INGEST_TOKEN اختیاری فقط برای replay سروری است و نباید وارد مرورگر شود.

## شمارنده، ذخیره‌سازی و عدم تکرار

SQLite با WAL، synchronous=FULL، BEGIN IMMEDIATE و کلیدهای UNIQUE، subject، payload اولیه و دو delivery را در یک transaction commit می‌کند. نخستین درخواست معتبر DeviceOpp100100 است و هر درخواست جدید یک واحد اضافه می‌کند. همان submissionId/payload همان subject را می‌گیرد؛ payload متفاوت با ID قبلی خطای 409 است. rollback شکست‌خورده شمارنده را مصرف نمی‌کند.

DB و marker هم‌هویت باید روی همان volume بمانند؛ startup هیچ DB یا seed جدیدی ایجاد نمی‌کند. volume خالی/عوض‌شده متوقف می‌شود. چند thread/process روی همان فایل محلی پشتیبانی می‌شوند؛ چند میزبان با DBهای جدا یا mount شبکه‌ای/NFS پشتیبانی نمی‌شوند.

وضعیت، attempts، lease، subject و CrmId دائمی‌اند. از SQLite backup سازگار استفاده شود و DB و marker با هم نگهداری شوند. restore نسخهٔ قدیمی پیش از اجرای مجدد نیازمند تطبیق counter/submissionها با CRM است. یکتایی در برابر نویسندگان خارجی CRM یا DB از‌دست‌رفته ادعا نمی‌شود.

ConnectTimeout پیش از اتصال حداکثر چهار بار با backoff تکرار می‌شود. Success/Message و GUID غیرصفر بررسی می‌شوند. SOAP Fault، خطای parse، Success بدون ID معتبر، timeout خواندن و lease منقضی ambiguous هستند. متن خام Fault/Message که می‌تواند credential یا دادهٔ شخصی بازتاب دهد لاگ نمی‌شود؛ فقط کد خطای کنترل‌شده ذخیره می‌شود.

در ambiguous فقط SearchForm و تطبیق Subject، CBCSalesOpp، هویت/والد خالی و یازده مقدار اولیه انجام می‌شود. یک نتیجهٔ منطبق CrmId را ذخیره می‌کند؛ چند نتیجه/دادهٔ ناسازگار یا چهار جست‌وجوی بی‌نتیجه به needs_review می‌رود. **نتیجهٔ خالی مجوز SaveForm دوباره نیست**؛ ممکن است commit قبلی با تأخیر انجام شود. برای فعال‌سازی، دسترسی شبکه و حساب سرویس نصب واقعی همچنان باید بررسی شوند.

خرابی worker پس از انقضای lease ۱۸۰ثانیه‌ای همین مسیر تطبیق را طی می‌کند؛ token مانع overwrite توسط worker قدیمی است. پاسخ مبهم webhook هم خودکار replay نمی‌شود، چون بدون تغییر n8n نبودن اثر قبلی در Sheets/Telegram قابل اثبات نیست.

شناسه و زمان اولیهٔ retry مرورگر در حافظهٔ تب ثابت می‌مانند؛ پس از acknowledgement، درخواست جدید ID تازه می‌گیرد. UI فعلی draft را پس از reload بازیابی نمی‌کند؛ بازیابی بین تب/دستگاه پیاده نشده است. لید قدیمی بدون submissionId برای replay به شناسهٔ پایدار upstream نیاز دارد، نه deduplication صرفاً بر اساس نام/موبایل.

## تست و محدودهٔ تأیید

```sh
python -m pip install -r services/payamgostar/requirements.txt
python -m unittest discover -s services/payamgostar/tests -v
node --test tests/server-consultation.test.mjs
```

تست‌ها فقط localhost، دیتابیس موقت و webhook mock دارند. قرارداد ساختگی قبلی برای fault/negative cases حفظ شده و تست‌های جدید schema واقعی ارسالی، وراثت FormInfo، آرایهٔ ExtendedProperties، casing پارامترها، SOAPAction، نتیجهٔ SearchForm و GUID واقعی را می‌سنجند. تست‌های استقلال کانال، هم‌زمانی چندپردازه، rollback، restart، retry و نگاشت اولیه نیز باقی‌اند. workflow branch علاوه بر این‌ها، lint، typecheck، تست‌های قبلی فرم و دوازده بررسی مرورگر استاتیک را اجرا می‌کند.
