import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const supabase = createServerSupabase();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Step 2: Products + Commission</h1>
      <Card>
        <CardHeader>
          <CardTitle>Product History</CardTitle>
        </CardHeader>
        <CardContent>
          {products && products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.rank ? (
                        <Badge variant={p.rank <= 3 ? "default" : "secondary"}>
                          #{p.rank}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {p.name}
                    </TableCell>
                    <TableCell>{p.price ? `฿${p.price}` : "-"}</TableCell>
                    <TableCell>
                      {p.commission_rate ? (
                        <span className="text-green-600 font-medium">
                          {p.commission_rate}%
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{p.sales_count ?? "-"}</TableCell>
                    <TableCell>
                      {p.product_url ? (
                        <a
                          href={p.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm"
                        >
                          View
                        </a>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.created_at).toLocaleString("th-TH")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No products yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
