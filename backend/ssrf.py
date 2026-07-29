"""SSRF protection for the /api/scrape endpoint.

Ported unchanged from the single-tenant version's server.py (including the
DNS-rebinding fix: the actual HTTP request connects to the IP address that
was already validated, instead of letting the HTTP client re-resolve the
hostname a second time, which would let a malicious DNS server "rebind" the
hostname to an internal address between the check and the real request).
"""

import http.client
import ipaddress
import socket
import ssl
import urllib.parse
import urllib.request


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def is_safe_public_url(url: str):
    """Returns (is_safe, error_message_or_None, pinned_ip_or_None)."""
    try:
        parsed = urllib.parse.urlparse(url)
    except ValueError:
        return False, "Ungültige URL.", None

    if parsed.scheme not in ("http", "https"):
        return False, "Nur http:// und https:// URLs sind erlaubt.", None

    hostname = parsed.hostname
    if not hostname:
        return False, "Ungültige URL.", None

    if hostname.lower() in ("localhost",) or hostname.lower().endswith(".local"):
        return False, "Diese Adresse ist nicht erlaubt.", None

    try:
        addr_infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False, "Host konnte nicht aufgelöst werden.", None

    pinned_ip = None
    for info in addr_infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if _is_blocked_ip(ip):
            return False, "Diese Adresse ist nicht erlaubt.", None
        if pinned_ip is None:
            pinned_ip = ip_str

    if pinned_ip is None:
        return False, "Host konnte nicht aufgelöst werden.", None

    return True, None, pinned_ip


def make_pinned_opener(pinned_ip: str) -> urllib.request.OpenerDirector:
    class PinnedHTTPConnection(http.client.HTTPConnection):
        def connect(self):
            self.sock = socket.create_connection((pinned_ip, self.port), self.timeout)

    class PinnedHTTPSConnection(http.client.HTTPSConnection):
        def connect(self):
            sock = socket.create_connection((pinned_ip, self.port), self.timeout)
            context = self._context or ssl.create_default_context()
            self.sock = context.wrap_socket(sock, server_hostname=self.host)

    class PinnedHTTPHandler(urllib.request.HTTPHandler):
        def http_open(self, req):
            return self.do_open(PinnedHTTPConnection, req)

    class PinnedHTTPSHandler(urllib.request.HTTPSHandler):
        def https_open(self, req):
            return self.do_open(PinnedHTTPSConnection, req)

    return urllib.request.build_opener(PinnedHTTPHandler, PinnedHTTPSHandler)
