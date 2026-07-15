import { prisma } from "@/lib/db";

export function getSocialAccountsForBrand(brandId: string) {
  return prisma.socialAccount.findMany({ where: { brandId } });
}
