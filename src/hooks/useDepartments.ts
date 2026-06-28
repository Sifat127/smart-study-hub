import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { departments as fallback, Department } from "@/data/mockData";

interface DbDepartment {
  id: string;
  name: string;
  full_name: string;
  description: string;
  icon: string;
  sort_order: number;
}

export function useDepartments(): Department[] {
  const { data } = useQuery({
    queryKey: ["departments"],
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, full_name, description, icon, sort_order")
        .order("sort_order");
      if (error) throw error;
      return ((data as DbDepartment[] | null) || []).map((d) => ({
        id: d.id,
        name: d.name,
        fullName: d.full_name,
        description: d.description,
        icon: d.icon,
        totalCourses: 0,
      }));
    },
    initialData: fallback,
    staleTime: 60_000,
  });
  return data ?? fallback;
}
