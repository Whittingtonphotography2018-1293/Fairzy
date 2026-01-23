/*
  # Add Feedback Notification Trigger

  1. Changes
    - Creates a trigger that sends email notifications when new feedback is submitted
    - Calls the send-feedback-notification edge function with feedback details
    
  2. Function
    - `notify_feedback_submission` - Trigger function that invokes edge function via pg_net
    - Sends feedback data as JSON payload to the edge function
    
  3. Trigger
    - Fires AFTER INSERT on feedback table
    - Runs for each row inserted
*/

CREATE OR REPLACE FUNCTION notify_feedback_submission()
RETURNS TRIGGER AS $$
DECLARE
  feedback_payload jsonb;
  supabase_url text;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  
  IF supabase_url IS NULL THEN
    supabase_url := 'https://iwjjxbodsfnmeoffhdvf.supabase.co';
  END IF;

  feedback_payload := jsonb_build_object(
    'user_id', NEW.user_id::text,
    'email', NEW.email,
    'category', NEW.category,
    'message', NEW.message,
    'created_at', NEW.created_at::text
  );

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-feedback-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := feedback_payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_feedback_submitted ON feedback;

CREATE TRIGGER on_feedback_submitted
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_feedback_submission();
