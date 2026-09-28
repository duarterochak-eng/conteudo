import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  redirect("https://instagram.com/kawan.labs");
}
