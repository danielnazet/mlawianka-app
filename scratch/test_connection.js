const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://oyqsfkwouyhpabkrhgmk.supabase.co";
const supabaseAnonKey = "sb_publishable_Bk33JNe_PKcOhKtIsNlWcg_-Ii4GB4v";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log("Testing connection to Supabase:", supabaseUrl);
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey }
    });
    console.log("Health check status:", res.status, res.statusText);
    const body = await res.text();
    console.log("Health check body:", body);
  } catch (err) {
    console.error("Health check error:", err);
  }

  try {
    const { data, error } = await supabase.from("teams").select("id, name").limit(2);
    console.log("Database query result:", data, error);
  } catch (err) {
    console.error("Database query error:", err);
  }
}

testConnection();
