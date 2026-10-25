"""Form contract derived from the owner's actual IForm WSDL and five XSDs.

SearchForm semantics are documented in the official Form.pdf, PDF pages 9–11:
https://developer.payamgostar.com/wp-content/uploads/2023/08/Form.pdf
typeKey is the form type code, Subject supports ==, and string values are quoted.
"""
BINDING = "{http://tempuri.org/}BasicHttpBinding_IForm"
DOCUMENTED_SEARCH_TEMPLATE = 'Subject == "{subject}"'
DOCUMENTED_SEARCH_TYPE_KEY = "CBCSalesOpp"
ACTIONS = {
    "SaveForm": "http://tempuri.org/IForm/SaveForm",
    "SearchForm": "http://tempuri.org/IForm/SearchForm",
}


def owner_form_manifest(fingerprint, search_query_template, search_query_verified=False, search_type_key=None):
    if not search_query_verified or not isinstance(search_query_template, str):
        raise ValueError("SearchForm query grammar must be verified before preparing a live contract")
    if search_query_template.count("{subject}") != 1:
        raise ValueError("A verified subject-scoped SearchForm template is required")
    if not isinstance(search_type_key, str) or not search_type_key.strip():
        raise ValueError("SearchForm typeKey semantics must be verified; its XSD type is only string")
    return {
        "profile": "owner-iform-2.8.8.2",
        "verified": True,
        "wsdl_fingerprint": fingerprint,
        "binding": BINDING,
        "expected_actions": ACTIONS,
        "crm_id_format": "uuid",
        "reconcile_operation": "SearchForm",
        "search_query_verified": True,
        "search_query_template": search_query_template,
        "search_type_key": search_type_key,
        "custom_fields": {"key_property": "UserKey", "value_property": "Value"},
        "save_arguments": {
            "userName": {"$value": "username"},
            "password": {"$value": "password"},
            "formInfo": {
                "CrmObjectTypeCode": {"$value": "crmObjectTypeCode"},
                "CrmId": None,
                "ParentCrmObjectId": {"$value": "emptyParent"},
                "IdentityId": {"$value": "emptyIdentity"},
                "Subject": {"$value": "subject"},
                "ExtendedProperties": {
                    "BaseCrmObjectExtendedPropertyInfo": {"$fields": True}
                },
            },
        },
        "read_arguments": {
            "userName": {"$value": "username"},
            "password": {"$value": "password"},
            "typeKey": search_type_key,
            "query": {"$value": "searchQuery"},
        },
        "save_result": {"success": ["Success"], "message": ["Message"], "crm_id": ["CrmId"]},
        "read_result": {
            "success": ["Success"], "message": ["Message"],
            "records": ["FormInfoList", "FormInfo"],
            "single_record": ["FormInfo"],
        },
        "record_paths": {
            "subject": ["Subject"], "type_code": ["CrmObjectTypeCode"],
            "identity": ["IdentityId"], "parent": ["ParentCrmObjectId"],
            "crm_id": ["CrmId"],
            "fields": ["ExtendedProperties", "BaseCrmObjectExtendedPropertyInfo"],
            "field_key": ["UserKey"], "field_value": ["Value"],
        },
    }


def validate_owner_manifest(client, search_query_template, verified, search_type_key):
    """Validate local serialization against the LIVE loaded metadata; no SOAP POST."""
    client.manifest = owner_form_manifest(client.fingerprint, search_query_template, verified, search_type_key)
    client.verify_contract()
    return client.manifest
