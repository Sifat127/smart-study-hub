import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, problemType, message } = await req.json();

    if (!name || !email || !problemType || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const NOTIFICATION_EMAIL = "jahinahmed5959@gmail.com";

    // Use Supabase's built-in email or a simple fetch to a mail API
    // For now, we log and store - the DB insert already happened on client side
    console.log(`Contact form submission from ${name} (${email})`);
    console.log(`Problem Type: ${problemType}`);
    console.log(`Message: ${message}`);
    console.log(`Notification should go to: ${NOTIFICATION_EMAIL}`);

    return new Response(
      JSON.stringify({ success: true, message: "Contact form processed" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing contact form:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
