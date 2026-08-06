/*
 * Everything under this group is signed-in, per-person content: it reads the
 * session cookie and must never be prerendered or cached at the edge.
 */
export const dynamic = "force-dynamic";

export default function MemberLayout({ children }: LayoutProps<"/">) {
  return children;
}
