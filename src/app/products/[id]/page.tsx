"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProductData() {
      if (!params.id) return;
      const { data } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('id', params.id)
        .single();
      
      if (data) setProduct(data);
      setLoading(false);
    }
    loadProductData();
  }, [params.id]);

  if (loading) return <div className="text-center py-12 text-slate-500">⏳ กำลังสืบค้นข้อมูลชิ้นส่วน...</div>;
  if (!product) return <div className="text-center py-12 text-rose-500">❌ ไม่พบข้อมูลสินค้ารายการนี้ในระบบคลัง</div>;

  return (
    <main className="space-y-6">
      <button onClick={() => router.back()} className="text-slate-600 hover:text-slate-900 text-sm flex items-center gap-1 font-semibold">
        ← ย้อนกลับไปหน้าก่อนหน้า
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-3">
        {/* คอลัมน์ฝั่งซ้าย: รูปภาพสินค้า */}
        <div className="p-6 bg-slate-50 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200">
          <img 
            src={product.image_url || 'https://via.placeholder.com/300?text=No+Image'} 
            alt={product.name} 
            className="max-w-full h-auto max-h-64 object-contain rounded-xl shadow-sm"
          />
        </div>

        {/* คอลัมน์ฝั่งขวา: ข้อมูลทั้งหมด */}
        <div className="p-8 md:col-span-2 space-y-6">
          <div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold uppercase px-2.5 py-1 rounded-full">{product.categories?.name || 'ไม่ได้ระบุหมวดหมู่'}</span>
            <h1 className="text-3xl font-extrabold text-slate-800 mt-2">{product.name}</h1>
            <p className="font-mono text-sm text-slate-400 mt-1">รหัสบาร์โค้ด / SKU: {product.sku}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">ราคาประเมินต่อหน่วย</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{Number(product.price).toLocaleString()} <span className="text-sm font-normal text-slate-500">บาท</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">ปริมาณเหลือในระบบ</p>
              <p className={`text-2xl font-bold mt-0.5 ${product.stock_quantity === 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {product.stock_quantity} <span className="text-sm font-normal text-slate-500">ชิ้น</span>
              </p>
            </div>
          </div>

          {/* ข้อมูลซัพพลายเออร์เจ้าของของสินค้า */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <h3 className="font-bold text-sm text-slate-700">🏪 ข้อมูลผู้จัดจำหน่าย (Supplier Data)</h3>
            <p className="text-sm text-slate-600">ชื่อผู้จำหน่าย: <span className="font-medium text-slate-800">{product.supplier_name || 'ไม่ระบุข้อมูล'}</span></p>
            {product.supplier_link && (
              <a href={product.supplier_link} target="_blank" rel="noreferrer" className="text-xs inline-block text-blue-500 hover:underline font-medium">
                🌐 ลิงก์เชื่อมโยงไปหน้าร้านค้าภายนอก →
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}