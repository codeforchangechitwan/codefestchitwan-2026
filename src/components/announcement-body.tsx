import type { ReactNode } from "react";

/**
 * The text of an announcement, rendered the way it was written.
 *
 * Organisers paste notices in from a phone or a group chat, so the body
 * arrives as prose with blank lines between paragraphs and a bare form URL on
 * a line of its own. Two things have to survive that:
 *
 *  - the line breaks (`whitespace-pre-line`), including the CRLF pairs a
 *    Windows browser submits, which are normalised to plain newlines here
 *    because a stray carriage return renders as a gap in some engines; and
 *  - the links, which are turned into real anchors. A notice whose whole
 *    point is "fill this form before 5am" is useless if the URL is dead text
 *    that a participant has to retype on a phone.
 *
 * No `"use client"`: this holds no state, so it renders on the server for the
 * dashboard and inside the live client list on /announcements alike.
 */
export function AnnouncementBody({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <p className={`whitespace-pre-line break-words ${className}`}>
      {linkify(text.replace(/\r\n?/g, "\n"))}
    </p>
  );
}

/** Bare http(s) URLs. Stops at whitespace — the rest is punctuation work. */
const URL_PATTERN = /https?:\/\/[^\s<]+/gi;

/**
 * Trailing characters that belong to the sentence rather than the link.
 * "…form: https://forms.gle/abc." must not link the full stop, but a closing
 * bracket is only dropped when the URL does not open one itself.
 */
const TRAILING = /[.,;:!?'"»…]+$/;

function linkify(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index;
    let url = match[0].replace(TRAILING, "");
    if (url.endsWith(")") && !url.includes("(")) url = url.slice(0, -1);
    if (!/^https?:\/\/\S+$/i.test(url)) continue;

    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <a
        key={start}
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="font-medium text-brand underline underline-offset-2 hover:text-brand-strong"
      >
        {url}
      </a>,
    );
    cursor = start + url.length;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
