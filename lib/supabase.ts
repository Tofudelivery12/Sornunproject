import { createClient } from '@supabase/supabase-js';

// ใส่ลิงก์และคีย์ของคุณตรงๆ แบบไม่ต้องผ่านโปรแกรมตัวกลาง
const supabaseUrl = 'https://vujgrsguvegihqihuklf.supabase.co';
const supabaseAnonKey = 'sb_publishable_Kih_kVHVoB24pt7h7IjzwQ_c4jLO0tp';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);