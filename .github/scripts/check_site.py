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
    except (urllib.error.URLError, OSError) as e:
        # Unreachable, refused, timed out: report it as a failed check, not a traceback.
        return 0, f"<unreachable: {e}>"


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
# A missing page returns "", and every absent() check on "" passes, so a page that
# 404s would otherwise satisfy all of its claim checks. Require each one to load.
status, chase = fetch("/document-chase/")
check("document-chase 200", status == 200, str(status))
status, robots = fetch("/robots.txt")
check("robots.txt 200", status == 200, str(status))
status, sitemap = fetch("/sitemap.xml")
check("sitemap.xml 200", status == 200, str(status))
PUBLIC = {"homepage": home, "document-chase": chase}

# Homepage and document-chase
absent("A  no withdrawn price / lead time", chase, r"R5,000|7 to 10 days")
for page_name, text in PUBLIC.items():
    absent(f"B  {page_name}: no free quote / 24h promise", text,
           r"Free Quote|24hr|within 24 hours")
absent("C  no undeliverable services", home,
       r"Satellite|VoIP|tax consultancy|natural sciences|industrial equipment|telecommunication")
absent("D  no team/bench claims", home, r"specialists per project|promote from within")
absent("E  no published TIN", home, r"\b\d{9}-\d\b|taxID")
for page_name, text in PUBLIC.items():
    absent(f"G  {page_name}: no SA presence / regional claims", text,
           r"Johannesburg|Gauteng|SACU|dual presence|regional coverage|regional fluency|"
           r"industrial systems|hero-stats")
pillars = re.findall(r'pillar-num">(\d+)', home)
check("G  mission pillars numbered 01..n", pillars == [f"{i:02d}" for i in range(1, len(pillars) + 1)], str(pillars))
for page_name, text in PUBLIC.items():
    check(f"F  {page_name}: no public link to a preview",
          not [h for h in re.findall(r"""href=["']([^"']*)["']""", text) if "previews/" in h])
check("F2 proof sentence present", "ask us to show you one" in home)
check("F3 no link to the site's own repo (internal notes live there)",
      "github.com/Jakote/mend-group-website" not in home)

def _as_list(v):
    return v if isinstance(v, list) else ([] if v is None else [v])


def _place_name(v):
    return v.get("name") if isinstance(v, dict) else v


nodes = []
m = re.search(r'application/ld\+json"?\s*>(.*?)</script>', home, re.S)
try:
    ld = json.loads(m.group(1)) if m else None
    check("G3 JSON-LD parses", ld is not None, "no ld+json block")
    # Accept a single object, a top-level array, or an @graph, and find the node that
    # carries areaServed, instead of crashing or passing on an unexpected shape.
    nodes = _as_list(ld.get("@graph", ld)) if isinstance(ld, dict) else _as_list(ld)
    org = next((n for n in nodes if isinstance(n, dict) and "areaServed" in n), None)
    if ld is not None:
        check("G3 JSON-LD has an areaServed node", org is not None)
    if org:
        areas = [_place_name(a) for a in _as_list(org.get("areaServed"))]
        check("G3 areaServed is Lesotho only", areas == ["Lesotho"], str(areas))
        services = [str(s) for s in _as_list(org.get("serviceType"))]
        check("G3 serviceType has no telecoms",
              not any("telecom" in s.lower() for s in services), str(services))
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


# ---------------------------------------------------------------------------
# Demonstration prototypes under /demo/<slug>/.
# These are evaluator-facing demos, NOT hospitality previews: they do not live in
# previews/, so checks H and I to O above never see them. Without the block below a
# demo could lose its noindex or its "not a UNICEF product" line and this script would
# still print "all checks passed". X is the check that matters most: a parenting demo
# that stops announcing itself as a demo starts looking like a service for at-risk
# families, which is exactly what it must never look like.
DEMO_DIR = Path(__file__).resolve().parents[2] / "demo"
DEMOS = sorted(d.name for d in DEMO_DIR.iterdir() if d.is_dir()) if DEMO_DIR.is_dir() else []
DEMO_NOTE = "not a UNICEF product"

check("Q  demo count floor", len(DEMOS) >= 1, f"{len(DEMOS)} dirs in demo/")

# Fetched here rather than reusing earlier locals: main and the check-site-robustness
# branch name these differently, and this block has to pass on either.
_, _sitemap = fetch("/sitemap.xml")
check("Q2 sitemap lists no demos", "/demo/" not in _sitemap)
for _name, _path in (("homepage", "/"), ("document-chase", "/document-chase/")):
    _, _text = fetch(_path)
    check(f"Q3 {_name}: no public link to a demo",
          not [h for h in re.findall(r"""href=["']([^"']*)["']""", _text)
               if h.startswith("/demo/") or h.startswith("demo/")])

for d in DEMOS:
    for leaf in ("", "content.html"):
        status, page = fetch(f"/demo/{d}/{leaf}")
        label = f"{d}/{leaf or 'index'}"
        check(f"R  {label} reachable", status == 200, str(status))
        check(f"S  {label} noindex", bool(re.search(r'name="robots"[^>]*noindex', page, re.I)))
        check(f"X  {label} says not a UNICEF product", DEMO_NOTE in page)
        check(f"Y  {label} entry gate present", 'id="demo-gate"' in page)
        check(f"Z  {label} gate carries 112 and 116", "112" in page and "116" in page)
        # The lookbehind matters: the gate's own text says "not endorsed by any ministry
        # or agency", and a bare /endorsed by/ would flag that denial as a claim.
        absent(f"Z2 {label} no borrowed authority", page,
               r"(?<!not )endorsed by|in partnership with|on behalf of UNICEF|"
               r"official[^.]{0,20}UNICEF")

# ---------------------------------------------------------------------------
# Evaluator proof (20 Oct 2026). A tender or funding evaluator must find, in
# under a minute, the registration facts, work they can open, and a one-page
# capability statement that says the same thing as the page.
check("T  homepage leads with the work", "screenshots of the real screens" in home)
check("T  homepage links the capability statement", 'href="capability-statement.pdf"' in home)
req = urllib.request.Request(BASE + "/capability-statement.pdf", headers={"User-Agent": "mend-site-check"})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        pdf_ok = r.status == 200 and r.read(5) == b"%PDF-"
except (urllib.error.URLError, OSError):
    pdf_ok = False
check("T  capability-statement.pdf is served and is a PDF", pdf_ok)

STATEMENT = Path(__file__).resolve().parents[1] / "capability" / "statement.html"
statement = STATEMENT.read_text(encoding="utf-8") if STATEMENT.is_file() else ""
check("U  statement source present", bool(statement))
# The same facts, word for word, on the page and in the PDF source. If one is
# edited, rebuild the PDF (node .github/scripts/build_capability.cjs) and this passes.
FACTS = ["MEND GROUP (PTY) LTD", "96070", "13 June 2025", "Companies Act 2011",
         "Sekamaneng, Maseru", "P.O. Box 173, Maseru, 100", "info@mendgroup.co.za",
         "+27 83 209 2120", "jakote.github.io/tm-stone-preview", "private preview", "demo data",
         "platforms.mendgroup.co.za", "seven years", "No users yet"]
for fact in FACTS:
    check(f"U  fact on both page and statement: {fact}",
          fact.lower() in home.lower() and fact.lower() in statement.lower())
absent("U  statement: no published TIN", statement, r"\b\d{9}-\d\b|\bTIN\b", 0)
absent("U  statement/homepage: no withdrawn costing claim", home + statement,
       r"7[01]\s?%|overhead understated|understates overhead")
# MEND's own collected revenue is R5,000; R35,200 was paid to the founder personally in
# 2021, before MEND existed. No revenue figure is published at all.
absent("U  no revenue figure", home + statement, r"R\s?40[ ,]?200|R\s?35[ ,]?200|revenue of|in revenue")
# Philalink is described, not linked: that domain carries marketing claims MEND cannot back.
check("U  no link to the Machenic marketing site", "velangaye" not in home and "velangaye" not in statement)
absent("U  no blanket fixed-price or RLS-everywhere claims", home + statement,
       r"fixed price, agreed before|row-level security on every|automated checks on every change")
absent("U  no unbacked counts or awards", home + statement,
       r"\b\d+\+? (?:clients|projects delivered|happy customers|team members|employees)\b|award-winning|certified")

orgs = [n for n in nodes if isinstance(n, dict) and "Organization" in str(n.get("@type"))]
check("V  JSON-LD Organization present", bool(orgs))
if orgs:
    ident = orgs[0].get("identifier") or {}
    check("V  JSON-LD carries Reg No. 96070", isinstance(ident, dict) and ident.get("value") == "96070", str(ident))
    check("V  JSON-LD foundingDate 2025-06-13", orgs[0].get("foundingDate") == "2025-06-13")
check("V  canonical and og:image set",
      'rel="canonical"' in home and 'property="og:image"' in home)

# ---------------------------------------------------------------------------
# Case studies (21 Oct 2026). Each client page must load, say its screenshots use
# demo data, say the client agreed to be named, and carry no cost figure, margin,
# MEND price or the withdrawn costing claim. Every screenshot must exist, be lazy,
# and have its size set so the page does not jump while it loads.
WORK = {"tm-stone": "Named with the client's permission",
        "philalink": "Named with the client's permission",
        "mend-platforms": "No users yet"}
for slug, must in WORK.items():
    status, page = fetch(f"/work/{slug}/")
    check(f"W  /work/{slug}/ 200", status == 200, str(status))
    check(f"W  {slug}: says '{must}'", must in page)
    check(f"W  {slug}: homepage links it", f'href="work/{slug}/"' in home)
    if slug != "mend-platforms":
        check(f"W  {slug}: screenshots disclosed as demo data", "demo data" in page)
    absent(f"W  {slug}: no costing claim, margin or MEND price", page,
           r"7[01]\s?%|overhead understated|understates overhead|\bmargin\b|mark-?up|\bR\s?\d[\d,]{2,}")
    check(f"W  {slug}: no link to the Machenic marketing site", "velangaye" not in page)
    imgs = re.findall(r"<img [^>]*>", page)
    for tag in imgs:
        src = re.search(r'src="([^"]+)"', tag).group(1)
        if "/assets/work/" not in src:
            continue
        s_img, _ = fetch(src)
        check(f"W  {slug}: {src.rsplit('/', 1)[-1]} served", s_img == 200, str(s_img))
        check(f"W  {slug}: {src.rsplit('/', 1)[-1]} lazy, sized, has alt",
              'loading="lazy"' in tag and 'width="' in tag and 'height="' in tag and re.search(r'alt="[^"]+"', tag))
absent("W  homepage: no MEND price or margin", home, r"\bmargin\b|\bR\s?\d[\d,]{2,}")

print()
if failures:
    print(f"{len(failures)} check(s) failed")
    sys.exit(1)
print("all checks passed")
