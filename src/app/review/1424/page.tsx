import { notFound } from "next/navigation";
import ChatFlow1424Preview from "./preview";

export const dynamic = "force-dynamic";

export default function ChatFlow1424ReviewPage() {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") notFound();
  return <ChatFlow1424Preview />;
}
