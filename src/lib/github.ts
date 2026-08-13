/**
 * Parsing for the one GitHub field participants fill in themselves.
 *
 * Nobody types a bare handle when asked for their "GitHub profile" — they paste
 * whatever is in the address bar. So the field accepts the whole range of
 * things a person reasonably believes is their profile (a full URL, a URL with
 * a tab query on it, an @handle, or just the handle) and stores the one thing
 * that is actually useful: the username. Everything else is reconstructable.
 *
 * Rejecting a paste with "that is not a username" would be technically correct
 * and useless, which is why the failures below name the specific mistake —
 * pasting a repository rather than a profile is the common one.
 */

/**
 * GitHub's own rule: alphanumerics and single hyphens, no hyphen at either end,
 * 39 characters at most. Written without lookahead so the same expression can
 * back the database CHECK constraint.
 */
const USERNAME_RE = /^[A-Za-z0-9](?:-?[A-Za-z0-9])*$/;
const MAX_LENGTH = 39;

/** Paths on github.com that are never somebody's profile. */
const RESERVED = new Set([
  "about",
  "features",
  "orgs",
  "organizations",
  "pricing",
  "search",
  "settings",
  "sponsors",
  "topics",
  "trending",
]);

export type GithubParse =
  | { ok: true; username: string | null }
  | { ok: false; error: string };

/**
 * Accepts "", "octocat", "@octocat", "github.com/octocat",
 * "https://github.com/octocat?tab=repositories" — returns "octocat".
 *
 * An empty input is a successful parse of "no username", so that clearing the
 * field is a way to remove it rather than a validation error.
 */
export function parseGithubUsername(raw: string): GithubParse {
  let value = raw.trim();
  if (!value) return { ok: true, username: null };

  // Drop anything after the path: ?tab=repositories, #readme, a trailing slash.
  value = value.split(/[?#]/)[0].replace(/\/+$/, "");

  const asUrl = /^(?:https?:\/\/)?(?:www\.)?github\.com\/(.*)$/i.exec(value);
  if (asUrl) {
    const path = asUrl[1];
    if (!path) {
      return { ok: false, error: "That is github.com itself, not your profile." };
    }
    const segments = path.split("/").filter(Boolean);
    if (segments.length > 1) {
      return {
        ok: false,
        error:
          "That looks like a repository. Use your profile — github.com/your-username.",
      };
    }
    value = segments[0];
  } else if (/^https?:\/\//i.test(value) || value.includes(".")) {
    // A URL, but not a GitHub one. Say so rather than failing the format check.
    return { ok: false, error: "That is not a github.com link." };
  }

  value = value.replace(/^@/, "");

  if (value.length > MAX_LENGTH) {
    return { ok: false, error: "GitHub usernames are at most 39 characters." };
  }
  if (RESERVED.has(value.toLowerCase())) {
    return { ok: false, error: "That is a GitHub page, not a profile." };
  }
  if (!USERNAME_RE.test(value)) {
    return {
      ok: false,
      error:
        "Usernames use letters, numbers and single hyphens — check for a typo.",
    };
  }

  return { ok: true, username: value };
}

export const githubProfileUrl = (username: string) =>
  `https://github.com/${username}`;
