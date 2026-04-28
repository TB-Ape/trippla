import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById } from "@/lib/db/trips";
import { prisma } from "@/lib/prisma";
// @ts-ignore
import PDFDocument from "pdfkit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Fetch all trip data in parallel
    const [itinerary, expenses, packing, transport, stages] = await Promise.all([
      prisma.itineraryItem.findMany({
        where: { tripId },
        orderBy: { startTime: "asc" },
      }),
      prisma.expense.findMany({
        where: { tripId },
        orderBy: { date: "desc" },
        include: {
          paidBy: { select: { name: true, email: true } },
          splits: { include: { user: { select: { name: true, email: true } } } },
        },
      }),
      prisma.packingList.findMany({
        where: { tripId },
        include: {
          items: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.transport.findMany({
        where: { tripId },
        orderBy: { order: "asc" },
      }),
      prisma.stage.findMany({
        where: { tripId },
        orderBy: { order: "asc" },
      }),
    ]);

    // Generate PDF
    const pdfBuffer = await generateTripPDF({
      trip,
      itinerary,
      expenses,
      packing,
      transport,
      stages,
    });

    const tripName = trip.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${tripName}_export.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Export PDF error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function generateTripPDF(data: {
  trip: Awaited<ReturnType<typeof getTripById>>;
  itinerary: any[];
  expenses: any[];
  packing: any[];
  transport: any[];
  stages: any[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { trip, itinerary, expenses, packing, transport, stages } = data;
    if (!trip) return reject(new Error("Trip not found"));

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const NAVY       = "#0f172a";
    const TEAL       = "#0d9488";
    const TEAL_LIGHT = "#f0fdfa";
    const TEXT       = "#1e293b";
    const MUTED      = "#64748b";
    const LIGHT      = "#f8fafc";
    const LEFT       = 50;
    const pageWidth  = doc.page.width - 100;

    // ── HEADER ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 115).fill(NAVY);
    doc.rect(0, 0, 5, 115).fill(TEAL);
    doc.fillColor(TEAL).fontSize(28).font("Helvetica-Bold")
      .text(trip.name, 60, 28, { width: pageWidth });
    if (trip.destination) {
      doc.fillColor("#94a3b8").fontSize(11).font("Helvetica")
        .text(trip.destination, 60, 70);
    }
    const dateStr = formatDate(trip.startDate) + (trip.endDate ? `  -  ${formatDate(trip.endDate)}` : "");
    doc.fillColor("#94a3b8").fontSize(9)
      .text(dateStr, doc.page.width - 210, 91, { width: 160, align: "right" });
    doc.y = 135;

    // ── TRIP DETAILS ─────────────────────────────────────────
    drawSectionHeader(doc, "TRIP DETAILS", NAVY, TEAL, LEFT, pageWidth);

    const colW = (pageWidth - 20) / 2;
    const detailItems: [string, string][] = [
      ["Type",         trip.type ? capitalize(trip.type) : "—"],
      ["Currency",     trip.currency || "EUR"],
      ["Members",      trip.members.map((m: any) => m.user.name || m.user.email).join(", ")],
      ["Organized by", trip.owner.name || trip.owner.email],
    ];
    const gridY = doc.y;
    detailItems.forEach(([label, value], i) => {
      const cx = LEFT + (i % 2) * (colW + 20);
      const cy = gridY + Math.floor(i / 2) * 44;
      doc.fillColor(MUTED).fontSize(8).font("Helvetica").text(label.toUpperCase(), cx, cy, { width: colW });
      doc.fillColor(TEXT).fontSize(11).font("Helvetica-Bold").text(value, cx, cy + 13, { width: colW });
    });
    doc.y = gridY + Math.ceil(detailItems.length / 2) * 44 + 8;

    if (trip.description) {
      doc.fillColor(MUTED).fontSize(8).font("Helvetica").text("DESCRIPTION", LEFT);
      doc.moveDown(0.2);
      doc.fillColor(TEXT).fontSize(10).font("Helvetica")
        .text(trip.description, LEFT, doc.y, { width: pageWidth });
      doc.moveDown(0.6);
    }

    // ── ITINERARY ────────────────────────────────────────────
    if (itinerary.length > 0) {
      drawSectionHeader(doc, "ITINERARY", NAVY, TEAL, LEFT, pageWidth);

      let lastDate = "";
      itinerary.forEach((item: any) => {
        const itemDate = formatDate(item.startTime);
        if (itemDate !== lastDate) {
          const dy = doc.y;
          doc.rect(LEFT, dy, pageWidth, 20).fill(TEAL_LIGHT);
          doc.fillColor(TEAL).fontSize(9).font("Helvetica-Bold")
            .text(itemDate.toUpperCase(), LEFT + 8, dy + 5, { width: pageWidth - 16 });
          doc.y = dy + 24;
          lastDate = itemDate;
        }
        doc.fillColor(TEXT).fontSize(11).font("Helvetica-Bold")
          .text(item.title, LEFT + 10, doc.y);
        if (item.location) {
          doc.fillColor(MUTED).fontSize(9).font("Helvetica")
            .text("Location: " + item.location, LEFT + 10, doc.y);
        }
        if (!item.isAllDay) {
          const timeStr = formatDateTime(item.startTime) + (item.endTime ? ` - ${formatDateTime(item.endTime)}` : "");
          doc.fillColor(MUTED).fontSize(9).text("Time: " + timeStr, LEFT + 10, doc.y);
        }
        if (item.description) {
          doc.fillColor(MUTED).fontSize(9)
            .text(item.description, LEFT + 10, doc.y, { width: pageWidth - 20 });
        }
        doc.moveDown(0.5);
      });
    }

    // ── TRANSPORT ────────────────────────────────────────────
    if (transport.length > 0) {
      drawSectionHeader(doc, "TRANSPORT", NAVY, TEAL, LEFT, pageWidth);

      const modeLabel: Record<string, string> = {
        plane: "FLIGHT", train: "TRAIN", bus: "BUS", car: "CAR",
        ferry: "FERRY", bike: "BIKE", walk: "WALK", taxi: "TAXI",
      };

      transport.forEach((t: any) => {
        const label = modeLabel[t.mode] || (t.mode?.toUpperCase() ?? "TRANSPORT");
        doc.fillColor(TEAL).fontSize(9).font("Helvetica-Bold").text(label, LEFT, doc.y);
        doc.fillColor(TEXT).fontSize(11).font("Helvetica-Bold")
          .text(`${t.departureLocation} — ${t.arrivalLocation}`, LEFT, doc.y);
        doc.fillColor(MUTED).fontSize(9).font("Helvetica")
          .text(`${formatDateTime(t.departureTime)}  to  ${formatDateTime(t.arrivalTime)}`, LEFT, doc.y);
        if (t.bookingReference) {
          doc.fillColor(MUTED).fontSize(9).text(`Ref: ${t.bookingReference}`, LEFT, doc.y);
        }
        if (t.cost != null) {
          doc.fillColor(MUTED).fontSize(9).text(`Cost: ${t.cost} ${trip.currency}`, LEFT, doc.y);
        }
        if (t.notes) {
          doc.fillColor(MUTED).fontSize(9).text(t.notes, LEFT, doc.y, { width: pageWidth });
        }
        doc.moveDown(0.6);
      });
    }

    // ── STAGES ───────────────────────────────────────────────
    if (stages.length > 0) {
      drawSectionHeader(
        doc,
        trip.type === "cycling" ? "CYCLING STAGES" : "HIKING STAGES",
        NAVY, TEAL, LEFT, pageWidth
      );

      stages.forEach((s: any) => {
        doc.fillColor(TEAL).fontSize(9).font("Helvetica-Bold")
          .text(`STAGE ${s.order}${s.date ? "   " + formatDate(s.date) : ""}`, LEFT, doc.y);
        doc.fillColor(TEXT).fontSize(12).font("Helvetica-Bold").text(s.title, LEFT, doc.y);
        if (s.startLocation || s.endLocation) {
          doc.fillColor(MUTED).fontSize(9).font("Helvetica")
            .text(`${s.startLocation || "?"} — ${s.endLocation || "?"}`, LEFT, doc.y);
        }
        const statParts = [
          s.distance      ? `${s.distance} km`                                     : null,
          s.elevationGain ? `+${s.elevationGain} m`                                : null,
          s.elevationLoss ? `-${s.elevationLoss} m`                                : null,
          s.difficulty    ? capitalize(s.difficulty)                                : null,
          s.duration      ? `${Math.floor(s.duration / 60)}h ${s.duration % 60}m` : null,
        ].filter(Boolean).join("   |   ");
        if (statParts) {
          const sy = doc.y + 2;
          doc.rect(LEFT, sy, pageWidth, 18).fill(TEAL_LIGHT);
          doc.fillColor(TEAL).fontSize(9).font("Helvetica-Bold")
            .text(statParts, LEFT + 8, sy + 4, { width: pageWidth - 16 });
          doc.y = sy + 22;
        }
        if (s.accommodation) {
          doc.fillColor(MUTED).fontSize(9).font("Helvetica")
            .text(`Stay: ${s.accommodation}`, LEFT, doc.y);
        }
        if (s.description) {
          doc.fillColor(MUTED).fontSize(9)
            .text(s.description, LEFT, doc.y, { width: pageWidth });
        }
        doc.moveDown(0.7);
      });
    }

    // ── EXPENSES ─────────────────────────────────────────────
    if (expenses.length > 0) {
      drawSectionHeader(doc, "EXPENSES", NAVY, TEAL, LEFT, pageWidth);

      const totalAmount = expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount.toString()), 0);
      const totalY = doc.y;
      doc.rect(LEFT, totalY, pageWidth, 26).fill(TEAL);
      doc.fillColor("#ffffff").fontSize(12).font("Helvetica-Bold")
        .text(`Total: ${totalAmount.toFixed(2)} ${trip.currency}`, LEFT + 10, totalY + 7, { width: pageWidth - 20 });
      doc.y = totalY + 32;

      expenses.forEach((e: any, i: number) => {
        const amount = parseFloat(e.amount.toString());
        const paidBy = e.paidBy?.name || e.paidBy?.email || "Unknown";
        const rowY = doc.y;
        if (i % 2 === 0) doc.rect(LEFT, rowY, pageWidth, 30).fill(LIGHT);
        doc.fillColor(TEXT).fontSize(10).font("Helvetica-Bold")
          .text(e.description, LEFT + 8, rowY + 5, { continued: true, width: pageWidth - 100 });
        doc.fillColor(TEAL).font("Helvetica-Bold")
          .text(`${amount.toFixed(2)} ${trip.currency}`, { align: "right" });
        doc.fillColor(MUTED).fontSize(8).font("Helvetica")
          .text(
            `Paid by ${paidBy}  |  ${formatDate(e.date)}  |  ${capitalize(e.category || "other")}`,
            LEFT + 8, rowY + 18, { width: pageWidth - 16 }
          );
        doc.y = rowY + 32;
      });
      doc.moveDown(0.4);
    }

    // ── PACKING LISTS ────────────────────────────────────────
    if (packing.length > 0) {
      drawSectionHeader(doc, "PACKING LISTS", NAVY, TEAL, LEFT, pageWidth);

      packing.forEach((list: any) => {
        doc.fillColor(TEXT).fontSize(12).font("Helvetica-Bold").text(list.name, LEFT, doc.y).moveDown(0.2);
        if (list.items.length === 0) {
          doc.fillColor(MUTED).fontSize(9).text("No items", LEFT + 14, doc.y).moveDown(0.3);
        } else {
          list.items.forEach((item: any) => {
            const qty = item.quantity > 1 ? ` x${item.quantity}` : "";
            const checkY = doc.y;
            doc.rect(LEFT + 10, checkY + 2, 8, 8)
              .lineWidth(0.75)
              .strokeColor(item.isPacked ? TEAL : MUTED)
              .stroke();
            if (item.isPacked) {
              doc.fillColor(TEAL).fontSize(7).font("Helvetica-Bold")
                .text("x", LEFT + 12, checkY + 2, { width: 8, align: "center" });
            }
            doc.fillColor(item.isPacked ? MUTED : TEXT).fontSize(10).font("Helvetica")
              .text(`  ${item.name}${qty}`, LEFT + 24, checkY, { width: pageWidth - 34 });
          });
          doc.moveDown(0.4);
        }
      });
    }

    // ── FOOTER ───────────────────────────────────────────────
    const footerY = doc.page.height - 38;
    doc.rect(0, footerY, doc.page.width, 38).fill(NAVY);
    doc.rect(0, footerY, 5, 38).fill(TEAL);
    doc.fillColor("#64748b").fontSize(8).font("Helvetica")
      .text(
        `Generated by Trippla  |  ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        60, footerY + 13,
        { width: pageWidth }
      );

    doc.end();
  });
}

function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  bgColor: string,
  accentColor: string,
  left: number,
  width: number
) {
  doc.moveDown(0.4);
  const y = doc.y;
  doc.rect(left, y, width, 24).fill(bgColor);
  doc.rect(left, y, 4, 24).fill(accentColor);
  doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold")
    .text(title, left + 12, y + 6, { width: width - 24 });
  doc.y = y + 30;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
