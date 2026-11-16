"""Read-only release checks against the real CloudFront URL (no AWS credentials)."""
import argparse
import json
import re
from urllib.request import Request, urlopen
from urllib.parse import urlparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--origin', required=True)
parser.add_argument('--release', required=True)
parser.add_argument('--candidate', action='store_true')
args = parser.parse_args()
if not re.fullmatch(r'[0-9a-f]{40}', args.release):
    raise SystemExit('Expected full release SHA')
parsed = urlparse(args.origin)
if parsed.scheme != 'https' or not parsed.hostname or parsed.path not in ['', '/']:
    raise SystemExit('Expected an HTTPS origin without a path')
origin = args.origin.rstrip('/')
path = f'/releases/{args.release}/index.html' if args.candidate else '/'
with urlopen(Request(origin + path, headers={'Cache-Control': 'no-cache'}), timeout=30) as response:
    html = response.read().decode()
    headers = response.headers
    assert response.status == 200
    assert f'name="finance-release" content="{args.release}"' in html, 'Wrong release is being served'
    assert "frame-ancestors 'none'" in headers.get('Content-Security-Policy', ''), 'Missing CSP'
    assert headers.get('X-Content-Type-Options') == 'nosniff'
    assert 'no-cache' in headers.get('Cache-Control', ''), 'Entry must revalidate'
assets = re.findall(r'(?:src|href)="(/assets/[^"?#]+)"', html)
assert assets and any(a.endswith('.js') for a in assets) and any(a.endswith('.css') for a in assets)
for asset in assets:
    with urlopen(origin + asset, timeout=30) as response:
        assert response.status == 200
        assert 'immutable' in response.headers.get('Cache-Control', ''), 'Asset must be immutable'
        assert response.read(), 'Empty asset'
# A missing asset must remain an error, not an HTML fallback returning success.
from urllib.error import HTTPError
try:
    urlopen(origin + '/assets/missing-release-check.js', timeout=30)
except HTTPError as error:
    assert error.code in [403, 404]
else:
    raise AssertionError('Missing asset was reported as success')
print(json.dumps({'status':'passed', 'origin':origin, 'release':args.release, 'candidate':args.candidate, 'assets':len(assets)}))
