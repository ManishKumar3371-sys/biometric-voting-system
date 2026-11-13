
from urllib.parse import urlparse
import ipaddress

def analyze_url(url):
    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    warnings = []
    try:
        ipaddress.ip_address(parsed.hostname)
        warnings.append("URL uses a direct IP address")
    except ValueError:
        pass    

    if parsed.scheme != "https":
        warnings.append("HTTPS is not being used")

    if "@" in url:
        warnings.append("URL contains @ symbol")
        

    if domain.startswith("xn--") or ".xn--" in domain:
        warnings.append("Domain uses internationalized encoding")

    suspicious_words = ["login", "verify", "free", "claim", "secure"]
    if any(word in domain for word in suspicious_words):
        warnings.append("Domain contains a potentially deceptive keyword")

    print("\nURL:", url)
    print("Domain:", domain)

    if warnings:
        print("Warnings:")
        for warning in warnings:
            print("-", warning)
    else:
        print("No basic warning signs detected.")

test_url = input("Enter a URL to analyze: ")
analyze_url(test_url)

