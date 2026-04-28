import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { CURRENT_TERMS_VERSION } from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  termsAccepted: z.literal(true, { message: "You must accept the terms" }),
});

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "strict");
  if (limited) return limited;

  try {
    const body = await req.json();

    // Validate input
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: validatedData.email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user (emailVerified is null by default)
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
      },
    });

    // Create verification token
    const token = await createVerificationToken(validatedData.email);
    console.log("📧 Verification token created for:", validatedData.email);

    // Send verification email
    console.log("📨 Attempting to send verification email to:", validatedData.email);
    const emailResult = await sendVerificationEmail(validatedData.email, token);

    if (!emailResult.success) {
      // If email fails, still return success but log the error
      console.error("❌ Failed to send verification email:", emailResult.error);
    } else {
      console.log("✅ Verification email sent successfully to:", validatedData.email);
    }

    return NextResponse.json(
      {
        message: "Account created! Please check your email to verify your account.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
