import { MessagesManager } from "@/components/admin/MessagesManager";
import { getAdminMessages } from "@/lib/admin/shop-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMessagesPage() {
  const messages = await getAdminMessages();
  // key forces a fresh client tree when the server payload changes
  return (
    <MessagesManager
      key={`messages-${messages.length}-${messages[0]?.id ?? "empty"}`}
      initialMessages={messages}
    />
  );
}
