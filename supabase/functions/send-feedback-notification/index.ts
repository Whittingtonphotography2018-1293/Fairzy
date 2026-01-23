import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FeedbackPayload {
  user_id: string;
  email: string;
  category: string;
  message: string;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: FeedbackPayload = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const NOTIFICATION_EMAIL = Deno.env.get("FEEDBACK_NOTIFICATION_EMAIL");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!NOTIFICATION_EMAIL) {
      console.error("FEEDBACK_NOTIFICATION_EMAIL not configured");
      return new Response(
        JSON.stringify({ error: "Notification email not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const categoryLabels: Record<string, string> = {
      feature_request: "Feature Request",
      bug_report: "Bug Report",
      general: "General Feedback",
    };

    const emailHtml = `
      <h2>New Feedback Received</h2>
      <p><strong>Category:</strong> ${categoryLabels[payload.category] || payload.category}</p>
      <p><strong>From:</strong> ${payload.email}</p>
      <p><strong>User ID:</strong> ${payload.user_id}</p>
      <p><strong>Submitted:</strong> ${new Date(payload.created_at).toLocaleString()}</p>
      <hr />
      <h3>Message:</h3>
      <p>${payload.message.replace(/\n/g, '<br>')}</p>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Fairzy Feedback <notifications@yourdomain.com>",
        to: [NOTIFICATION_EMAIL],
        subject: `New ${categoryLabels[payload.category] || 'Feedback'} - Fairzy`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Failed to send email:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending feedback notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
