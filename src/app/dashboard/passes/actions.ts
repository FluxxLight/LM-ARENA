"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";

export async function cancelMockSubscription() {
  const user = await requireUser("/dashboard/passes");
  const provider = getPaymentProvider();
  if (!provider) return { ok: false, message: "Nenhum provedor conectado." };
  const result = await provider.cancelSubscription(user.id);
  revalidatePath("/dashboard/passes");
  return result;
}
