import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, deleteToken } from "@/lib/tokens";
import { z } from "zod";

const verifySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = verifySchema.parse(body);

    // Verify the token and get the email
    const email = await verifyToken(token);

    if (!email) {
      return NextResponse.json(
        { error: "Invalid or expired verification link" },
        { status: 400 }
      );
    }

    // Update user's emailVerified field
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    // Delete the token
    await deleteToken(token);

    return NextResponse.json(
      { message: "Email verified successfully" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
