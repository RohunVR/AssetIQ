from datetime import datetime, timezone

def utc_now() -> datetime:
    """Return current UTC datetime as a naive datetime object for SQLite compatibility"""
    return datetime.now(timezone.utc).replace(tzinfo=None)
