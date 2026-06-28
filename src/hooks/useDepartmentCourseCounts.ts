import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a map of department code -> number of courses in that department.
 * Department codes here match the `department` text column on `courses`
 * (e.g. "CSE", "EEE"). Some department slugs are lowercase, so consumers
 * may need to normalize when looking up.
 */
export function useDepartmentCourseCounts(): Record<string, number> {
  const { data } = useQuery({
    queryKey: ["department-course-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("department");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: { department: string }) => {
        if (!row.department) return;
        const key = row.department.toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    },
    initialData: {},
    staleTime: 60_000,
  });
  return data ?? {};
}
