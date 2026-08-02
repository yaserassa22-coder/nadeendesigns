import { MessagesManager } from "@/components/admin/MessagesManager";
import { getAdminMessages } from "@/lib/admin/shop-data";

export default async function AdminMessagesPage() {
  const messages = await getAdminMessages();
  return <MessagesManager initialMessages={messages} />;
}
