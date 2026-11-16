from datetime import datetime, timezone
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('free_plan', Path(__file__).resolve().parents[2] / 'scripts/check_aws_free_plan.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class FreePlanTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 16, tzinfo=timezone.utc)
        self.plan = {
            'accountPlanType': 'FREE', 'accountPlanStatus': 'ACTIVE',
            'accountPlanRemainingCredits': {'amount': 10, 'unit': 'USD'},
            'accountPlanExpirationDate': '2026-12-01T00:00:00Z',
        }

    def test_confirmed_free_plan_passes(self):
        r.require_free_plan(self.plan, self.now)

    def test_paid_expired_exhausted_or_unconfirmed_plans_are_blocked(self):
        for change in [
            {'accountPlanType': 'PAID'}, {'accountPlanStatus': 'EXPIRED'},
            {'accountPlanRemainingCredits': {'amount': 0, 'unit': 'USD'}},
            {'accountPlanExpirationDate': '2026-11-01T00:00:00Z'},
            {'accountPlanExpirationDate': None},
        ]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                r.require_free_plan({**self.plan, **change}, self.now)
        with self.assertRaises(ValueError):
            r.require_free_plan({}, self.now)


if __name__ == '__main__':
    unittest.main()
