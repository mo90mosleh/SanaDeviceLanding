import hashlib
import json
import re


FIELD_ALIASES = {
    "DeviceOppLeadName": ("fullName", "name"),
    "DeviceOppPhoneNumber": ("mobile", "Mobile"),
    "DeviceOppOrgName": ("labName", "LabName", "organization"),
    "DeviceOppTimeOfDataEntry": ("time", "Time"),
    "DeviceOppProduct": ("product", "Product", "productModel"),
    "DeviceOppCompany": ("company", "Company", "manufacturer"),
}
UTM_FIELDS = {
    "campaign": "DeviceOppCampaign",
    "source": "DeviceOppSource",
    "medium": "DeviceOppMedium",
    "content": "DeviceOppContent",
    "term": "DeviceOppTerm",
}


class InvalidLead(ValueError):
    pass


def pick(values):
    present = [value for value in values if value is not None and value != ""]
    if any(not isinstance(value, str) for value in present):
        raise InvalidLead("Mapped values must be strings")
    if len(set(present)) > 1:
        raise InvalidLead("Conflicting source aliases")
    return present[0] if present else ""


def map_fields(payload):
    if not isinstance(payload, dict):
        raise InvalidLead("JSON object required")
    mapped = {
        key: pick([payload.get(alias) for alias in aliases])
        for key, aliases in FIELD_ALIASES.items()
    }
    utm = payload.get("utm", {})
    if not isinstance(utm, dict):
        raise InvalidLead("utm must be an object")
    for name, destination in UTM_FIELDS.items():
        mapped[destination] = pick(
            [utm.get("utm_" + name), payload.get("utm_" + name), payload.get(name)]
        )
    if not 3 <= len(mapped["DeviceOppLeadName"].strip()) <= 100:
        raise InvalidLead("Invalid full name")
    if not 2 <= len(mapped["DeviceOppOrgName"].strip()) <= 100:
        raise InvalidLead("Invalid laboratory name")
    if not re.fullmatch(r"09[0-9]{9}", mapped["DeviceOppPhoneNumber"]):
        raise InvalidLead("Invalid mobile")
    if any(len(value) > 2000 for value in mapped.values()):
        raise InvalidLead("Mapped value too long")
    if not isinstance(payload.get("honeypot", ""), str):
        raise InvalidLead("Invalid honeypot")
    return mapped


def canonical(payload):
    return json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def fingerprint(payload):
    return hashlib.sha256(canonical(payload).encode()).hexdigest()
