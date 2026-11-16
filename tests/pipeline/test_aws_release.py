import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('aws_release', Path(__file__).resolve().parents[2] / 'scripts/aws_release.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)
A, B = 'a' * 40, 'b' * 40


class FakeAws:
    def __init__(self):
        self.objects, self.writes, self.invalidations = {}, [], []
        self.fail_key = None

    def head(self, key):
        if key not in self.objects:
            raise FileNotFoundError(key)
        data, metadata = self.objects[key]
        return {'ContentLength': len(data), 'Metadata': metadata}

    def get(self, key):
        if key not in self.objects:
            raise FileNotFoundError(key)
        return self.objects[key][0]

    def put(self, key, data, cache, content_type, release, *, immutable=False):
        if key == self.fail_key:
            raise RuntimeError('Simulated interrupted upload')
        if immutable and key in self.objects:
            raise RuntimeError('Conditional write conflict')
        self.objects[key] = (data, {'sha256': r.digest(data), 'release-id': release})
        self.writes.append(key)

    def invalidate(self, distribution):
        self.invalidations.append(distribution)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.folder = Path(self.tmp.name)
        (self.folder / 'assets').mkdir()
        self.aws = FakeAws()

    def build(self, release=A, body='first'):
        (self.folder / 'index.html').write_text(f'<html><head></head><body>{body}</body></html>')
        (self.folder / 'assets/app-abcd.js').write_text('console.log("demo")')
        return r.prepare(self.folder, release)

    def test_stage_is_inert_until_promoted_and_rollback_restores_exact_entry(self):
        self.build()
        r.stage(self.aws, self.folder, A)
        self.assertNotIn('index.html', self.aws.objects)
        r.promote(self.aws, A, 'EDISTRIBUTION')
        first = self.aws.get('index.html')
        self.build(B, 'second')
        r.stage(self.aws, self.folder, B)
        self.assertEqual(first, self.aws.get('index.html'))
        self.assertEqual(A, r.promote(self.aws, B, 'EDISTRIBUTION'))
        self.assertNotEqual(first, self.aws.get('index.html'))
        self.assertEqual(B, r.promote(self.aws, A, 'EDISTRIBUTION'))
        self.assertEqual(first, self.aws.get('index.html'))

    def test_corrupt_artifact_rejected_before_any_write(self):
        self.build()
        (self.folder / 'assets/app-abcd.js').write_text('corrupt')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            r.stage(self.aws, self.folder, A)
        self.assertEqual([], self.aws.writes)

    def test_incomplete_release_cannot_be_promoted(self):
        self.build()
        self.aws.fail_key = f'releases/{A}/index.html'
        with self.assertRaises(RuntimeError):
            r.stage(self.aws, self.folder, A)
        self.assertNotIn(f'releases/{A}/release.json', self.aws.objects)
        with self.assertRaises(FileNotFoundError):
            r.promote(self.aws, A, 'EDISTRIBUTION')
        self.assertNotIn('index.html', self.aws.objects)

    def test_staging_same_release_is_idempotent_but_changed_release_is_rejected(self):
        self.build()
        r.stage(self.aws, self.folder, A)
        writes = len(self.aws.writes)
        r.stage(self.aws, self.folder, A)
        self.assertEqual(writes, len(self.aws.writes))
        self.build(A, 'different code with same release id')
        with self.assertRaisesRegex(ValueError, 'overwrite'):
            r.stage(self.aws, self.folder, A)

    def test_missing_old_dependency_blocks_rollback_before_entry_changes(self):
        self.build()
        r.stage(self.aws, self.folder, A)
        r.promote(self.aws, A, 'EDISTRIBUTION')
        del self.aws.objects['assets/app-abcd.js']
        writes = len(self.aws.writes)
        with self.assertRaises(FileNotFoundError):
            r.promote(self.aws, A, 'EDISTRIBUTION')
        self.assertEqual(writes, len(self.aws.writes))

    def test_malformed_manifest_and_traversal_are_rejected(self):
        manifest = self.build()
        for bad_path in ['../secret', 'assets/../../secret', '/index.html', 'assets//file', 'assets\\file']:
            bad = copy.deepcopy(manifest)
            bad['files'][bad_path] = next(iter(bad['files'].values()))
            with self.assertRaises(ValueError):
                r.validate_manifest(bad, A)
        for bad_sha in ['main', 'abc', '../' + A, A.upper(), '']:
            with self.assertRaises(ValueError):
                r.release_id(bad_sha)

    def test_corrupted_saved_index_blocks_promotion(self):
        self.build()
        r.stage(self.aws, self.folder, A)
        self.aws.objects[f'releases/{A}/index.html'] = (b'corrupt', {})
        with self.assertRaisesRegex(ValueError, 'checksum'):
            r.promote(self.aws, A, 'EDISTRIBUTION')
        self.assertNotIn('index.html', self.aws.objects)

    def test_failed_authorization_does_not_treat_object_as_absent(self):
        class Denied(FakeAws):
            def head(self, key):
                raise RuntimeError('AccessDenied')
        self.build()
        denied = Denied()
        with self.assertRaisesRegex(RuntimeError, 'AccessDenied'):
            r.stage(denied, self.folder, A)
        self.assertEqual([], denied.writes)


if __name__ == '__main__':
    unittest.main()
