"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // แก้ไข Path ให้ถูกต้องตามโครงสร้างจริงของคุณ

export default function UnifiedDashboardPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // สถิติสำหรับ Dashboard
  const [stats, setStats] = useState({ total: 0, low: 0, out: 0 });

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', category_id: '', price: 0, stock_quantity: 0, image_url: '', supplier_name: '', supplier_link: '' });

  const [showStockModal, setShowStockModal] = useState(false);
  // เซ็ตค่าเริ่มต้นของ product_id เป็น string ว่าง เพื่อรองรับ <option value="">
  const [stockForm, setStockForm] = useState({ product_id: '', type: 'IN', quantity: 1 });

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
    setLoading(false);
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

  async function handleDelete(id: number) {
    if (confirm('⚠️ คุณแน่ใจใช่ไหมที่จะลบสินค้ารายการนี้ออกจากระบบคลัง?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchInitialData();
    }
  }

  async function handleStockAdjust(e: React.FormEvent) {
    e.preventDefault();
    
    if (!stockForm.product_id) {
      alert('❌ กรุณาเลือกชิ้นส่วนสินค้าก่อนทำรายการครับ');
      return;
    }

    // 💡 ไฮไลท์จุดแก้: แปลงทั้งคู่เป็น String ตอนเปรียบเทียบ จะ ID แบบเลขหรือ UUID ก็หาเจอ 100%
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="py-6 space-y-6 max-w-6xl mx-auto px-2">
      
      {/* 📊 ZONE 1: DASHBOARD CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">สินค้าทั้งหมด</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.total} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg">📦</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">สต็อกใกล้หมด (≤ 10)</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.low} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg">⚠️</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">สินค้าหมดคลัง (0)</p>
            <p className="text-2xl font-extrabold text-red-600 mt-1">{stats.out} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-lg">🚨</div>
        </div>
      </div>

      {/* 🏪 ZONE 2: HEADER CONTROL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">ระบบจัดการคลังสินค้าอัจฉริยะ</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">ภาพรวมคลังอุปกรณ์อิเล็กทรอนิกส์และการควบคุมแบบ Real-time</p>
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

      {/* 🔎 ZONE 3: SEARCH BAR */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
        <input 
          type="text" 
          placeholder="🔎 ค้นหาชิ้นส่วนด้วยชื่อ หรือรหัสสินค้า (SKU) ที่นี่..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
        />
      </div>

      {/* 💻 ZONE 4: DESKTOP TABLE */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
              <th className="p-4 text-center">รูป</th>
              <th className="p-4">ชื่อสินค้า / SKU</th>
              <th className="p-4">หมวดหมู่</th>
              <th className="p-4">ราคาหน่วย</th>
              <th className="p-4">คงเหลือ</th>
              <th className="p-4 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-center">
                  <img src={product.image_url || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=80&auto=format&fit=crop&q=60'} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200 mx-auto" />
                </td>
                <td className="p-4">
                  <span className="text-slate-800 font-bold block text-base">{product.name}</span>
                  <span className="font-mono text-xs text-slate-400 font-medium">SKU: {product.sku}</span>
                </td>
                <td className="p-4">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold">{product.categories?.name || 'ทั่วไป'}</span>
                </td>
                <td className="p-4 font-bold text-slate-800">{Number(product.price).toLocaleString()}.-</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    product.stock_quantity === 0 ? 'bg-red-50 text-red-600' : product.stock_quantity <= 10 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {product.stock_quantity} ชิ้น
                  </span>
                </td>
                <td className="p-4 text-center space-x-2">
                  <button onClick={() => openForm(product)} className="text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all">แก้ไข</button>
                  <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all">ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📱 ZONE 5: MOBILE CARD LAYOUT */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
            <div className="flex gap-3">
              <img src={product.image_url || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=80&auto=format&fit=crop&q=60'} alt={product.name} className="w-14 h-14 object-cover rounded-xl border border-slate-200 bg-slate-50" />
              <div className="flex-1 min-w-0">
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">{product.categories?.name || 'ทั่วไป'}</span>
                <span className="text-slate-800 font-bold block text-sm truncate mt-0.5">{product.name}</span>
                <span className="font-mono text-xs text-slate-400 block">SKU: {product.sku}</span>
              </div>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl text-xs font-bold">
              <div className="text-slate-600">ราคา: <span className="text-slate-800">{Number(product.price).toLocaleString()} บ.</span></div>
              <span className={`px-2 py-0.5 rounded ${product.stock_quantity === 0 ? 'bg-red-100 text-red-600' : product.stock_quantity <= 10 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                คลัง: {product.stock_quantity} ชิ้น
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => openForm(product)} className="flex-1 bg-blue-50 text-blue-600 font-bold text-xs py-2 rounded-xl border border-blue-100">แก้ไข</button>
              <button onClick={() => handleDelete(product.id)} className="flex-1 bg-red-50 text-red-600 font-bold text-xs py-2 rounded-xl border border-red-100">ลบออก</button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed text-slate-400 text-sm">
          📭 ไม่พบข้อมูลสินค้าอิเล็กทรอนิกส์ในระบบคลัง
        </div>
      )}

      {/* 🟩 MODAL: เพิ่ม/แก้ไขสินค้า */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">
              {editingId ? '📝 แก้ไขข้อมูลชิ้นส่วนสินค้า' : '✨ เพิ่มสินค้าใหม่เข้าระบบ'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-4 text-slate-700 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อชิ้นส่วนอุปกรณ์ *</label>
                <input type="text" required className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="เช่น IC Regulate 5V" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">รหัสสินค้า (SKU) *</label>
                  <input type="text" required className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="เช่น IC-7805-X" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">หมวดหมู่</label>
                  <select className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:bg-white bg-white font-medium" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                    <option value="">เลือกหมวดหมู่</option>
                    {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ราคาต่อหน่วย (บาท)</label>
                  <input type="number" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:bg-white" value={form.price || ''} onChange={e => setForm({...form, price: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">สต็อกตั้งต้น (ชิ้น)</label>
                  <input type="number" disabled={!!editingId} className="w-full border border-slate-200 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl p-2.5 text-sm outline-none" value={form.stock_quantity || ''} onChange={e => setForm({...form, stock_quantity: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ลิงก์ URL รูปภาพสินค้า</label>
                <input type="url" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none focus:bg-white" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." />
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

      {/* 🟠 MODAL: ระบบรับเข้า-เบิกออกสินค้าด่วน (จุดแก้ไขบรรทัดที่ 300+ เดิม) */}
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
                  {/* รองรับค่าว่างเริ่มต้นเพื่อแก้บั๊ก NaN เมื่อ Products ยังโหลดไม่เสร็จ */}
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