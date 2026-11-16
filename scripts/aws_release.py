"""Stage verified static releases, then promote one HTML entry point atomically.

Uses AWS CLI's credential chain; no credentials are written into release artifacts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tempfile

IMMUTABLE = "public,max-age=31536000,immutable"
ENTRY_CACHE = "no-cache,max-age=0,must-revalidate"


def release_id(value: str) -> str:
    if not re.fullmatch(r"[0-9a-f]{40}", value):
        raise ValueError("Release must be a full lowercase 40-character Git commit SHA.")
    return value


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def encode_manifest(manifest: dict) -> bytes:
    return (json.dumps(manifest, sort_keys=True, indent=2) + "\n").encode()


def validate_manifest(manifest: dict, release: str) -> None:
    if manifest.get("schema") != 1 or manifest.get("release") != release_id(release):
        raise ValueError("Release manifest identity/version mismatch.")
    files = manifest.get("files", {})
    if not isinstance(files, dict) or "index.html" not in files or len(files) < 2:
        raise ValueError("Release must include index.html and its assets.")
    for name, info in files.items():
        path = PurePosixPath(name)
        if (name != "index.html" and not name.startswith("assets/")) or path.is_absolute() or ".." in path.parts or str(path) != name or "\\" in name:
            raise ValueError(f"Unexpected release path: {name}")
        if not isinstance(info, dict) or not re.fullmatch(r"[0-9a-f]{64}", info.get("sha256", "")) or not isinstance(info.get("bytes"), int) or info["bytes"] <= 0:
            raise ValueError(f"Invalid digest/size for {name}")


def prepare(folder: Path, release: str) -> dict:
    release_id(release)
    index = folder / "index.html"
    html = index.read_text()
    html = re.sub(r'\s*<meta name="finance-release" content="[0-9a-f]{40}"\s*/?>', "", html)
    if "</head>" not in html:
        raise ValueError("Build has no HTML head.")
    index.write_text(html.replace("</head>", f'<meta name="finance-release" content="{release}" />\n  </head>'))
    files = {}
    for path in sorted(folder.rglob("*")):
        if path.is_symlink():
            raise ValueError("Release files cannot be symbolic links.")
        if not path.is_file() or path.name == "release.json":
            continue
        data = path.read_bytes()
        files[path.relative_to(folder).as_posix()] = {"sha256": digest(data), "bytes": len(data)}
    manifest = {"schema": 1, "release": release, "files": files}
    validate_manifest(manifest, release)
    (folder / "release.json").write_bytes(encode_manifest(manifest))
    return manifest


class AwsCli:
    def __init__(self, bucket: str):
        if not re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", bucket):
            raise ValueError("Set AWS_SITE_BUCKET to the stack's bucket name.")
        self.bucket = bucket

    def call(self, service: str, operation: str, *args: str) -> dict:
        result = subprocess.run(["aws", service, operation, *args, "--output", "json", "--no-cli-pager"], capture_output=True, text=True)
        if result.returncode:
            # Missing keys are expected on first publication. Permission and
            # connection errors must fail closed, never masquerade as absence.
            if "(NoSuchKey)" in result.stderr or "(404)" in result.stderr:
                raise FileNotFoundError(operation)
            raise RuntimeError(f"AWS {service} {operation} failed: {result.stderr.strip()}")
        return json.loads(result.stdout) if result.stdout.strip() else {}

    def get(self, key: str) -> bytes:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "object"
            self.call("s3api", "get-object", "--bucket", self.bucket, "--key", key, str(path))
            return path.read_bytes()

    def head(self, key: str) -> dict:
        return self.call("s3api", "head-object", "--bucket", self.bucket, "--key", key)

    def put(self, key: str, data: bytes, cache: str, content_type: str, release: str, *, immutable: bool = False) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "object"
            path.write_bytes(data)
            args = ["--bucket", self.bucket, "--key", key, "--body", str(path), "--cache-control", cache,
                    "--content-type", content_type, "--metadata", json.dumps({"sha256": digest(data), "release-id": release})]
            if immutable:
                args += ["--if-none-match", "*"]
            self.call("s3api", "put-object", *args)

    def invalidate(self, distribution: str) -> None:
        if not re.fullmatch(r"[A-Z0-9]+", distribution):
            raise ValueError("Set AWS_DISTRIBUTION_ID to the stack's distribution ID.")
        result = self.call("cloudfront", "create-invalidation", "--distribution-id", distribution, "--paths", "/", "/index.html")
        print(f"Invalidation: {result['Invalidation']['Id']}")


def matches(head: dict, info: dict) -> bool:
    return head.get("ContentLength") == info["bytes"] and head.get("Metadata", {}).get("sha256") == info["sha256"]


def put_immutable(aws, key: str, data: bytes, cache: str, content_type: str, release: str) -> None:
    try:
        head = aws.head(key)
    except FileNotFoundError:
        aws.put(key, data, cache, content_type, release, immutable=True)
        return
    if not matches(head, {"bytes": len(data), "sha256": digest(data)}):
        raise ValueError(f"Refusing to overwrite an existing immutable object: {key}")


def stage(aws, folder: Path, release: str) -> None:
    folder = folder.resolve()
    release_id(release)
    manifest = json.loads((folder / "release.json").read_bytes())
    validate_manifest(manifest, release)
    # Validate the ENTIRE artifact before any network write.
    for name, info in manifest["files"].items():
        path = folder / name
        if any(p.is_symlink() for p in [path, *path.parents]) or not path.is_file():
            raise ValueError(f"Missing or symbolic release file: {name}")
        data = path.read_bytes()
        if not matches({"ContentLength": len(data), "Metadata": {"sha256": digest(data)}}, info):
            raise ValueError(f"Artifact checksum mismatch: {name}")
    index = (folder / "index.html").read_bytes()
    if f'name="finance-release" content="{release}"'.encode() not in index:
        raise ValueError("Entry page does not identify this release.")
    for name in manifest["files"]:
        data = (folder / name).read_bytes()
        content_type = "text/html; charset=utf-8" if name == "index.html" else mimetypes.guess_type(name)[0] or "application/octet-stream"
        cache = ENTRY_CACHE if name == "index.html" else IMMUTABLE
        put_immutable(aws, f"releases/{release}/{name}", data, cache, content_type, release)
        if name.startswith("assets/"):
            # Content-hashed assets are shared and never pruned during deployment.
            # Existing tabs and old release snapshots keep their dependencies.
            put_immutable(aws, name, data, IMMUTABLE, content_type, release)
    # Completion marker is written last; incomplete uploads cannot be promoted.
    put_immutable(aws, f"releases/{release}/release.json", encode_manifest(manifest), ENTRY_CACHE, "application/json", release)
    print(f"Staged {release} ({len(manifest['files'])} files); live entry unchanged.")


def promote(aws, release: str, distribution: str) -> str | None:
    release_id(release)
    if not re.fullmatch(r"[A-Z0-9]+", distribution):
        raise ValueError("Invalid CloudFront distribution ID.")
    manifest = json.loads(aws.get(f"releases/{release}/release.json"))
    validate_manifest(manifest, release)
    data = aws.get(f"releases/{release}/index.html")
    if digest(data) != manifest["files"]["index.html"]["sha256"] or f'name="finance-release" content="{release}"'.encode() not in data:
        raise ValueError("Saved release entry checksum/identity mismatch.")
    for name, info in manifest["files"].items():
        if name.startswith("assets/") and not matches(aws.head(name), info):
            raise ValueError(f"Saved release dependency missing/changed: {name}")
    try:
        previous = aws.head("index.html").get("Metadata", {}).get("release-id")
    except FileNotFoundError:
        previous = None
    aws.put("index.html", data, ENTRY_CACHE, "text/html; charset=utf-8", release)
    aws.invalidate(distribution)
    print(f"Promoted {release}; previous: {previous or 'none (first release)'}. Browser-local transactions are unchanged.")
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a") as stream:
            stream.write(f"previous_release={release_id(previous) if previous else ''}\n")
    return previous


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["prepare", "stage", "promote"])
    parser.add_argument("--release", required=True, type=release_id)
    parser.add_argument("--dist", type=Path, default=Path("dist"))
    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args.dist, args.release)
        print(f"Prepared {args.release}")
    else:
        aws = AwsCli(os.environ.get("AWS_SITE_BUCKET", ""))
        if args.command == "stage":
            stage(aws, args.dist, args.release)
        else:
            promote(aws, args.release, os.environ.get("AWS_DISTRIBUTION_ID", ""))


if __name__ == "__main__":
    main()
