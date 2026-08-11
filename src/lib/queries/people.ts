import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export interface KnownPerson {
  user_id: string | null;
  display_name: string;
  email: string | null;
}

/**
 * People the user already shares a group with, de-duplicated — so they can be
 * re-added to a new group in one tap instead of retyping an email. RLS on
 * group_members already scopes this to the user's own groups.
 *
 * A person may appear across groups both linked (has user_id) and as an email
 * placeholder (no user_id), so identities are merged by user_id AND email, and
 * each returned person carries both when known — that lets the add screen
 * reliably exclude people already in the target group.
 */
export function useKnownPeople() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['known-people', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<KnownPerson[]> => {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, display_name, email');
      if (error) throw error;

      const rows = ((data ?? []) as { user_id: string | null; display_name: string; email: string | null }[]).filter(
        (r) => !(r.user_id && user && r.user_id === user.id) // drop self
      );

      // Cross-reference so an email can resolve to a user_id and vice-versa.
      const emailToUid = new Map<string, string>();
      const uidToEmail = new Map<string, string>();
      for (const r of rows) {
        if (r.user_id && r.email) {
          const e = r.email.toLowerCase();
          if (!emailToUid.has(e)) emailToUid.set(e, r.user_id);
          if (!uidToEmail.has(r.user_id)) uidToEmail.set(r.user_id, r.email);
        }
      }

      const map = new Map<string, KnownPerson>();
      for (const r of rows) {
        const uid = r.user_id ?? (r.email ? emailToUid.get(r.email.toLowerCase()) ?? null : null);
        const email = r.email ?? (r.user_id ? uidToEmail.get(r.user_id) ?? null : null);
        const key = uid
          ? `u:${uid}`
          : email
            ? `e:${email.toLowerCase()}`
            : `n:${r.display_name.toLowerCase()}`;

        const existing = map.get(key);
        if (!existing) {
          map.set(key, { user_id: uid, display_name: r.display_name, email });
        } else {
          if (!existing.user_id && uid) existing.user_id = uid;
          if (!existing.email && email) existing.email = email;
          if (r.user_id) existing.display_name = r.display_name; // prefer a linked account's name
        }
      }

      return Array.from(map.values()).sort((a, b) => a.display_name.localeCompare(b.display_name));
    },
  });
}
