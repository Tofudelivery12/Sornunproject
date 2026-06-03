"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // ใช้ Path เดิมของคุณ

export default function UnifiedDashboardPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]); // ✨ State เก็บประวัติ
  const [loading, setLoading] = useState(true);

  // สถิติสำหรับ Dashboard
  const [stats, setStats] = useState({ total: 0, low: 0, out: 0 });

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', category_id: '', price: 0, stock_quantity: 0, image_url: '', supplier_name: '', supplier_link: '' });

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({ product_id: '', type: 'IN', quantity: 1 });

  // State สำหรับคุมป็อปอัป "หน้ารายงานของใกล้หมด/หมดคลัง"
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  // State สำหรับพิมพ์ค้นหาชิ้นส่วนในกล่องรับเข้า-เบิกออกด่วน
  const [stockProductSearch, setStockProductSearch] = useState('');
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('products').select('*').order('id', { ascending: false });
      const { data: cData } = await supabase.from('categories').select('*').order('name');
      
      // ✨ แก้ไขจุดที่ 1: สั่งเรียงประวัติการทำรายการตาม 'created_at' จากใหม่ไปเก่า เพื่อไม่ให้สลับกันมั่วครับ
      const { data: tData } = await supabase
        .from('stock_transactions')
        .select(`
          id,
          quantity,
          type,
          created_at,
          product_id,
          products (
            name,
            sku
          )
        `)
        .order('created_at', { ascending: false });
      
      if (pData) {
        setProducts(pData);
        const totalProducts = pData.length;
        const lowStock = pData.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length;
        const outOfStock = pData.filter(p => p.stock_quantity === 0).length;
        setStats({ total: totalProducts, low: lowStock, out: outOfStock });
      }
      if (cData) setCategories(cData);
      if (tData) setTransactions(tData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    const targetId = String(stockForm.product_id).trim();

    if (!targetId || targetId === '') {
      alert('❌ กรุณาเลือกชิ้นส่วนสินค้าจากรายการก่อนทำรายการครับ');
      return;
    }
    
    const prod = products.find(p => String(p.id).trim() === targetId || p.id === Number(targetId));
    
    if (!prod) {
      alert(`❌ ไม่พบข้อมูลสินค้าชิ้นนี้ในระบบคลัง\n(ระบบอ่านค่า ID ที่น้าเลือกได้เป็น: "${targetId}")`);
      return;
    }
    
    if (stockForm.type === 'OUT' && prod.stock_quantity < stockForm.quantity) {
      alert(`❌ ของในสต็อกมีไม่พอให้เบิกออกครับ!\n(ในคลังเหลืออยู่ ${prod.stock_quantity} ชิ้น แต่จะเบิกออก ${stockForm.quantity} ชิ้น)`);
      return;
    }
    
    const { error } = await supabase.from('stock_transactions').insert([
      { product_id: prod.id, quantity: Number(stockForm.quantity), type: stockForm.type }
    ]);

    if (error) {
      alert(`❌ เกิดข้อผิดพลาดจากฐานข้อมูล: ${error.message}`);
      return;
    }
    
    setIsStockDropdownOpen(false);
    setShowStockModal(false);
    fetchInitialData();
  }

  // ✨ แก้ไขจุดที่ 2: เปลี่ยนวิธีล้างประวัติใหม่ ไม่ให้ติดขัดเรื่องข้อมูลแบบ UUID
  async function handleClearHistory() {
    const confirmFirst = confirm("⚠️ น้าแน่ใจไหมครับที่จะล้างประวัติการเบิกและเพิ่มสินค้าทั้งหมด?\n(ข้อมูลประวัติการทำรายการจะหายหมด แต่ยอดสินค้าคงเหลือในคลังจะยังอยู่เหมือนเดิมครับ)");
    if (!confirmFirst) return;

    const confirmSecond = confirm("🚨 ยืนยันอีกครั้งเพื่อความปลอดภัย: การลบนี้ไม่สามารถกู้คืนได้ ยืนยันลบจริงไหมครับน้า?");
    if (!confirmSecond) return;

    try {
      setLoading(true);
      // ใช้เงื่อนไขสร้างการลบที่ปลอดภัยกับคอลัมน์วันเวลา ป้องกัน Error UUID ทับซ้อน
      const { error } = await supabase
        .from('stock_transactions')
        .delete()
        .not('created_at', 'is', null); 

      if (error) {
        alert(`❌ เกิดข้อผิดพลาด: ${error.message}`);
      } else {
        alert("🧹 ล้างประวัติการทำรายการสำเร็จเรียบร้อยแล้วครับน้า!");
        setTransactions([]); 
        await fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setLoading(false);
    }
  }

  // ✨ ฟังก์ชันกดพิมพ์เป็น PDF ดึงเฉพาะส่วนประวัติออกมา
  function handleExportPDF() {
    window.print();
  }

  const reportProducts = products.filter(p => {
    if (filterType === 'OUT') return p.stock_quantity === 0;
    if (filterType === 'LOW') return p.stock_quantity > 0 && p.stock_quantity <= 10;
    return p.stock_quantity <= 10;
  });

  const filteredStockProducts = products.filter(p =>
    p.name.toLowerCase().includes(stockProductSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(stockProductSearch.toLowerCase())
  );

  const selectedStockProductDetail = products.find(p => String(p.id) === String(stockForm.product_id));

  return (
    <main className="py-6 space-y-6 max-w-6xl mx-auto px-2">
      
      {/* 📊 ZONE 1: DASHBOARD CARDS (จะถูกซ่อนเวลาสั่ง Print PDF) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">สินค้าทั้งหมดในสต็อก</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.total} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg">📦</div>
        </div>

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

      {/* 🏪 ZONE 2: HEADER CONTROL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Sornun Stock อัจฉริยะ</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">ระบบควบคุมคลังสินค้าและสรุปรายงานจัดซื้อส่วนตัวของคุณ Sornun</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto print:hidden">
          <button 
            type="button"
            onClick={() => { 
              if(products.length > 0) { 
                setStockProductSearch(''); 
                setStockForm({ product_id: String(products[0].id), type: 'IN', quantity: 1 }); 
                setShowStockModal(true); 
              } else { 
                alert('กรุณาเพิ่มสินค้าในระบบก่อนครับ'); 
              } 
            }} 
            className="flex-1 md:flex-none bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-slate-200"
          >
            🔄 รับ-จ่ายสต็อกด่วน
          </button>
          <button type="button" onClick={() => openForm()} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm">
            ➕ เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      {/* 📋 ZONE 3: พื้นที่หน้าหลักของ Dashboard */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center justify-center min-h-[180px] print:hidden">
        <div className="text-4xl mb-2">📊</div>
        <h3 className="text-base font-bold text-slate-700">ยินดีต้อนรับเข้าสู่ระบบ Sornun Stock</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
          หน้านี้แสดงสถิติสำคัญแบบองค์รวมเพื่อความเป็นระเบียบ หากต้องการจัดการ เพิ่ม ลบ หรือแก้ไขข้อมูล สามารถกดเลือกใช้งานได้จากแท็บเมนู <strong className="text-slate-600">"คลังสินค้า (CRUD)"</strong> ด้านบนได้เลยครับ
        </p>
        {(stats.low > 0 || stats.out > 0) && (
          <button 
            type="button"
            onClick={() => { setFilterType('ALL'); setShowOrderModal(true); }}
            className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            📋 เปิดดูสรุปรายการที่ต้องสั่งของทั้งหมด ({stats.low + stats.out} รายการ)
          </button>
        )}
      </div>

      {/* 📜 ZONE 4: ระบบประวัติเบิกจ่ายและเพิ่มอุปกรณ์ + ออกรายงาน PDF */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 overflow-visible print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              📜 ประวัติการเบิกใช้งานและนำเข้าคลังสินค้า
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 print:hidden">บันทึกข้อมูลธุรกรรมรับเข้า-จ่ายออกสับเปลี่ยนอุปกรณ์ภายในระบบแบบ Real-time</p>
            <p className="text-xs text-slate-500 mt-0.5 hidden print:block">พิมพ์รายงานวันที่: {new Date().toLocaleDateString('th-TH')} เวลา {new Date().toLocaleTimeString('th-TH')}</p>
          </div>
          
          {/* ปุ่มควบคุมประวัติ (จะถูกซ่อนอัตโนมัติเวลาสั่งพิมพ์) */}
          <div className="flex gap-2 w-full sm:w-auto print:hidden">
            <button 
              type="button"
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1"
            >
              📄 ส่งออกรายงาน PDF
            </button>
            <button 
              type="button"
              onClick={handleClearHistory}
              className="flex-1 sm:flex-none text-xs font-bold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1"
            >
              🧹 ล้างประวัติทั้งหมด
            </button>
          </div>
        </div>

        {/* ตารางข้อมูลประวัติ */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl print:border-slate-300">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100 print:bg-slate-100 print:border-slate-300">
              <tr>
                <th className="p-3">วัน-เวลาที่ทำรายการ</th>
                <th className="p-3">ชื่อชิ้นส่วน / SKU</th>
                <th className="p-3 text-center">ประเภท</th>
                <th className="p-3 text-right">จำนวน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 print:divide-slate-300">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400 text-xs">
                    📭 ยังไม่มีข้อมูลประวัติการเพิ่มหรือเบิกสินค้าในระบบคลังตอนนี้
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const prodName = t.products?.name || 'ไม่พบข้อมูลสินค้า (อาจถูกลบไปแล้ว)';
                  const prodSku = t.products?.sku || '-';
                  const formattedDate = new Date(t.created_at).toLocaleString('th-TH', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/40 text-xs transition-colors print:break-inside-avoid">
                      <td className="p-3 font-medium text-slate-500 whitespace-nowrap">
                        {formattedDate} น.
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{prodName}</span>
                        <span className="font-mono text-[10px] text-slate-400">SKU: {prodSku}</span>
                      </td>
                      <td className="p-3 text-center">
                        {t.type === 'IN' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 print:bg-transparent print:text-emerald-800 print:border-none">
                            📥 เพิ่มเข้า
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 font-bold border border-red-100 print:bg-transparent print:text-red-800 print:border-none">
                            📤 เบิกออก
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-800 text-sm">
                        {t.quantity} ชิ้น
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSS ดักการทำงานตอนกด Print PDF (ซ่อนหน้าต่างและ UI ส่วนเกินให้คลีนที่สุด) */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, header, footer, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* ป็อปอัป (Modal): รายงานจัดซื้อ */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-100">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">🛒 สรุปรายการอุปกรณ์ที่ต้องจัดซื้อเติมสต็อก</h3>
                <p className="text-xs text-slate-400 mt-0.5">แสดงเฉพาะรายการที่มีระดับสินค้าวิกฤต</p>
              </div>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">✕</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {reportProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">🎉 สบายใจได้! ไม่มีรายการอุปกรณ์ที่ตรงตามเงื่อนไขนี้เลยครับคลังแน่นๆ</div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                      <tr>
                        <th className="p-3">ชื่อชิ้นส่วน / SKU</th>
                        <th className="p-3 text-center">คงเหลือปัจจุบัน</th>
                        <th className="p-3">ร้านค้า</th>
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
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.stock_quantity === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                              {item.stock_quantity} ชิ้น
                            </span>
                          </td>
                          <td className="p-3">
                            {item.supplier_link ? (
                              <a href={item.supplier_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-bold text-xs">
                                🛒 {item.supplier_name || 'ลิงก์ไปสั่งซื้อของ'} <span className="text-[10px]">↗</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-xs">{item.supplier_name ? `🏪 ${item.supplier_name}` : 'ไม่ได้ระบุข้อมูลร้าน'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-slate-50 rounded-b-2xl flex justify-end">
              <button onClick={() => setShowOrderModal(false)} className="bg-slate-800 text-white hover:bg-slate-900 px-5 py-2 rounded-xl font-bold text-xs transition-colors">ปิดหน้ารายงาน</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: เพิ่ม/แก้ไขสินค้า */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">{editingId ? '📝 แก้ไขข้อมูลชิ้นส่วนสินค้า' : '✨ เพิ่มสินค้าใหม่เข้าระบบ'}</h3>
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

      {/* MODAL: ระบบรับเข้า-เบิกออกสินค้าด่วน */}
      {showStockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 overflow-visible">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">🔄 หน้าทำรายการ รับเข้า / เบิกจ่ายคลัง</h3>
            <form onSubmit={handleStockAdjust} className="space-y-4 text-slate-700 text-left">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">เลือกหรือพิมพ์ค้นหาชิ้นส่วนสินค้า *</label>
                <div 
                  className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-sm flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
                  onClick={() => setIsStockDropdownOpen(!isStockDropdownOpen)}
                >
                  <input 
                    type="text"
                    className="w-full bg-transparent outline-none font-medium text-slate-800 placeholder-slate-400"
                    placeholder="🔍 พิมพ์ชื่อชิ้นส่วน หรือ รหัส SKU..."
                    value={stockProductSearch}
                    onChange={(e) => {
                      setStockProductSearch(e.target.value);
                      setIsStockDropdownOpen(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-slate-400 text-xs ml-2">🔽</span>
                </div>

                {selectedStockProductDetail && (
                  <p className="text-xs font-bold text-blue-600 mt-1 bg-blue-50/70 px-2 py-1 rounded-lg inline-block">
                    🎯 เลือกอยู่: [{selectedStockProductDetail.sku}] {selectedStockProductDetail.name} (คงเหลือ: {selectedStockProductDetail.stock_quantity} ชิ้น)
                  </p>
                )}

                {isStockDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-50">
                    {filteredStockProducts.length > 0 ? (
                      filteredStockProducts.map(p => (
                        <div 
                          key={p.id}
                          className={`p-2.5 text-xs font-medium cursor-pointer transition-colors text-left flex justify-between items-center ${
                            String(stockForm.product_id) === String(p.id) ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            setStockForm({...stockForm, product_id: String(p.id)});
                            setStockProductSearch('');
                            setIsStockDropdownOpen(false);
                          }}
                        >
                          <div>
                            <span className="font-mono text-slate-400 block text-[10px]">SKU: {p.sku}</span>
                            <span className="text-slate-900 font-bold text-sm block">{p.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded font-bold ${p.stock_quantity === 0 ? 'bg-red-50 text-red-600':'bg-slate-100 text-slate-600'}`}>
                            คลัง: {p.stock_quantity}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">❌ ไม่พบชื่อสินค้าอุปกรณ์ชิ้นนี้ในคลัง</div>
                    )}
                  </div>
                )}
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
                <button 
                  type="button" 
                  onClick={() => {
                    setIsStockDropdownOpen(false);
                    setShowStockModal(false);
                  }} 
                  className="px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  ปิดหน้านี้
                </button>
                <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold">ยืนยันทำรายการ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}