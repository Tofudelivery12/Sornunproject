"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface Product {
  id: number;
  name: string;
  quantity: number;
  price: number;
  category: string;
}

export default function AlertPage() {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchLowStock() {
      // ดึงเฉพาะสินค้าที่จำนวนต่ำกว่าหรือเท่ากับ 10 ชิ้น
      const { data } = await supabase
        .from('inventory')
        .select('*')
        .lte('quantity', 10)
        .order('quantity', { ascending: true });
        
      if (data) setLowStockProducts(data);
    }
    fetchLowStock();
  }, []);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">⚠️ ระบบแจ้งเตือนสินค้าใกล้หมดคลัง</h1>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-red-100">
        <div className="bg-red-50 p-4 border-b border-red-100">
          <p className="text-red-700 font-medium text-sm">💡 รายการด้านล่างนี้มีจำนวนสต็อกเหลือ 10 ชิ้นหรือน้อยกว่า ควรพิจารณาจัดซื้อเพิ่มเติม</p>
        </div>
        
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-left text-xs uppercase font-semibold border-b">
              <th className="px-5 py-3">ชื่อสินค้า</th>
              <th className="px-5 py-3">หมวดหมู่</th>
              <th className="px-5 py-3">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {lowStockProducts.map(product => (
              <tr key={product.id} className="border-b border-gray-100 bg-red-50/30 hover:bg-red-50/50">
                <td className="px-5 py-4 font-medium text-gray-800">{product.name}</td>
                <td className="px-5 py-4 text-gray-600">{product.category}</td>
                <td className="px-5 py-4">
                  <span className="text-red-600 font-bold bg-red-100 px-2.5 py-1 rounded-full text-xs">
                    ⚠️ {product.quantity} ชิ้น
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {lowStockProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            ✅ ยอดเยี่ยม! ไม่มีสินค้าชิ้นไหนต่ำกว่าเกณฑ์แจ้งเตือนเลย
          </div>
        )}
      </div>
    </main>
  );
}