// Public Supabase config baked into the code. These are the publishable URL and
// anon key — designed to be exposed to the browser. RLS policies protect tenant
// data. Override at build time by setting NEXT_PUBLIC_SUPABASE_URL /
// NEXT_PUBLIC_SUPABASE_ANON_KEY if you fork this for your own project.
export const SUPABASE_URL_DEFAULT = "https://iygccozxtjbulicporrl.supabase.co";
export const SUPABASE_ANON_KEY_DEFAULT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z2Njb3p4dGpidWxpY3BvcnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDUwOTIsImV4cCI6MjA5MjIyMTA5Mn0.ClZ1hj7cXrmilRK1lPoHK8VZ0NGNJiITwjJ3ALQc6ig";

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL_DEFAULT;
}
export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_DEFAULT;
}
