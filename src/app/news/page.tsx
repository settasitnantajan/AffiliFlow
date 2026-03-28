import { FacebookEmbed } from "@/components/facebook-embed";

export default function NewsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">ข่าวสาร Shopee Affiliate</h1>
          <p className="text-muted-foreground text-sm">
            อัพเดทจากเพจ Shopee Affiliate Thailand
          </p>
        </div>
        <a
          href="https://www.facebook.com/shopeeaffiliatethailand"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline shrink-0"
        >
          เปิดใน Facebook
        </a>
      </div>
      <FacebookEmbed
        pageUrl="https://www.facebook.com/shopeeaffiliatethailand"
        pageName="Shopee Affiliate Thailand"
      />
    </div>
  );
}
