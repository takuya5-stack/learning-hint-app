import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";

export default async function ChatPage() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth_token");

  if (!auth || auth.value !== "authenticated") {
    redirect("/");
  }

  return <ChatInterface />;
}
