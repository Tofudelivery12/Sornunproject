"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // ใช้ Path เดิมของคุณ

export default function UnifiedDashboardPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // สถิติสำหรับ Dashboard
  const [stats, setStats] = useState({ total: 0, low: 0, out: 0 });

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', category_id: '', price: 0, stock_quantity: 0, image_url: '', supplier_name: '', supplier_link: '' });

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({ product_id: '', type: 'IN', quantity: 1 });

  // 🎯 State สำหรับคุมป็อปอัป "หน้ารายงานของใกล้หมด/หมดคลัง" และเก็บประเภทที่จะฟิลเตอร์
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    const { data: pData } = await supabase.from('products').select('*, categories(name)').order('id', { ascending: false });
    const { data: cData } = await supabase.from('categories').select('*').order('name');
    
    if (pData) {
      setProducts(pData);
      const totalProducts = pData.length;
      const lowStock = pData.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length;
      const outOfStock = pData.filter(p => p.stock_quantity === 0).length;
      setStats({ total: totalProducts, low: lowStock, out: outOfStock });
    }
    if (cData) setCategories(cData);
    loading && setLoading(false);
  }

  function openForm(product: any = null) {
    if (product) {
      setEditingId(product.id);
      setForm({ name: product.name, sku: product.sku, category_id: product.category_id || '', price: product.price, stock_quantity: product.stock_quantity, image_url: product.image_url || '', supplier_name: product.supplier_name || '', supplier_link: product.supplier_link || '' });
    } else {
      setEditingId(null);
      setForm({ name: '', sku: '', category_id: '', price: 0, stock_quantity: 0, image_url: '', supplier_name: '', supplier_link: '' });
    }
    setShowModal(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      const payload = { ...form, category_id: form.category_id ? Number(form.category_id) : null };
      await supabase.from('products').update(payload).eq('id', editingId);
    } else {
      const payload = { ...form, category_id: form.category_id ? Number(form.category_id) : null, stock_quantity: 0 };
      const { data } = await supabase.from('products').insert([payload]).select();
      
      if (data && data[0] && form.stock_quantity > 0) {
        await supabase.from('stock_transactions').insert([{ product_id: data[0].id, quantity: form.stock_quantity, type: 'IN' }]);
      }
    }
    setShowModal(false);
    fetchInitialData();
  }

  async function handleStockAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!stockForm.product_id) {
      alert('❌ กรุณาเลือกชิ้นส่วนสินค้าก่อนทำรายการครับ');
      return;
    }
    
    // 🎯 แก้ไขตรงนี้: แปลงประเภทข้อมูลให้ตรงกันก่อนทำการค้นหา (ใช้ String ครอบทั้งสองฝั่ง)
    const prod = products.find(p => String(p.id) === String(stockForm.product_id));
    
    if (!prod) {
      alert('❌ ไม่พบข้อมูลสินค้าชิ้นนี้ในระบบคลัง');
      return;
    }
    if (stockForm.type === 'OUT' && prod.stock_quantity < stockForm.quantity) {
      alert('❌ ของในสต็อกมีไม่พอให้เบิกออกครับ!');
      return;
    }
    await supabase.from('stock_transactions').insert([{ product_id: prod.id, quantity: stockForm.quantity, type: stockForm.type }]);
    setShowStockModal(false);
    fetchInitialData();
  }

  // ฟังก์ชันช่วยคัดกรองข้อมูลอุปกรณ์ที่ตรงตามเงื่อนไขเพื่อไปโชว์ในป็อปอัปใบสั่งของ
  const reportProducts = products.filter(p => {
    if (filterType === 'OUT') return p.stock_quantity === 0;
    if (filterType === 'LOW') return p.stock_quantity > 0 && p.stock_quantity <= 10;
    return p.stock_quantity <= 10; // 'ALL' คือเอาทั้งสองอย่าง
  });

  return (
    <main className="py-6 space-y-6 max-w-6xl mx-auto px-2">
      
      {/* 📊 ZONE 1: DASHBOARD CARDS (คลิกเปิดดูรายงานสั่งซื้อได้ด่วน) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* รายการทั้งหมด */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">สินค้าทั้งหมดในสต็อก</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.total} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg">📦</div>
        </div>

        {/* ปุ่มสต็อกใกล้หมด */}
        <div 
          onClick={() => { setFilterType('LOW'); setShowOrderModal(true); }}
          className="bg-amber-50/60 p-5 rounded-2xl shadow-sm border border-amber-200 flex items-center justify-between cursor-pointer hover:bg-amber-100/70 transition-all"
        >
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">สต็อกใกล้หมด (≤ 10) ↗</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.low} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center text-lg shadow-sm animate-pulse">⚠️</div>
        </div>

        {/* ปุ่มสินค้าหมดคลัง */}
        <div 
          onClick={() => { setFilterType('OUT'); setShowOrderModal(true); }}
          className="bg-red-50/60 p-5 rounded-2xl shadow-sm border border-red-200 flex items-center justify-between cursor-pointer hover:bg-red-100/70 transition-all"
        >
          <div>
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">สินค้าหมดคลัง (0) ↗</p>
            <p className="text-2xl font-extrabold text-red-600 mt-1">{stats.out} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center text-lg shadow-sm animate-pulse">🚨</div>
        </div>
      </div>

      {/* 🏪 ZONE 2: HEADER CONTROL (เปลี่ยนชื่อเป็น Sornun Stock ให้แล้วครับ!) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Sornun Stock อัจฉริยะ</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">ระบบควบคุมคลังสินค้าและสรุปรายงานจัดซื้อส่วนตัวของคุณ Sornun</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => { 
              if(products.length > 0) { 
                setStockForm({ product_id: '', type: 'IN', quantity: 1 }); 
                setShowStockModal(true); 
              } else { 
                alert('กรุณาเพิ่มสินค้าในระบบก่อนครับ'); 
              } 
            }} 
            className="flex-1 md:flex-none bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-slate-200"
          >
            🔄 รับ-จ่ายสต็อกด่วน
          </button>
          <button onClick={() => openForm()} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm">
            ➕ เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      {/* 📉 ZONE 3: พื้นที่หน้าหลักของ Dashboard (สไตล์คลีน สบายตา) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center justify-center min-h-[250px]">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="text-base font-bold text-slate-700">ยินดีต้อนรับเข้าสู่ระบบ Sornun Stock</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
          หน้านี้แสดงสถิติสำคัญแบบองค์รวมเพื่อความเป็นระเบียบ หากต้องการจัดการ เพิ่ม ลบ หรือแก้ไขข้อมูล สามารถกดเลือกใช้งานได้จากแท็บเมนู <strong className="text-slate-600">"คลังสินค้า (CRUD)"</strong> ด้านบนได้เลยครับ
        </p>
        {(stats.low > 0 || stats.out > 0) && (
          <button 
            onClick={() => { setFilterType('ALL'); setShowOrderModal(true); }}
            className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            📋 เปิดดูสรุปรายการที่ต้องสั่งของทั้งหมด ({stats.low + stats.out} รายการ)
          </button>
        )}
      </div>


      {/* 🖼️ ป็อปอัป (Modal): สรุปรายงานตัวช่วยสั่งซื้ออุปกรณ์ที่หมดหรือใกล้หมดสต็อก */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header ป็อปอัป */}
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  🛒 สรุปรายการอุปกรณ์ที่ต้องจัดซื้อเติมสต็อก
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  แสดงเฉพาะรายการที่มีระดับสินค้าวิกฤต (น้อยกว่าหรือเท่ากับ 10 ชิ้น)
                </p>
              </div>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">✕</button>
            </div>

            {/* ส่วนแสดงตารางข้อมูลร้านค้า */}
            <div className="p-5 overflow-y-auto flex-1">
              {reportProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  🎉 สบายใจได้! ไม่มีรายการอุปกรณ์ที่ตรงตามเงื่อนไขนี้เลยครับคลังแน่นๆ
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                      <tr>
                        <th className="p-3">ชื่อชิ้นส่วน / SKU</th>
                        <th className="p-3 text-center">คงเหลือปัจจุบัน</th>
                        <th className="p-3">ร้านค้า / ลิงก์ช่องทางสั่งซื้ออุปกรณ์</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {reportProducts.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3">
                            <span className="font-bold text-slate-800 block text-sm">{item.name}</span>
                            <span className="font-mono text-[11px] text-slate-400">SKU: {item.sku}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              item.stock_quantity === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {item.stock_quantity} ชิ้น
                            </span>
                          </td>
                          <td className="p-3">
                            {item.supplier_link ? (
                              <a 
                                href={item.supplier_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-bold text-xs"
                              >
                                🛒 {item.supplier_name || 'ลิงก์ไปสั่งซื้อของ'} 
                                <span className="text-[10px]">↗</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-xs">
                                {item.supplier_name ? `🏪 ${item.supplier_name} (ไม่ได้ลงลิงก์ไว้)` : 'ไม่ได้ระบุข้อมูลร้าน'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer ป็อปอัป */}
            <div className="p-4 border-t bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowOrderModal(false)}
                className="bg-slate-800 text-white hover:bg-slate-900 px-5 py-2 rounded-xl font-bold text-xs transition-colors"
              >
                ปิดหน้ารายงาน
              </button>
            </div>

          </div>
        </div>
      )}


      {/* 🟩 MODAL: เพิ่ม/แก้ไขสินค้า (คงเดิมไว้สมบูรณ์) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">
              {editingId ? '📝 แก้ไขข้อมูลชิ้นส่วนสินค้า' : '✨ เพิ่มสินค้าใหม่เข้าระบบ'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-4 text-slate-700 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อชิ้นส่วนอุปกรณ์ *</label>
                <input type="text" required className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="เช่น IC Regulate 5V" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">รหัสสินค้า (SKU) *</label>
                  <input type="text" required className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="เช่น IC-7805-X" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">หมวดหมู่</label>
                  <select className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none bg-white font-medium" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                    <option value="">เลือกหมวดหมู่</option>
                    {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ราคาต่อหน่วย (บาท)</label>
                  <input type="number" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none" value={form.price || ''} onChange={e => setForm({...form, price: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">สต็อกตั้งต้น (ชิ้น)</label>
                  <input type="number" disabled={!!editingId} className="w-full border border-slate-200 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl p-2.5 text-sm outline-none" value={form.stock_quantity || ''} onChange={e => setForm({...form, stock_quantity: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ลิงก์ URL รูปภาพสินค้า</label>
                <input type="url" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อผู้จัดจำหน่าย (Supplier)</label>
                  <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} placeholder="เช่น บจก. บ้านหม้อ" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ลิงก์ติดต่อร้านค้า</label>
                  <input type="url" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none" value={form.supplier_link} onChange={e => setForm({...form, supplier_link: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟠 MODAL: ระบบรับเข้า-เบิกออกสินค้าด่วน (คงเดิมไว้สมบูรณ์) */}
      {showStockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">🔄 หน้าทำรายการ รับเข้า / เบิกจ่ายคลัง</h3>
            <form onSubmit={handleStockAdjust} className="space-y-4 text-slate-700 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">เลือกชิ้นส่วนสินค้า</label>
                <select 
                  required 
                  className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-sm outline-none font-medium text-slate-800" 
                  value={stockForm.product_id} 
                  onChange={e => setStockForm({...stockForm, product_id: e.target.value})}
                >
                  <option value="">-- กรุณาเลือกชิ้นส่วน --</option>
                  {products.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      [{p.sku}] {p.name} (คงเหลือ: {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ประเภทธุรกรรม</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setStockForm({...stockForm, type: 'IN'})} className={`py-2 text-sm font-bold rounded-xl border transition-all ${stockForm.type === 'IN' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>📥 รับของเข้าสต็อก</button>
                  <button type="button" onClick={() => setStockForm({...stockForm, type: 'OUT'})} className={`py-2 text-sm font-bold rounded-xl border transition-all ${stockForm.type === 'OUT' ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>📤 เบิกไปใช้งาน</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">จำนวนอุปกรณ์ (ชิ้น)</label>
                <input type="number" min={1} required className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none font-bold text-slate-800" value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: Math.max(1, Number(e.target.value))})} />
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t mt-6">
                <button type="button" onClick={() => setShowStockModal(false)} className="px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">ปิดหน้านี้</button>
                <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold">ยืนยันทำรายการ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}