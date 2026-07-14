import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zgkjevyvfistqxxkxsnb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FoY9GcrI1roCMLJiffn7Tw_zMKy3eG7';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fix() {
  console.log('Checking qb_comments...');
  const { data, error } = await supabase.from('qb_comments').select('parent_id').limit(1);
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('parent_id exists');
  }
}
fix();
