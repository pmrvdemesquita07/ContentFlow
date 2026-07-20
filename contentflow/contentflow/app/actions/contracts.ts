"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import type { ContractStatus, PaymentStatus } from "@/lib/generated/prisma/enums";

function parseDate(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  return str ? new Date(str) : null;
}

export async function createContract(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "Finish onboarding first." };

  const creatorId = String(formData.get("creatorId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);

  if (!creatorId) return { error: "Pick a creator." };
  if (!title) return { error: "Title is required." };
  if (!amountRaw || Number.isNaN(amount) || amount < 0) {
    return { error: "Enter a valid amount." };
  }

  const campaignId = String(formData.get("campaignId") ?? "").trim() || null;

  const contract = await prisma.contract.create({
    data: {
      workspaceId: ctx.workspace.id,
      creatorId,
      campaignId,
      title,
      amount,
      currency: String(formData.get("currency") ?? "EUR").trim() || "EUR",
      startDate: parseDate(formData.get("startDate")),
      endDate: parseDate(formData.get("endDate")),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath("/contracts");
  return { error: undefined, contractId: contract.id };
}

export async function updateContractStatus(contractId: string, status: ContractStatus) {
  await requireUser();
  await prisma.contract.update({ where: { id: contractId }, data: { status } });
  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
}

export async function deleteContract(contractId: string) {
  await requireUser();
  await prisma.contract.delete({ where: { id: contractId } });
  revalidatePath("/contracts");
}

export async function addPayment(
  contractId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireUser();

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    return { error: "Enter a valid amount." };
  }

  await prisma.payment.create({
    data: {
      contractId,
      amount,
      dueDate: parseDate(formData.get("dueDate")),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath(`/contracts/${contractId}`);
  return { error: undefined };
}

export async function updatePaymentStatus(
  paymentId: string,
  contractId: string,
  status: PaymentStatus
) {
  await requireUser();
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status, paidAt: status === "paid" ? new Date() : null },
  });
  revalidatePath(`/contracts/${contractId}`);
}

export async function deletePayment(paymentId: string, contractId: string) {
  await requireUser();
  await prisma.payment.delete({ where: { id: paymentId } });
  revalidatePath(`/contracts/${contractId}`);
}
