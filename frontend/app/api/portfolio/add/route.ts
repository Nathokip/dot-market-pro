import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" });
  }

  const body = await req.json();

  const item = await prisma.portfolio.create({
    data: {
      userId: session.user?.email!,
      symbol: body.symbol,
      quantity: body.quantity,
      price: body.price,
    },
  });

  return Response.json(item);
}