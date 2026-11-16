#!/usr/bin/env python3
"""Tests for robots_rules.robots_problems. Run: python3 -m unittest discover -s .github/scripts"""
import unittest

from robots_rules import robots_problems

REPO = "User-agent: *\nAllow: /\nSitemap: https://mendgroup.co.za/sitemap.xml\n"

# What mendgroup.co.za served on 16 Nov 2026, shortened: Cloudflare puts its managed
# block in front of the repo's file.
CLOUDFLARE = """# BEGIN Cloudflare Managed content

User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

# Training crawlers
User-agent: GPTBot
Disallow: /

User-agent: AwarioSmartBot
User-agent: AwarioRssBot
Disallow: /

# END Cloudflare Managed Content

"""


class RobotsProblems(unittest.TestCase):
    def test_the_repo_file_is_clean(self):
        self.assertEqual(robots_problems(REPO), [])

    def test_cloudflare_block_naming_training_crawlers_is_clean(self):
        self.assertEqual(robots_problems(CLOUDFLARE + REPO), [])

    def test_disallow_written_by_mend_fails(self):
        problems = robots_problems(REPO + "Disallow: /previews/\n")
        self.assertTrue(any("outside the Cloudflare block" in p for p in problems), problems)

    def test_disallow_for_a_named_bot_outside_the_block_fails(self):
        problems = robots_problems(REPO + "\nUser-agent: GPTBot\nDisallow: /\n")
        self.assertTrue(any("outside the Cloudflare block" in p for p in problems), problems)

    def test_disallow_after_the_block_ends_fails(self):
        problems = robots_problems(CLOUDFLARE + REPO + "Disallow: /work/\n")
        self.assertTrue(any("outside the Cloudflare block" in p for p in problems), problems)

    def test_block_that_shuts_out_every_crawler_fails(self):
        bad = CLOUDFLARE.replace("Allow: /\n\n# Training", "Disallow: /\n\n# Training")
        problems = robots_problems(bad + REPO)
        self.assertTrue(any("'*'" in p for p in problems), problems)

    def test_block_that_shuts_out_a_search_engine_fails(self):
        bad = CLOUDFLARE.replace("User-agent: GPTBot", "User-agent: Googlebot")
        problems = robots_problems(bad + REPO)
        self.assertTrue(any("googlebot" in p for p in problems), problems)

    def test_search_engine_sharing_a_group_with_a_training_crawler_fails(self):
        bad = CLOUDFLARE.replace("User-agent: AwarioRssBot", "User-agent: bingbot")
        problems = robots_problems(bad + REPO)
        self.assertTrue(any("bingbot" in p for p in problems), problems)

    def test_empty_disallow_allows_everything(self):
        self.assertEqual(robots_problems(CLOUDFLARE.replace("Disallow: /", "Disallow:") + REPO), [])

    def test_unclosed_block_does_not_excuse_what_follows(self):
        unclosed = CLOUDFLARE.replace("# END Cloudflare Managed Content\n", "")
        problems = robots_problems(unclosed + REPO + "Disallow: /previews/\n")
        self.assertTrue(problems, "an unclosed block must not hide a Disallow")


if __name__ == "__main__":
    unittest.main()
