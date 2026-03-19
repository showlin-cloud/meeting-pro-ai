CREATE TABLE usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  cost_usd numeric DEFAULT 0,
  api_provider text,
  created_at date DEFAULT current_date
);
CREATE TABLE transcription_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url text,
  status text,
  result_markdown text,
  created_at timestamp DEFAULT now()
);
