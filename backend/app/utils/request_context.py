import ipaddress

from fastapi import Request


def _is_valid_ip(ip: str) -> bool:
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first_ip = forwarded.split(",")[0].strip()
        if _is_valid_ip(first_ip):
            return first_ip
    host = request.client.host if request.client else None
    return host if host and _is_valid_ip(host) else "unknown"
