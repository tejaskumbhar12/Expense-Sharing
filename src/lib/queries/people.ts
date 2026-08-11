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

      const rows = (data ?? []) as { user_id: string | null; display_name: string; email: string | null }[];
      const map = new Map<string, KnownPerson>();
      for (const r of rows) {
        if (r.user_id && user && r.user_id === user.id) continue; // skip self
        const key = r.user_id
          ? `u:${r.user_id}`
          : r.email
            ? `e:${r.email.toLowerCase()}`
            : `n:${r.display_name.toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, { user_id: r.user_id, display_name: r.display_name, email: r.email });
        }
      }
      return Array.from(map.values()).sort((a, b) => a.display_name.localeCompare(b.display_name));
    },
  });
}
