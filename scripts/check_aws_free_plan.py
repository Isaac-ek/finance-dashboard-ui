"""Fail closed unless AWS confirms an active Free account plan with credit.

Free-tier usage allowances on a paid/legacy account are not spending caps.
This check does not enable or upgrade any account plan.
"""
from datetime import datetime, timezone
import json
import subprocess


def require_free_plan(plan, now=None):
    now = now or datetime.now(timezone.utc)
    expiry = plan.get('accountPlanExpirationDate')
    if not expiry:
        raise ValueError('AWS did not confirm a free-plan expiry date.')
    expires = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
    if (plan.get('accountPlanType') != 'FREE' or plan.get('accountPlanStatus') != 'ACTIVE'
        or plan.get('accountPlanRemainingCredits', {}).get('amount', 0) <= 0 or expires <= now):
        raise ValueError('AWS has not confirmed an active Free account plan with remaining credit. Cloud deployment is blocked under the free-only requirement.')


if __name__ == '__main__':
    result = subprocess.run(['aws', 'freetier', 'get-account-plan-state', '--region', 'us-east-1', '--output', 'json', '--no-cli-pager'], capture_output=True, text=True)
    if result.returncode:
        raise SystemExit('Cannot verify an active AWS Free account plan. No cloud writes are allowed. ' + result.stderr.strip())
    require_free_plan(json.loads(result.stdout))
    print('AWS confirms an active Free account plan with remaining credit. No plan changes were made.')
