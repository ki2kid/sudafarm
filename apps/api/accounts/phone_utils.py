def normalize_phone(phone: str) -> str:
    """
    Normalize a Sudanese phone number to the canonical +249XXXXXXXXX format.

    Accepted input forms (all become the same stored value):
      +249912345678   →  +249912345678
      0912345678      →  +249912345678
      249912345678    →  +249912345678
      00249912345678  →  +249912345678

    Non-Sudanese numbers or unrecognised formats are returned stripped but
    otherwise unchanged, so the unique-constraint error from the DB surfaces
    naturally.
    """
    phone = phone.strip()
    if phone.startswith("+249"):
        return phone
    if phone.startswith("00249"):
        return "+" + phone[2:]
    if phone.startswith("249") and len(phone) >= 12:
        return "+" + phone
    if phone.startswith("0") and len(phone) >= 9:
        return "+249" + phone[1:]
    return phone
