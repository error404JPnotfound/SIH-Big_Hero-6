from supabase import create_client, Client
from app.config import settings

def get_supabase_client() -> Client:
    if not settings.supabase_url or not settings.supabase_anon_key:
        # We allow it to be empty for testing without real DB connections
        # But for actual operations, we might want to check this or mock it
        pass
    
    # We will initialize with empty strings if not provided just to allow app to start
    # Real requests will fail if DB is actually queried
    url = settings.supabase_url or "https://placeholder.supabase.co"
    key = settings.supabase_service_role_key or settings.supabase_anon_key or "placeholder_key"
    
    return create_client(url, key)

supabase_client = get_supabase_client()
