"""Dump BUILD/id2slug.json (element id -> tool slug) for split-app.py.

Run before split-app.py: the per-tool split needs the map, and build.py's
main() only writes it when it builds. Importing build runs its module-level
code (registry load, workspace build, asset hashing) but not main().
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build  # noqa: E402

if __name__ == "__main__":
    n_ids, n_shared = build.write_id2slug()
    print("id2slug: %d unique ids, %d shared" % (n_ids, n_shared))
