#!/usr/bin/env python3
"""
Download the Tutor LMS docs bundle from Google Drive and extract it.

Usage:
  python3 scripts/download-tutor-docs.py <DRIVE_URL_OR_FILE_ID>

Then:
  python3 scripts/index-tutor-docs.py
  (re-indexes /home/z/my-project/repos/tutor-docs into a searchable catalog)

The docs bundle is ~408MB — it contains 296 markdown pages plus all
screenshot images referenced from the docs. Once extracted, the docs
browser in the webapp will show real screenshots alongside every screen.
"""
import os
import sys
import shutil
import subprocess
import zipfile
import tarfile
from pathlib import Path

GDOWN = "/home/z/.local/bin/gdown"
DEST_DIR = Path("/home/z/my-project/repos/tutor-docs")

def main():
    if len(sys.argv) < 2:
        print("ERROR: provide the Google Drive URL or file ID as argv[1]")
        print("Example:")
        print("  python3 scripts/download-tutor-docs.py https://drive.google.com/file/d/FILE_ID/view?usp=sharing")
        print("  python3 scripts/download-tutor-docs.py FILE_ID")
        sys.exit(1)

    arg = sys.argv[1].strip()
    # Normalize: if user passed just the file ID, build the URL
    if arg.startswith("http"):
        url = arg
    else:
        url = f"https://drive.google.com/uc?id={arg}"

    print(f"[1/4] Downloading from: {url}")
    print(f"      Destination: {DEST_DIR}")
    DEST_DIR.mkdir(parents=True, exist_ok=True)

    # Download into a temp file inside DEST_DIR
    tmp_file = DEST_DIR / "_downloaded_archive"
    cmd = [GDOWN, url, "-O", str(tmp_file), "--no-cookies"]
    print(f"      Running: {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=900)
    except subprocess.TimeoutExpired:
        print("ERROR: download timed out after 15 minutes")
        sys.exit(1)

    if result.returncode != 0:
        print(f"ERROR: gdown failed (exit {result.returncode})")
        print("STDOUT:", result.stdout[-2000:])
        print("STDERR:", result.stderr[-2000:])
        sys.exit(1)

    print(f"[2/4] Download complete. File size: {tmp_file.stat().st_size / (1024*1024):.1f} MB")

    # Detect file type
    print("[3/4] Extracting archive...")
    try:
        if zipfile.is_zipfile(tmp_file):
            print("      Detected ZIP archive")
            with zipfile.ZipFile(tmp_file) as zf:
                zf.extractall(DEST_DIR)
        elif tarfile.is_tarfile(tmp_file):
            print("      Detected TAR/GZ archive")
            with tarfile.open(tmp_file) as tf:
                tf.extractall(DEST_DIR)
        else:
            # Maybe it's a single file — rename it
            print("      Not a known archive — keeping as single file")
            # Try to detect extension from gdown metadata
            new_path = DEST_DIR / "tutor-docs-raw"
            tmp_file.rename(new_path)
            print(f"      Saved as: {new_path}")
    except Exception as e:
        print(f"ERROR during extraction: {e}")
        sys.exit(1)

    # Cleanup the temp archive (keep the extracted contents)
    if tmp_file.exists():
        tmp_file.unlink()

    print("[4/4] Extraction complete.")
    # Print summary
    total_files = sum(1 for _ in DEST_DIR.rglob("*") if _.is_file())
    md_files = sum(1 for _ in DEST_DIR.rglob("*.md"))
    img_files = sum(1 for _ in DEST_DIR.rglob("*") if _.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"})
    print(f"      Total files:  {total_files}")
    print(f"      Markdown:     {md_files}")
    print(f"      Images:       {img_files}")
    print()
    print("NEXT STEPS:")
    print("  1. Run: python3 scripts/index-tutor-docs.py")
    print("  2. Restart the dev server — the Tutor Docs sidebar item will populate automatically")

if __name__ == "__main__":
    main()
