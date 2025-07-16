import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsxoycbgstdmwnihazlq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzeG95Y2Jnc3RkbXduaWhhemxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2Mzk3MzcsImV4cCI6MjA2ODIxNTczN30.ppxCb81HydyPO6vRY_po79H3VDaGNVEVAwqhFZAH190';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
