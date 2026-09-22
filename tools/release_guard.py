#!/usr/bin/env python3
"""ZERAPHIA release guard.
Run from anywhere inside the project before publishing.
Exit code 0 = safe to publish; non-zero = stop release.
"""
from __future__ import annotations
from pathlib import Path
import json, re, shutil, subprocess, sys

HERE = Path(__file__).resolve()
ROOT = HERE.parents[1]
errors: list[str] = []
warnings: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception as exc:
        fail(f"cannot read {path.relative_to(ROOT)}: {exc}")
        return ""

# 1) version.json is the single release identity / commit marker.
version_path = ROOT / "version.json"
try:
    version = json.loads(version_path.read_text(encoding="utf-8"))
except Exception as exc:
    version = {}
    fail(f"version.json invalid: {exc}")

build = version.get("build")
if not isinstance(build, int) or build <= 0:
    fail("version.json build must be a positive integer")
if version.get("release_protocol") != 2:
    fail("version.json release_protocol must be 2")
if version.get("commit_marker") is not True:
    fail("version.json commit_marker must be true")

index = read(ROOT / "index.html")
sw = read(ROOT / "sw.js")

# 2) Never duplicate the current release/build number in runtime code.
for token in ("sasaphia-build", "FALLBACK_BUILD", "SW_BUILD"):
    if token in index or token in sw:
        fail(f"legacy duplicated build source still present: {token}")

if re.search(r"searchParams\.set\(\s*['\"]build['\"]", index):
    fail("index.html still writes ?build= into the URL")
if "CHECK_INTERVAL_MS" in index or re.search(r"setInterval\s*\([^)]*check.*Build", index, re.S | re.I):
    fail("periodic release check/reload logic is still present")

# 3) Service worker must be build-independent and network-first for JS/CSS.
if "zeraphia-runtime-v1" not in sw:
    fail("sw.js missing stable runtime cache")
if "cache:'no-store'" not in sw.replace(" ", ""):
    # tolerant secondary check below, because formatting may vary
    if "cache: 'no-store'" not in sw and 'cache:"no-store"' not in sw:
        fail("sw.js is not forcing network fetches for fresh code")
if "location.reload" in sw or "location.replace" in sw:
    fail("service worker must never reload the page")

# 4) Known roster regression guard. Only applies when the full gameplay file is present.
characters = ROOT / "js" / "shooting_characters.js"
if characters.exists():
    text = read(characters)
    required = {
        "GISELLE: 35": "ジゼル ID35",
        "NINA: 36": "ニーナ ID36",
        "TOYFEL: 37": "トイフェル ID37",
        '"name": "ジゼル"': "ジゼル master",
        '"name": "ニーナ"': "ニーナ master",
        '"name": "トイフェル"': "トイフェル master",
    }
    for needle, label in required.items():
        if needle not in text:
            fail(f"character roster regression: missing {label}")

# 5) Syntax-check JS when Node is available.
node = shutil.which("node")
if node:
    js_files = [ROOT / "sw.js"]
    js_dir = ROOT / "js"
    if js_dir.exists():
        js_files.extend(sorted(js_dir.glob("*.js")))
    for path in js_files:
        proc = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
        if proc.returncode != 0:
            fail(f"JS syntax error in {path.relative_to(ROOT)}: {proc.stderr.strip()}")
else:
    warn("Node.js not found; JS syntax check skipped")

print(f"ZERAPHIA release guard — build {build if build else '?'}")
for msg in warnings:
    print(f"WARN: {msg}")
if errors:
    for msg in errors:
        print(f"ERROR: {msg}")
    print(f"BLOCKED: {len(errors)} release-safety error(s)")
    sys.exit(1)
print("PASS: release safety checks completed")
