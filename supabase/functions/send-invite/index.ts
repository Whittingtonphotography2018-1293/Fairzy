import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteRequest {
  invitedEmail: string;
  invitedBy: string;
  turnListName: string;
  turnListId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { invitedEmail, invitedBy, turnListName, turnListId }: InviteRequest = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://whose-turn.app";
    const inviteLink = `${appUrl}/invites`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You've been invited!</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #0f172a; font-size: 28px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                  Whose Turn?
                </h1>
                <p style="color: #64748b; font-size: 16px; margin: 0;">
                  You've been invited to join a turn list!
                </p>
              </div>

              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">
                  ${turnListName}
                </h2>
                <p style="color: rgba(255, 255, 255, 0.9); font-size: 15px; margin: 0;">
                  Someone wants you to join their turn list
                </p>
              </div>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                You've been invited to collaborate on tracking turns together. Accept the invitation to get started!
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteLink}" style="display: inline-block; background-color: #007aff; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 17px; font-weight: 700; letter-spacing: 0.3px;">
                  View Invitation
                </a>
              </div>

              <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 24px;">
                <p style="color: #94a3b8; font-size: 14px; line-height: 20px; margin: 0; text-align: center;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                © ${new Date().getFullYear()} Whose Turn. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
You've been invited to join "${turnListName}" on Whose Turn!

Accept your invitation by visiting:
${inviteLink}

If you didn't expect this invitation, you can safely ignore this email.
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Whose Turn <invites@whose-turn.app>",
        to: [invitedEmail],
        subject: `You've been invited to join "${turnListName}"`,
        html: emailHtml,
        text: emailText,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const resendData = await resendResponse.json();
    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent",
        email: invitedEmail,
        emailId: resendData.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error processing invite:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process invitation",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
