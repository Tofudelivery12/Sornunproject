import "./globals.css";
import Navbar from "./Navbar";

export const metadata = {
  title: "ELEC-STOCK Pro",
  description: "ระบบจัดการสต็อกส่วนประกอบอิเล็กทรอนิกส์อัจฉริยะ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-slate-50 min-h-screen font-sans text-slate-900">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 pb-12">{children}</div>
      </body>
    </html>
  );
}