// Untyped Supabase wrapper — our tables aren't in the generated Database types
// because they were created via migration tool. Cast to `any`-ish shape for CRUD.
import { supabase } from "@/integrations/supabase/client";

type AnyClient = {
  from: (table: string) => any;
  storage: typeof supabase.storage;
};

export const db = supabase as unknown as AnyClient;
