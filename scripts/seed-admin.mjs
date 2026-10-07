// Crea (o actualiza) la cuenta de administrador en Supabase.
// Uso:  node --env-file=.env.local scripts/seed-admin.mjs
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
if (!url || !key || !email || !password) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL o ADMIN_PASSWORD");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
let user = list?.users.find((u) => u.email === email);

if (user) {
  await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: "Administrador" },
  });
  if (error) { console.error(error.message); process.exit(1); }
  user = data.user;
}

const { error } = await supabase.from("profiles")
  .upsert({ id: user.id, email, full_name: "Administrador", role: "admin" });
if (error) { console.error(error.message); process.exit(1); }
console.log(`✔ Administrador listo: ${email}`);
