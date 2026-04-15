import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return Response.json([]);
  }

  const data = await prisma.portfolio.findMany({
    where: {
      userId: session.user?.email!,
    },
  });

  return Response.json(data);
}