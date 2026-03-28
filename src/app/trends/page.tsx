import { TrendsContent } from "./trends-content";

export default function TrendsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">เทรนด์สินค้า</h1>
          <p className="text-muted-foreground text-sm">
            ข้อมูลจาก Google Trends — สินค้าที่คนไทยค้นหามากที่สุด
          </p>
        </div>
        <a
          href="https://trends.google.co.th/trending?geo=TH"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline shrink-0"
        >
          เปิด Google Trends
        </a>
      </div>
      <TrendsContent />
    </div>
  );
}
