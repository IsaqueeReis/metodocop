import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zgkjevyvfistqxxkxsnb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FoY9GcrI1roCMLJiffn7Tw_zMKy3eG7';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fix() {
  console.log('Testing insert...');
  const { data, error } = await supabase.from('qb_comments').insert({
    question_id: '00000000-0000-0000-0000-000000000000', // Need a valid question ID
    user_id: '00000000-0000-0000-0000-000000000000', // Need a valid user ID
    user_name: 'Test',
    comment_text: 'Test',
    parent_id: null
  });
  console.log(error);
}
fix();
