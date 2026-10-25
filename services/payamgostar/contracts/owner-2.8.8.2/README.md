# Owner-supplied IForm metadata

These six XML documents were extracted from the owner's uploaded WSDL/XSD text.
The reported installation version is 2.8.8.2. Browser explanatory headers were
removed, import locations were changed to sibling filenames, and the SOAP
service address was replaced with a reserved `example.invalid` placeholder.
No deployment address or credential is embedded here. Types, operation names,
namespaces, SOAPAction values and field order come from the supplied documents.

This is a real-schema snapshot for offline tests, not a working deployment URL
or a production fingerprint. At deployment, `prepare-contract` loads and pins
the current installation's actual WSDL/XSD bytes from server-only environment
variables, validates serialization and writes a private manifest.

Confirmed SaveForm inputs: `userName`, `password`, `formInfo: FormInfo`.
Custom values: `formInfo.ExtendedProperties.BaseCrmObjectExtendedPropertyInfo`
with string `UserKey` and `Value`. Result: `Message`, `Success`, `CrmId`.
SearchForm inputs: `userName`, `password`, `typeKey`, `query`.
Search results: `FormInfoList.FormInfo`; direct-ID reads also expose `FormInfo`.

The query parameter is declared only as `xs:string`. These schemas do not
specify a search language. A verified subject-scoped query template is still
required; the service must not invent SQL, LINQ or another query expression.
No test may call the original live CRM. Tests serve this metadata on localhost
and replace all SOAP responses with local fixtures.
