const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://oyqsfkwouyhpabkrhgmk.supabase.co";
const supabaseAnonKey = "sb_publishable_Bk33JNe_PKcOhKtIsNlWcg_-Ii4GB4v";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: trainings, error: tErr } = await supabase.from("trainings").select("*").limit(5);
  console.log("Trainings:", trainings, tErr);
  const { data: matches, error: mErr } = await supabase.from("matches").select("*").limit(5);
  console.log("Matches:", matches, mErr);
}

test();
