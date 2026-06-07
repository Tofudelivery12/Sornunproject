"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase'; // ใช้ Path เดิมของคุณ

export default function UnifiedDashboardPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // สถิติสำหรับ Dashboard
  const [stats, setStats] = useState({ total: 0, low: 0, out: 0, totalValue: 0 });

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); 
  
  const [form, setForm] = useState({ 
    name: '', 
    sku: '', 
    category_id: '', 
    price: 0, 
    stock_quantity: 0, 
    image_url: '', 
    supplier_name: '', 
    supplier_link: '',
    supplier_phone: '' 
  });

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({ product_id: '', type: 'IN', quantity: 1 });

  // State สำหรับควบคุมป็อปอัปดูรายละเอียด (Info)
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // State สำหรับพิมพ์ค้นหาชื่ออุปกรณ์ในหน้าต่าง รับเข้า/เบิกจ่าย สต็อกด่วน
  const [stockProductSearch, setStockProductSearch] = useState('');
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);

  // State สำหรับระบบ ตรวจนับสต็อก (Stock Audit)
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditProductSearch, setAuditProductSearch] = useState('');
  const [isAuditDropdownOpen, setIsAuditDropdownOpen] = useState(false);
  const [auditForm, setAuditForm] = useState({
    product_id: '',
    actual_quantity: 0,
    reason: 'ปรับยอดจากการตรวจนับประจำงวด',
    other_reason: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const { data: pData, error: pError } = await supabase.from('products').select('*').order('id', { ascending: false });
      const { data: cData, error: cError } = await supabase.from('categories').select('*').order('name');
      
      if (pError) throw pError;
      if (cError) throw cError;

      if (pData) {
        setProducts(pData);
        const totalProducts = pData.length;
        const lowStock = pData.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 25).length;
        const outOfStock = pData.filter(p => p.stock_quantity === 0).length;
        
        const totalValueSum = pData.reduce((sum, p) => {
          const price = Number(p.price) || 0;
          const qty = Number(p.stock_quantity) || 0;
          return sum + (price * qty);
        }, 0);

        setStats({ 
          total: totalProducts, 
          low: lowStock, 
          out: outOfStock,
          totalValue: totalValueSum 
        });
      }
      if (cData) setCategories(cData);
    } catch (err: any) {
      console.error(err);
      alert(`❌ โหลดข้อมูลเริ่มต้นล้มเหลว: ${err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อหลังบ้าน'}`);
    } finally {
      setLoading(false);
    }
  }

  function openForm(product: any = null) {
    if (product) {
      setEditingId(product.id);
      setForm({ 
        name: product.name, 
        sku: product.sku, 
        category_id: product.category_id || '', 
        price: product.price, 
        stock_quantity: product.stock_quantity, 
        image_url: product.image_url || '', 
        supplier_name: product.supplier_name || '', 
        supplier_link: product.supplier_link || '',
        supplier_phone: product.supplier_phone || '' 
      });
    } else {
      setEditingId(null);
      setForm({ name: '', sku: '', category_id: '', price: 0, stock_quantity: 0, image_url: '', supplier_name: '', supplier_link: '', supplier_phone: '' });
    }
    setShowModal(true);
  }

  function openInfo(product: any) {
    setSelectedProduct(product);
    setShowInfoModal(true);
  }

  // 🔥 จุดแก้ไขหลัก: คัดกรองและปรับ Payload ให้ตรงกับโครงสร้างคอลัมน์ของ Supabase Schema Cache
  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);

      // ดึงฟิลด์ supplier_link แยกออกมา เพื่อป้องกันไม่ให้ส่งไปกวนตาราง products ที่ไม่มีคอลัมน์นี้
      const { supplier_link, ...restForm } = form;

      if (editingId) {
        const payload = { 
          ...restForm, 
          category_id: form.category_id ? Number(form.category_id) : null,
          price: Number(form.price)
        };
        const { error } = await supabase.from('products').update(payload).eq('id', editingId);
        if (error) throw error;
        alert('✅ แก้ไขข้อมูลสินค้าเรียบร้อยแล้วครับ!');
      } else {
        const payload = { 
          ...restForm, 
          category_id: form.category_id ? Number(form.category_id) : null, 
          price: Number(form.price),
          stock_quantity: Number(form.stock_quantity) 
        };
        const { error } = await supabase.from('products').insert([payload]).select();
        if (error) throw error;
        alert('✅ เพิ่มสินค้าชิ้นใหม่เข้าสู่ระบบคลังเรียบร้อยครับน้า!');
      }
      setShowModal(false);
      fetchInitialData();
    } catch (err: any) {
      console.error(err);
      alert(`❌ ไม่สามารถบันทึกข้อมูลได้ เนื่องจากฐานข้อมูลปฏิเสธ:\n👉 [สาเหตุ]: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (confirm('⚠️ คุณแน่ใจใช่ไหมที่จะลบสินค้ารายการนี้ออกจากระบบคลัง?')) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        fetchInitialData();
      } catch (err: any) {
        alert(`❌ ไม่สามารถลบได้: ${err.message}`);
      }
    }
  }

  async function handleStockAdjust(e: React.FormEvent) {
    e.preventDefault();
    const targetId = String(stockForm.product_id).trim();
    if (!targetId || targetId === '' || targetId === '0') {
      alert('❌ กรุณาพิมพ์ค้นหาและเลือกชิ้นส่วนสินค้าจากรายการก่อนทำรายการครับ');
      return;
    }
    const prod = products.find(p => String(p.id).trim() === targetId || p.id === Number(targetId));
    if (!prod) {
      alert(`❌ ไม่พบข้อมูลสินค้าชิ้นนี้ในระบบคลัง`);
      return;
    }
    if (stockForm.type === 'OUT' && prod.stock_quantity < stockForm.quantity) {
      alert(`❌ ของในสต็อกมีไม่พอให้เบิกออกครับ!\n(ในคลังเหลืออยู่ ${prod.stock_quantity} ชิ้น แต่จะเบิกออก ${stockForm.quantity} ชิ้น)`);
      return;
    }

    try {
      setLoading(true);
      // ส่งข้อมูลไปยังตาราง transaction
      const { error } = await supabase.from('stock_transactions').insert([
        { product_id: prod.id, quantity: Number(stockForm.quantity), type: stockForm.type }
      ]);
      if (error) throw error;

      // บันทึกปรับปรุงค่าคงเหลือหน้าบ้านตรงๆ เข้าตาราง products
      const newQty = stockForm.type === 'IN' ? prod.stock_quantity + Number(stockForm.quantity) : prod.stock_quantity - Number(stockForm.quantity);
      await supabase.from('products').update({ stock_quantity: newQty }).eq('id', prod.id);

      alert(`✅ บันทึกรายการ ${stockForm.type === 'IN' ? 'รับเข้า' : 'เบิกจ่าย'} เรียบร้อยครับ!`);
      setShowStockModal(false);
      fetchInitialData();
    } catch (error: any) {
      alert(`❌ เกิดข้อผิดพลาดจากฐานข้อมูล: ${error.message}\n(ตรวจสอบว่าสร้างตาราง stock_transactions ถูกต้องหรือยัง)`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStockAuditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetId = String(auditForm.product_id).trim();

    if (!targetId || targetId === '' || targetId === '0') {
      alert('❌ กรุณาพิมพ์ค้นหาแล้วคลิกเลือกอุปกรณ์ที่ต้องการตรวจนับก่อนครับน้า');
      return;
    }

    const prod = products.find(p => String(p.id).trim() === targetId || p.id === Number(targetId));
    if (!prod) {
      alert('❌ 不พบข้อมูลสินค้าในระบบ กรุณาลองเลือกใหม่อีกครั้งครับ');
      return;
    }

    const currentQty = prod.stock_quantity;
    const actualQty = Number(auditForm.actual_quantity);
    const diff = actualQty - currentQty;

    if (diff === 0) {
      alert('ℹ️ ยอดสต็อกที่น้านับได้ตรงกับในระบบเป๊ะเลยครับ! ไม่จำเป็นต้องส่งปรับยอดคลังครับ');
      setShowAuditModal(false);
      return;
    }

    const finalReason = auditForm.reason === 'อื่นๆ' ? auditForm.other_reason : auditForm.reason;
    if (!finalReason.trim()) {
      alert('❌ กรุณาระบุหมายเหตุหรือเหตุผลในการอัปเดตปรับยอดด้วยครับน้า');
      return;
    }

    const txType = diff > 0 ? 'ADJ_IN' : 'ADJ_OUT';
    const txQuantity = Math.abs(diff);
    const commentMessage = `🔧 [Audit] ยอดระบบเดิมคือ ${currentQty} ชิ้น ➡️ ปรับเป็นนับได้จริง ${actualQty} ชิ้น (เหตุผล: ${finalReason})`;

    const confirmAudit = confirm(`⚠️ ยืนยันแก้ไขปรับปรุงยอดสต็อกสินค้า [${prod.sku}] ${prod.name}?\n\n- ยอดในแอปเดิม: ${currentQty} ชิ้น\n- ยอดที่นับได้จริง: ${actualQty} ชิ้น\n\nข้อมูลถูกต้องชัวร์แล้วใช่ไหมครับ?`);
    if (!confirmAudit) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('stock_transactions').insert([
        { product_id: prod.id, quantity: txQuantity, type: txType, comment: commentMessage }
      ]);

      if (error) throw error;

      // บันทึกปรับปรุงค่าใน products โดยตรง
      await supabase.from('products').update({ stock_quantity: actualQty }).eq('id', prod.id);

      alert("✅ อัปเดตปรับปรุงยอดคลังสินค้าให้ตรงกับความเป็นจริงเรียบร้อยแล้วครับ!");
      setIsAuditDropdownOpen(false);
      setShowAuditModal(false);
      fetchInitialData();
    } catch (err: any) {
      alert(`❌ ปรับปรุงยอดล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // --- ส่วนโค้ด UI ตัวกรองคงเดิมทั้งหมดตามโครงสร้างของคุณ ---
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStockProducts = products.filter(p =>
    p.name.toLowerCase().includes(stockProductSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(stockProductSearch.toLowerCase())
  );

  const filteredAuditProducts = products.filter(p =>
    p.name.toLowerCase().includes(auditProductSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(auditProductSearch.toLowerCase())
  );

  const selectedStockProductDetail = products.find(p => String(p.id) === String(stockForm.product_id));
  const selectedAuditProductDetail = products.find(p => String(p.id) === String(auditForm.product_id));

  return (
    <main className="py-6 space-y-6 max-w-6xl mx-auto px-2">
      {/* 📊 ZONE 1: DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">สินค้าทั้งหมด</p>
            <p className="text-xl md:text-2xl font-extrabold text-slate-800 mt-1">{stats.total} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg hidden sm:flex">📦</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">สต็อกใกล้หมด (≤ 25)</p>
            <p className="text-xl md:text-2xl font-extrabold text-amber-600 mt-1">{stats.low} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg hidden sm:flex">⚠️</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">สินค้าหมดคลัง (0)</p>
            <p className="text-xl md:text-2xl font-extrabold text-red-600 mt-1">{stats.out} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-lg hidden sm:flex">🚨</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between col-span-2 md:col-span-1 bg-gradient-to-br from-white to-emerald-50/30">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">มูลค่ารวมทั้งคลัง</p>
            <p className="text-xl md:text-2xl font-extrabold text-emerald-600 mt-1">{stats.totalValue.toLocaleString()} <span className="text-xs font-normal text-slate-500">บ.</span></p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg hidden sm:flex">💰</div>
        </div>
      </div>

      {/* 🏪 ZONE 2: HEADER CONTROL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">ระบบจัดการคลังสินค้าอัจฉริยะ</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">ภาพรวมคลังอุปกรณ์อิเล็กทรอนิกส์และการควบคุมแบบ Real-time {loading && <span className="text-blue-500 animate-pulse">(กำลังประมวลผล...)</span>}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              if (products.length > 0) {
                setAuditProductSearch('');
                setAuditForm({
                  product_id: String(products[0].id),
                  actual_quantity: products[0].stock_quantity,
                  reason: 'ปรับยอดจากการตรวจนับประจำงวด',
                  other_reason: ''
                });
                setShowAuditModal(true);
              } else {
                alert('กรุณาเพิ่มสินค้าในระบบก่อนทำรายการนับสต็อกครับ');
              }
            }}
            className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            🔍 ตรวจนับสต็อกจริง
          </button>
          
          <button 
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
              <th className="p-4">มูลค่ารวม</th>
              <th className="p-4 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredProducts.map((product) => {
              const matchedCat = categories.find(c => c.id === product.category_id);
              const itemTotalValue = (Number(product.price) || 0) * (Number(product.stock_quantity) || 0);

              return (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-center">
                    <div className="relative w-12 h-12 mx-auto">
                      <img src={product.image_url || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=80&auto=format&fit=crop&q=60'} alt={product.name} className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                      <button 
                        onClick={() => openInfo(product)}
                        title="ดูรายละเอียดข้อมูล"
                        className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white hover:bg-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-colors"
                      >
                        ℹ️
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-slate-800 font-bold block text-base">{product.name}</span>
                    <span className="font-mono text-xs text-slate-400 font-medium">SKU: {product.sku}</span>
                  </td>
                  <td className="p-4">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold">{matchedCat ? matchedCat.name : 'ทั่วไป'}</span>
                  </td>
                  <td className="p-4 font-bold text-slate-600">{Number(product.price).toLocaleString()}.-</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      product.stock_quantity === 0 ? 'bg-red-50 text-red-600' : product.stock_quantity <= 25 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {product.stock_quantity} ชิ้น
                    </span>
                  </td>
                  <td className="p-4 font-extrabold text-slate-800">
                    {itemTotalValue.toLocaleString()} บาท
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button onClick={() => openForm(product)} className="text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all">แก้ไข</button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all">ลบ</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 📱 ZONE 5: MOBILE CARD LAYOUT */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredProducts.map((product) => {
          const matchedCat = categories.find(c => c.id === product.category_id);
          const itemTotalValue = (Number(product.price) || 0) * (Number(product.stock_quantity) || 0);

          return (
            <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
              <div className="flex gap-3 relative">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <img src={product.image_url || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=80&auto=format&fit=crop&q=60'} alt={product.name} className="w-16 h-16 object-cover rounded-xl border border-slate-200 bg-slate-50" />
                  <button 
                    onClick={() => openInfo(product)}
                    className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white hover:bg-blue-600 w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-colors border border-white"
                  >
                    ℹ️
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">{matchedCat ? matchedCat.name : 'ทั่วไป'}</span>
                  <span className="text-slate-800 font-bold block text-sm truncate mt-0.5">{product.name}</span>
                  <span className="font-mono text-xs text-slate-400 block">SKU: {product.sku}</span>
                </div>
              </div>
              
              <div className="bg-slate-50 p-2.5 rounded-xl text-xs font-bold space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">ราคา/หน่วย:</span>
                  <span className="text-slate-800">{Number(product.price).toLocaleString()} บ.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">คงเหลือในคลัง:</span>
                  <span className={`px-1.5 py-0.5 rounded text-[11px] ${product.stock_quantity === 0 ? 'bg-red-100 text-red-600' : product.stock_quantity <= 25 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {product.stock_quantity} ชิ้น
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-1 mt-1 text-sm">
                  <span className="text-slate-600 font-bold">มูลค่าสต็อกรวม:</span>
                  <span className="text-emerald-600 font-extrabold">{itemTotalValue.toLocaleString()} บ.</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => openForm(product)} className="flex-1 bg-blue-50 text-blue-600 font-bold text-xs py-2 rounded-xl border border-blue-100">แก้ไข</button>
                <button onClick={() => handleDelete(product.id)} className="flex-1 bg-red-50 text-red-600 font-bold text-xs py-2 rounded-xl border border-red-100">ลบออก</button>
              </div>
            </div>
          )
        })}
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
              
              {/* ข้อมูลร้านค้าผู้จัดจำหน่าย */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">ข้อมูลผู้จัดจำหน่าย (Supplier Information)</p>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อผู้จัดจำหน่าย</label>
                  <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} placeholder="เช่น บจก. บ้านหม้ออิเล็กทรอนิกส์" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                    <input 
                      type="tel" 
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none" 
                      value={form.supplier_phone} 
                      onChange={e => setForm({...form, supplier_phone: e.target.value})} 
                      placeholder="เช่น 02-123-4567 หรือ 0812345678" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ลิงก์ติดต่อร้านค้า / เว็บไซต์</label>
                    <input type="url" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none" value={form.supplier_link} onChange={e => setForm({...form, supplier_link: e.target.value})} placeholder="https://..." />
                  </div>
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

      {/* 🟠 MODAL: ระบบรับเข้า-เบิกออกสินค้าด่วน */}
      {showStockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
                            setStockForm({ ...stockForm, product_id: String(p.id) });
                            setStockProductSearch('');
                            setIsStockDropdownOpen(false);
                          }}
                        >
                          <span>{p.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">SKU: {p.sku}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-slate-400 text-center">ไม่พบข้อมูลชิ้นส่วนอุปกรณ์นี้</div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ประเภทรายการ</label>
                  <select 
                    className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-sm outline-none font-bold text-slate-700"
                    value={stockForm.type}
                    onChange={e => setStockForm({ ...stockForm, type: e.target.value })}
                  >
                    <option value="IN" className="text-emerald-600">📥 รับสินค้าเข้าคลัง</option>
                    <option value="OUT" className="text-red-600">📤 เบิกสินค้าออก</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">จำนวนชิ้นสินค้า *</label>
                  <input 
                    type="number" 
                    min="1" 
                    required
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm outline-none font-bold" 
                    value={stockForm.quantity} 
                    onChange={e => setStockForm({ ...stockForm, quantity: Number(e.target.value) })} 
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t mt-6">
                <button type="button" onClick={() => setShowStockModal(false)} className="px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">ปิดหน้านี้</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm">บันทึกรายการ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}