"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [inputName, setInputName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('id', { ascending: false });
    if (data) setCategories(data);
    setLoading(false);
  }

  // สร้างหมวดหมู่ใหม่
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!inputName.trim()) return;
    const { error } = await supabase.from('categories').insert([{ name: inputName }]);
    if (error) alert('❌ ชื่อหมวดหมู่นี้อาจจะมีซ้ำอยู่ในระบบแล้ว!');
    setInputName('');
    fetchCategories();
  }

  // แก้ไขชื่อหมวดหมู่
  async function handleUpdate(id: number) {
    if (!editName.trim()) return;
    await supabase.from('categories').update({ name: editName }).eq('id', id);
    setEditingId(null);
    fetchCategories();
  }

  // ลบหมวดหมู่
  async function handleDelete(id: number) {
    if (confirm('ยืนยันลบหมวดหมู่? (สินค้าในหมวดหมู่นี้จะถูกเปลี่ยนสถานะเป็น ไม่ระบุหมวดหมู่)')) {
      await supabase.from('categories').delete().eq('id', id);
      fetchCategories();
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🗂️ ตั้งค่าหมวดหมู่สินค้าชิ้นส่วน</h1>
        <p className="text-sm text-slate-500">สร้าง แก้ไขชื่อ หรือลบประเภทการจัดหมวดหมู่เพื่อใช้แยกประเภทสินค้า</p>
      </div>

      {/* ฟอร์มสร้างหมวดหมู่ใหม่ */}
      <form onSubmit={handleCreate} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex gap-2">
        <input 
          type="text" 
          placeholder="➕ เพิ่มชื่อหมวดหมู่ใหม่ (เช่น คอนเดนเซอร์, บอร์ดไมโครคอนโทรลเลอร์)..." 
          className="flex-1 border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          required
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
          เพิ่มหมวดหมู่
        </button>
      </form>

      {/* รายการหมวดหมู่ทั้งหมด */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b font-bold text-sm text-slate-700">📌 รายการหมวดหมู่ทั้งหมดในฐานข้อมูล</div>
        <ul className="divide-y divide-slate-100">
          {categories.map((cat) => (
            <li key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
              {editingId === cat.id ? (
                <div className="flex gap-2 flex-1 mr-4">
                  <input 
                    type="text" 
                    className="border rounded-lg px-3 py-1 text-sm flex-1 outline-none" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                  />
                  <button onClick={() => handleUpdate(cat.id)} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold">บันทึก</button>
                  <button onClick={() => setEditingId(null)} className="bg-slate-300 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold">ยกเลิก</button>
                </div>
              ) : (
                <span className="font-semibold text-slate-800">{cat.name}</span>
              )}

              {editingId !== cat.id && (
                <div className="space-x-3 text-sm">
                  <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="text-blue-500 hover:underline">แก้ไขชื่อ</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-rose-500 hover:underline">ลบออก</button>
                </div>
              )}
            </li>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">ยังไม่มีการเพิ่มหมวดหมู่ใดๆ ในคลัง</div>
          )}
        </ul>
      </div>
    </main>
  );
}