import { checkRateLimit } from "@/lib/rate-limit";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export const GET = handler;

export async function POST(req: Request, context: any) {
  const limited = await checkRateLimit(req, "auth");
  if (limited) return limited;
  return handler(req, context);
}
