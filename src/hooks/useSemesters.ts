import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Semester {
  id: string;
  number: number;
  name: string;
  description: string;
  sort_order: number;
}

const fallback: Semester[] = Array.from({ length: 12 }, (_, i) => ({
  id: `fallback-${i + 1}`,
  number: i + 1,
  name: `Semester ${i + 1}`,
  description: "",
  sort_order: (i + 1) * 10,
}));

export function useSemesters(): Semester[] {
  const { data } = useQuery({
    queryKey: ["semesters"],
    queryFn: async (): Promise<Semester[]> => {
      const { data, error } = await supabase
        .from("semesters")
        .select("id, number, name, description, sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data as Semester[] | null) || [];
    },
    initialData: fallback,
    staleTime: 60_000,
  });
  return data?.length ? data : fallback;
}
