"""What robots.txt may and may not say on mendgroup.co.za. Stdlib only.

The rule since PR #1 is that MEND never writes a Disallow: the previews are kept out of
search by their `noindex` tag, and a crawler that is disallowed never reads that tag.

Cloudflare now serves its own "managed" block in front of the repo's file. It tells named
AI-training crawlers to stay out and leaves every other crawler allowed. The old check
("the word Disallow appears nowhere") failed on that block on every live run from 3 Nov
2026, so it could no longer tell a real problem from Cloudflare's block.

The rule is now three things, each of which the old check also enforced:
  1. Nothing outside the Cloudflare block has a Disallow. MEND still writes none.
  2. Inside the block, the catch-all group `*` is not disallowed.
  3. Inside the block, no search engine is disallowed.
"""
import re

BEGIN = re.compile(r"^#\s*BEGIN Cloudflare Managed content", re.I)
END = re.compile(r"^#\s*END Cloudflare Managed content", re.I)

# Crawlers whose job is a search index. Lower case. A Disallow that names one of these
# keeps a page's noindex tag from being read, which is what the rule exists to prevent.
SEARCH_ENGINES = ("googlebot", "bingbot", "duckduckbot", "applebot", "slurp", "yandexbot")


def robots_problems(text):
    """Return a list of problems; an empty list means robots.txt is acceptable."""
    problems = []
    in_block = False
    agents = []          # user-agents of the group being read
    reading_agents = False

    for raw in text.splitlines():
        line = raw.strip()
        if BEGIN.match(line):
            in_block, agents, reading_agents = True, [], False
            continue
        if END.match(line):
            in_block, agents, reading_agents = False, [], False
            continue
        line = line.split("#", 1)[0].strip()
        if ":" not in line:
            continue
        field, value = (part.strip() for part in line.split(":", 1))
        field = field.lower()

        if field == "user-agent":
            if not reading_agents:
                agents = []
            agents.append(value.lower())
            reading_agents = True
            continue
        reading_agents = False

        if field != "disallow" or not value:
            continue      # an empty Disallow allows everything
        if not in_block:
            problems.append(f"Disallow outside the Cloudflare block: '{raw.strip()}'")
            continue
        for agent in agents or ["*"]:
            if agent == "*":
                problems.append(f"the Cloudflare block disallows '*': '{raw.strip()}'")
            elif agent in SEARCH_ENGINES:
                problems.append(f"the Cloudflare block disallows search engine {agent}")
    return problems
