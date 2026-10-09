#!/usr/bin/env python3
"""Regression guard for public claims on mendgroup.co.za.

Usage: check_site.py [BASE_URL]   (default http://localhost:8000)

Every check here guards a claim MEND GROUP removed because it could not
back it. A failure means a removed claim came back, or a page broke.

Checks K and L were cut before the MEN-33 CEO rulings landed. K now fires only
on a caption sitting next to a figure, because "Ask us / per night" carries no
figure to caption. L no longer lists "Roof of Africa", "newly built",
"rider-friendly stop:" or "Chalet": the provenance register sources all four
first-party, and guarding them forced the pages to delete true facts.
Stdlib only: no dependencies, no build step.
"""
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")

# Read the preview list off disk so taking one page down is `git rm -r
# previews/<slug>` and nothing else. Check P below is what still catches an
# accidental mass deletion.
PREVIEW_DIR = Path(__file__).resolve().parents[2] / "previews"
PREVIEWS = sorted(d.name for d in PREVIEW_DIR.iterdir() if d.is_dir())
HOSPITALITY = [p for p in PREVIEWS if p != "lesotho-fap"]
NOTE = "Built by MEND GROUP as a demonstration. Not commissioned by this business."

failures = []


def fetch(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "mend-site-check"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  -- ' + detail if detail and not ok else ''}")
    if not ok:
        failures.append(name)


def absent(name, text, pattern, flags=re.I):
    hits = re.findall(pattern, text, flags)
    check(name, not hits, f"found {len(hits)}: {sorted(set(hits))[:5]}")


check("P  preview count floor", len(PREVIEWS) >= 8, f"{len(PREVIEWS)} dirs in previews/")

status, home = fetch("/")
check("homepage 200", status == 200, str(status))
_, chase = fetch("/document-chase/")
_, robots = fetch("/robots.txt")
_, sitemap = fetch("/sitemap.xml")

# Homepage and document-chase
absent("A  no withdrawn price / lead time", chase, r"R5,000|7 to 10 days")
absent("B  no free quote / 24h promise", home, r"Free Quote|24hr|within 24 hours")
absent("C  no undeliverable services", home,
       r"Satellite|VoIP|tax consultancy|natural sciences|industrial equipment|telecommunication")
absent("D  no team/bench claims", home, r"specialists per project|promote from within")
absent("E  no published TIN", home, r"\b\d{9}-\d\b|taxID")
absent("G  no SA presence / regional claims", home,
       r"Johannesburg|Gauteng|SACU|dual presence|regional coverage|regional fluency|industrial systems|hero-stats")
pillars = re.findall(r'pillar-num">(\d+)', home)
check("G  mission pillars numbered 01..n", pillars == [f"{i:02d}" for i in range(1, len(pillars) + 1)], str(pillars))
check("F  no public link to a preview",
      not [h for h in re.findall(r'href="([^"]*)"', home) if "previews/" in h])
check("F2 proof sentence present", "ask us to show you one" in home)

m = re.search(r'application/ld\+json"?\s*>(.*?)</script>', home, re.S)
try:
    ld = json.loads(m.group(1)) if m else None
    check("G3 JSON-LD parses", ld is not None, "no ld+json block")
    if ld:
        check("G3 areaServed is Lesotho only", ld.get("areaServed") == ["Lesotho"], str(ld.get("areaServed")))
        check("G3 serviceType has no telecoms",
              not any("telecom" in s.lower() for s in ld.get("serviceType", [])))
except ValueError as e:
    check("G3 JSON-LD parses", False, str(e))

# Crawl rules: noindex on previews, robots.txt must not Disallow (see PR #1)
check("H2 robots.txt has no Disallow", "disallow" not in robots.lower())
check("H2 sitemap lists no previews", "previews" not in sitemap)

for p in PREVIEWS:
    status, page = fetch(f"/previews/{p}/")
    check(f"I  {p} reachable", status == 200, str(status))
    check(f"H  {p} noindex", bool(re.search(r'name="robots"[^>]*noindex', page, re.I)))
    if p in HOSPITALITY:
        absent(f"J  {p} no invented promises", page,
               r"best price guaranteed|better price|availability the same day")
        absent(f"K  {p} every rate captioned", page, r"\d<small>per (?:night|person)</small>", 0)
        absent(f"L  {p} no unsourced claims", page,
               r"only lake view|no one else in Maseru|Seventeen years|over 17 years|Seventeen rooms|"
               r"500 m from|2\.6 km from|since 1975|Est\. 1975|September 2019|A3 Mountain Road|"
               r"nine fully furnished|3\.4 km|15 km from the airport|up to 10 guests|famous full breakfast|"
               r"conference room with projector|Thaba-Bosiu road|Five en-suite|Free private parking|"
               r"Hillsview|Pioneer Mall|Fitness centre|border transfers|Camping|from R250|10 / 10|"
               r"07:00|car hire|indicative, confirm|garden-view|Basotho \+ international|"
               r"traditional Basotho and international")
        check(f"O  {p} not-commissioned line", page.count(NOTE) == 1)
        check(f"O  {p} preview bar kept", page.count("FREE PREVIEW built for") == 1)
    else:
        check(f"O  {p} has no not-commissioned line", "Not commissioned" not in page)
        absent(f"M  {p} no phase numbering", page, r"Phase", 0)
        check(f"M  {p} data honesty intact", "Data honesty" in page and "undercount" in page.lower())

print()
if failures:
    print(f"{len(failures)} check(s) failed")
    sys.exit(1)
print("all checks passed")
