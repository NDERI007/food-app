import supabase from "@config/supabase";

export async function getUserByEmail(email: string) {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return user; // will exist if they ever signed up
}
