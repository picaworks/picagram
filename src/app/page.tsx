import { Catalog } from "@/components/Catalog";
import { items } from "@/lib/catalog";

/** One page. The selected component lives in the URL hash, so the whole catalog exports as static files. */
export default function Home() {
  return <Catalog items={items} />;
}
