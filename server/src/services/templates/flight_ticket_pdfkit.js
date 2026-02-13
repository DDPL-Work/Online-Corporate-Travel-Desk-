"use strict";

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const axios = require("axios");

// ─── COLOR PALETTE ────────────────────────────────────────────────────────────
const C = {
  primary: "#1a3a5c",
  accent: "#e85d04",
  accent2: "#f48c06",
  bg: "#f0f4f8",
  card: "#ffffff",
  border: "#cdd8e3",
  text: "#1e293b",
  muted: "#64748b",
  dark: "#1e293b",
  navyD: "#1e4976",
  redD: "#c0392b",
  redL: "#e74c3c",
  white: "#ffffff",
};

// ─── PAGE CONSTANTS ───────────────────────────────────────────────────────────
const PW = 595.28; // A4 width  (pt)
const PH = 841.89; // A4 height (pt)
const M = 28; // margin
const CW = PW - M * 2; // content width  539.28

// ─── DATE/TIME HELPERS ────────────────────────────────────────────────────────
const fmtLong = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
const fmtShort = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const fmtDow = (d) =>
  new Date(d).toLocaleDateString("en-GB", { weekday: "short" });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
const fmtDur = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

// ─── LOW-LEVEL HELPERS ────────────────────────────────────────────────────────

function fillR(doc, x, y, w, h, r, fill) {
  doc.save().roundedRect(x, y, w, h, r).fill(fill).restore();
}

function strokeR(doc, x, y, w, h, r, stroke, lw = 0.8) {
  doc.save().roundedRect(x, y, w, h, r).lineWidth(lw).stroke(stroke).restore();
}

function fillStrokeR(doc, x, y, w, h, r, fill, stroke, lw = 0.8) {
  doc
    .save()
    .roundedRect(x, y, w, h, r)
    .lineWidth(lw)
    .fillAndStroke(fill, stroke)
    .restore();
}

function hLine(doc, x1, x2, y, color = C.border, lw = 0.8) {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke(color).restore();
}

function hDash(doc, x1, x2, y, color = C.border, lw = 0.8) {
  doc
    .save()
    .moveTo(x1, y)
    .lineTo(x2, y)
    .lineWidth(lw)
    .dash(4, { space: 3 })
    .stroke(color)
    .undash()
    .restore();
}

function drawBarcode(doc, x, y, w, h) {
  fillR(doc, x, y, w, h, 4, C.dark);
  const pat = [
    1, 3, 1, 2, 1, 1, 3, 1, 2, 1, 1, 3, 1, 2, 1, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1,
    3, 1, 2, 1, 1, 3, 1, 2, 1, 3, 1, 1, 2, 1, 3, 1, 2,
  ];
  let cx = x + 6;
  const maxX = x + w - 6;
  for (const bw of pat) {
    if (cx + bw > maxX) break;
    fillR(doc, cx, y + 5, bw, h - 10, 0, C.white);
    cx += bw + 2;
  }
}

function prohibCircle(doc, cx, cy, r) {
  doc.save().circle(cx, cy, r).lineWidth(1.4).stroke(C.redL).restore();
  const a = Math.PI / 4;
  doc
    .save()
    .moveTo(cx - r * Math.cos(a), cy - r * Math.sin(a))
    .lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
    .lineWidth(1.4)
    .stroke(C.redL)
    .restore();
}

function drawChip(doc, x, y, label, bg = C.bg, tc = C.primary, bc = C.border) {
  const tw = doc.font("Helvetica-Bold").fontSize(7.5).widthOfString(label);
  const cw = tw + 16;
  fillStrokeR(doc, x, y, cw, 16, 4, bg, bc, 0.7);
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(tc)
    .text(label, x + 8, y + 4.5, { lineBreak: false });
  return cw + 6;
}

function secHeading(doc, x, y, label) {
  fillR(doc, x, y, 3, 14, 1.5, C.accent);
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(C.primary)
    .text(label.toUpperCase(), x + 9, y + 2, {
      lineBreak: false,
      characterSpacing: 0.8,
    });
}

async function fetchAirlineLogoBuffer(code) {
  try {
    if (!code) return null;

    const url = `https://images.kiwi.com/airlines/64x64/${code}.png`;

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 5000,
    });

    return Buffer.from(response.data);
  } catch (err) {
    console.log("Airline logo fetch failed:", err.message);
    return null;
  }
}

// ─── MAIN FUNCTION ────────────────────────────────────────────────────────────

/**
 * @param {Object} booking      – Full MongoDB booking document
 * @param {string} journeyType  – "onward" | "return"
 * @param {string} outputDir    – Directory to save PDF
 * @returns {Promise<string>}   – Resolved filepath
 */
async function generateFlightTicketPdfKit({
  booking,
  journeyType = "onward",
  outputDir = ".",
}) {
  return new Promise(async (resolve, reject) => {
    try {
      // ══════════════════════════════════════════════════════════════
      // A. EXTRACT & DERIVE ALL DATA FROM BOOKING DOCUMENT
      // ══════════════════════════════════════════════════════════════

      const segment =
        booking.flightRequest.segments.find(
          (s) => s.journeyType === journeyType,
        ) || booking.flightRequest.segments[0];

      const passenger =
        booking.travellers.find((t) => t.isLeadPassenger) ||
        booking.travellers[0];

      // PNR
      const pnr =
        journeyType === "return"
          ? booking.bookingResult?.returnPNR || "—"
          : booking.bookingResult?.onwardPNR ||
            booking.bookingResult?.pnr ||
            "—";

      // E-Ticket / TBO Conf No
      const eTicket =
        booking.bookingResult?.providerResponse?.Response?.Response
          ?.FlightItinerary?.TBOConfNo ||
        pnr ||
        "—";

      // Total amount paid
      const totalAmount =
        booking.pricingSnapshot?.totalAmount ||
        booking.pricing?.totalAmount ||
        booking.bookingResult?.providerResponse?.Response?.Response
          ?.FlightItinerary?.Fare?.PublishedFare ||
        "—";

      // SSR – seat
      const seatNo =
        booking.flightRequest?.ssrSnapshot?.seats?.[0]?.seatNo || "—";

      // SSR – meal
      const hasMeal =
        booking.flightRequest?.fareQuote?.Results?.[0]?.IsFreeMealAvailable;
      const mealOption = hasMeal ? "Complimentary" : "—";

      // SSR – wheelchair (check Ssr array in passenger or ssrSnapshot)
      const ssrList =
        booking.bookingResult?.providerResponse?.Response?.Response
          ?.FlightItinerary?.Passenger?.[0]?.Ssr || [];
      const hasWheelchair = ssrList.some((s) =>
        /wheel/i.test(JSON.stringify(s)),
      );

      // Baggage
      const checkInBag = segment.baggage?.checkIn || "15 Kgs (1 piece)";
      const cabinBag = segment.baggage?.cabin || "7 Kgs";

      // Fare type & cabin
      const fareType =
        booking.flightRequest?.fareQuote?.Results?.[0]?.ResultFareType ||
        booking.bookingSnapshot?.fareType ||
        "Regular Fare";
      const cabinMap = {
        1: "First",
        2: "Economy",
        3: "Premium Economy",
        4: "Business",
      };
      const cabinClass =
        cabinMap[segment.cabinClass] ||
        booking.bookingSnapshot?.cabinClass ||
        "Economy";

      // Non-stop
      const isNonStop = !segment.stopOver;

      // Formatted values
      const passengerName =
        `${passenger.title.toUpperCase()}. ${passenger.firstName} ${passenger.lastName}`.toUpperCase();
      const originCity = segment.origin.city;
      const destCity = segment.destination.city;
      const originCode = segment.origin.airportCode;
      const destCode = segment.destination.airportCode;
      const originAirport =
        segment.origin.airportName +
        (segment.origin.terminal ? ` T${segment.origin.terminal}` : "");
      const destAirport =
        segment.destination.airportName +
        (segment.destination.terminal
          ? ` T${segment.destination.terminal}`
          : "");
      const depTime = fmtTime(segment.departureDateTime);
      const arrTime = fmtTime(segment.arrivalDateTime);
      const depDate = `${fmtDow(segment.departureDateTime)}, ${fmtShort(segment.departureDateTime)}`;
      const arrDate = `${fmtDow(segment.arrivalDateTime)}, ${fmtShort(segment.arrivalDateTime)}`;
      const duration = fmtDur(segment.durationMinutes);
      const flightNum = `${segment.airlineCode}-${segment.flightNumber}`;
      const airlineName = segment.airlineName.toUpperCase();
      const airlineLogoBuffer = await fetchAirlineLogoBuffer(
        segment.airlineCode,
      );
      const downloadDate = fmtLong(new Date());
      const bookingDate = fmtShort(booking.createdAt);

      const fareBreakup =
        booking.bookingResult?.providerResponse?.Response?.Response
          ?.FlightItinerary?.Fare;

      const baseFare = Number(fareBreakup?.BaseFare || 0);
      const tax = Number(fareBreakup?.Tax || 0);
    //   const yqTax = Number(fareBreakup?.YQTax || 0);
    //   const otherCharges = Number(fareBreakup?.OtherCharges || 0);
    //   const serviceFee = Number(fareBreakup?.ServiceFee || 0);
      const seatCharges = Number(
        booking.flightRequest?.ssrSnapshot?.totalSeatAmount || 0,
      );
      const mealCharges = Number(
        booking.flightRequest?.ssrSnapshot?.totalMealAmount || 0,
      );

      const grandTotal =
        baseFare +
        tax +
        // yqTax +
        // otherCharges +
        // serviceFee +
        seatCharges +
        mealCharges;

      // ══════════════════════════════════════════════════════════════
      // B. CREATE PDF DOCUMENT
      // ══════════════════════════════════════════════════════════════

      const filename = `ticket-${booking.bookingReference}-${randomUUID()}.pdf`;
      const filepath = path.join(outputDir, filename);

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: M, bottom: M, left: M, right: M },
        info: {
          Title: `Flight Ticket – ${originCity} to ${destCity}`,
          Author: "TravelPortal",
          Subject: `Booking ${booking.bookingReference}`,
        },
      });

      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // ── PAGE BACKGROUND ──
      fillR(doc, 0, 0, PW, PH, 0, C.bg);

      let Y = M;

      // ══════════════════════════════════════════════════════════════
      // 1. DATE LINE
      // ══════════════════════════════════════════════════════════════
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(C.muted)
        .text(downloadDate, M, Y, { lineBreak: false });
      Y += 16;

      // ══════════════════════════════════════════════════════════════
      // 2. TOP HEADER — Brand LEFT  |  Ticket Info RIGHT
      // ══════════════════════════════════════════════════════════════

      // "my" orange pill
      fillR(doc, M, Y, 24, 17, 3, C.accent);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(C.white)
        .text("CTD", M + 4, Y + 4, { lineBreak: false });

      // "Partner" + "by MakeMyTrip"
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor(C.primary)
        .text("Partner", M + 30, Y, { lineBreak: false });
      doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor(C.muted)
        .text("by Corporate Travel Desk", M + 30, Y + 14, { lineBreak: false });

      // Right: "Flight Ticket (One way)"
      const rightW = 220;
      const rightX = PW - M - rightW;
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(C.primary)
        .text("Flight E-Ticket", rightX, Y, {
          width: rightW,
          align: "right",
          lineBreak: false,
        });
      // "(One way)" suffix — measure and place inline
      const ftW = doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .widthOfString("Flight E-Ticket");
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(C.muted)
        .text(
          " (One way)",
          rightX +
            rightW -
            doc.font("Helvetica").fontSize(8).widthOfString(" (One way)"),
          Y - 7,
          { lineBreak: false },
        );

      // Booking ID line
      // Booking ID + Date (clean single-line right aligned)
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(C.muted)
        .text(`Booking ID: `, rightX, Y + 16, { lineBreak: false });

      const labelWidth = doc.widthOfString("Booking ID: ");

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(C.accent)
        .text(booking.bookingReference, rightX + labelWidth, Y + 16, {
          lineBreak: false,
        });

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(C.muted)
        .text(
          `   (Booked on ${bookingDate})`,
          rightX + labelWidth + doc.widthOfString(booking.bookingReference),
          Y + 16,
        );

      Y += 34;

      // ══════════════════════════════════════════════════════════════
      // 3. BARCODE CARD
      // ══════════════════════════════════════════════════════════════
      const bcCardH = 72;
      fillStrokeR(doc, M, Y, CW, bcCardH, 8, C.card, C.border, 1.2);

      // Journey label row
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(C.muted)
        .text("Barcode(s) for your journey ", M + 14, Y + 12, {
          lineBreak: false,
        });
      let lx =
        M +
        14 +
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .widthOfString("Barcode(s) for your journey ");
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(C.primary)
        .text(`${originCity}–${destCity}`, lx, Y + 12, { lineBreak: false });
      lx += doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .widthOfString(`${originCity}–${destCity}`);
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(C.muted)
        .text(" on ", lx, Y + 12, { lineBreak: false });
      lx += doc.font("Helvetica").fontSize(8.5).widthOfString(" on ");
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(C.accent)
        .text(airlineName, lx, Y + 12, { lineBreak: false });

      // Passenger name
      //   doc.font("Helvetica-Bold").fontSize(11).fillColor(C.text)
      //      .text(passengerName.toLowerCase(), M + 14, Y + 32, { lineBreak: false });
      //   doc
      //     .font("Helvetica-Bold")
      //     .fontSize(16) // Increased from 11 → 16
      //     .fillColor(C.primary)
      //     .text(passengerName, M + 14, Y + 30, { lineBreak: false });

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(C.muted)
        .text("Passenger", M + 14, Y + 20);

      doc
        .font("Helvetica-Bold")
        .fontSize(17)
        .fillColor(C.primary)
        .text(passengerName, M + 14, Y + 32);

      // Barcode
      drawBarcode(doc, PW - M - 128, Y + 16, 114, 38);

      Y += bcCardH + 12;

      // ══════════════════════════════════════════════════════════════
      // 4. BOOKING DETAILS HEADING
      // ══════════════════════════════════════════════════════════════
      secHeading(doc, M, Y, "Booking Details");
      Y += 22;

      // Route big title
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor(C.primary)
        .text(`${originCity} – ${destCity}`, M, Y, { lineBreak: false });
      Y += 22;

      // Route sub-line: date • stop type • duration
      let sx = M;
      const subStr1 = `${depDate} ${new Date(segment.departureDateTime).getFullYear()} • `;
      const subStr2 = isNonStop ? "Non stop" : "Connecting";
      const subStr3 = ` • ${duration} duration`;
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(C.muted)
        .text(subStr1, sx, Y, { lineBreak: false });
      sx += doc.font("Helvetica").fontSize(8.5).widthOfString(subStr1);
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(C.accent2)
        .text(subStr2, sx, Y, { lineBreak: false });
      sx += doc.font("Helvetica-Bold").fontSize(10).widthOfString(subStr2);
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(C.muted)
        .text(subStr3, sx, Y, { lineBreak: false });
      Y += 14;

      // ══════════════════════════════════════════════════════════════
      // 5. MAIN TICKET CARD
      // ══════════════════════════════════════════════════════════════
      const tcardY = Y;
      const tblRowsH = booking.travellers.length * 26;
      const tcardH =
        42 + 90 + 26 + 26 + 14 + 14 + tblRowsH + (hasWheelchair ? 42 : 8);
      fillStrokeR(doc, M, tcardY, CW, tcardH, 8, C.card, C.border, 1.2);

      // ── 5a. AIRLINE STRIP ──
      const stripH = 42;
      doc.save().roundedRect(M, tcardY, CW, stripH, 8).clip();
      fillR(doc, M, tcardY, CW, stripH, 0, C.primary);
      doc.restore();

      // Airline code pill
      // Airline Logo
      if (airlineLogoBuffer) {
        doc.image(airlineLogoBuffer, M + 12, tcardY + 8, {
          width: 28,
          height: 28,
        });
      } else {
        // fallback to code if image fails
        fillR(doc, M + 12, tcardY + 12, 28, 14, 3, C.accent);
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(C.white)
          .text(segment.airlineCode, M + 14, tcardY + 15);
      }

      // Airline name + flight number
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(C.white)
        .text(airlineName, M + 50, tcardY + 12, { lineBreak: false });
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("rgba(255,255,255,0.55)")
        .text(flightNum, M + 46, tcardY + 22, { lineBreak: false });

      // PNR
      fillR(doc, M + 200, tcardY + 12, 26, 14, 3, C.accent);
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C.white)
        .text("PNR", M + 202, tcardY + 15, { lineBreak: false });
      fillR(doc, M + 230, tcardY + 11, 64, 16, 3, C.white);
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(C.primary)
        .text(pnr, M + 234, tcardY + 14, {
          lineBreak: false,
          characterSpacing: 1.5,
        });

      // ── 5b. FLIGHT TIMES SECTION ──
      const tY = tcardY + stripH + 10;

      // LEFT — Origin
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(C.primary)
        .text(originCity, M + 12, tY, { lineBreak: false });
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(originCode, M + 12, tY + 14, { lineBreak: false });
      doc
        .font("Helvetica-Bold")
        .fontSize(26)
        .fillColor(C.primary)
        .text(depTime, M + 12, tY + 22, { lineBreak: false });
      //   doc
      //     .font("Helvetica")
      //     .fontSize(7)
      //     .fillColor(C.muted)
      //     .text(
      //       "hrs",
      //       M +
      //         12 +
      //         doc.font("Helvetica-Bold").fontSize(26).widthOfString(depTime) +
      //         3,
      //       tY + 34,
      //       { lineBreak: false },
      //     );

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(depDate, M + 12, tY + 46, { lineBreak: false });
      doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor(C.muted)
        .text(originAirport, M + 12, tY + 57, { width: 140, lineBreak: true });

      // CENTER — Route line
      const midX = PW / 2;
      const lineY2 = tY + 32;
      const dotR = 4;
      const leftLineEnd = M + 158;
      const rightLineStart = M + CW - 158;

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(C.muted)
        .text(duration, midX - 35, tY + 2, { width: 70, align: "center" });

      // Left dot
      doc
        .save()
        .circle(leftLineEnd, lineY2, dotR)
        .lineWidth(1.5)
        .stroke(C.accent)
        .restore();
      // Left line
      hLine(doc, leftLineEnd + dotR, midX - 14, lineY2, C.accent, 1.2);
      // Plane circle (orange)
      fillR(doc, midX - 13, lineY2 - 7, 26, 14, 7, C.accent);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(C.white)
        .text("✈", midX - 8, lineY2 - 5, { lineBreak: false });
      // Right line
      hLine(doc, midX + 13, rightLineStart - dotR, lineY2, C.accent, 1.5);
      // Right dot
      doc
        .save()
        .circle(rightLineStart, lineY2, dotR)
        .lineWidth(1.5)
        .stroke(C.accent)
        .restore();

      const stopLabel = isNonStop ? "NON STOP" : "1 STOP";

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(C.accent)
        .text(stopLabel, midX - 40, lineY2 + 12, {
          width: 80,
          align: "center",
        });

      // RIGHT — Destination
      const rCol = PW - M - 12;
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(C.primary)
        .text(destCity, M + CW - 152, tY, {
          width: 140,
          align: "right",
          lineBreak: false,
        });
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(destCode, M + CW - 152, tY + 14, {
          width: 140,
          align: "right",
          lineBreak: false,
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(26)
        .fillColor(C.primary)
        .text(arrTime, M + CW - 152, tY + 22, {
          width: 140,
          align: "right",
          lineBreak: false,
        });
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(arrDate, M + CW - 152, tY + 46, {
          width: 140,
          align: "right",
          lineBreak: false,
        });
      doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor(C.muted)
        .text(destAirport, M + CW - 152, tY + 57, {
          width: 140,
          align: "right",
          lineBreak: true,
        });

      // ── 5c. DASHED DIVIDER 1 ──
      const div1Y = tcardY + stripH + 96;
      hDash(doc, M + 8, M + CW - 8, div1Y);

      // ── 5d. FARE CHIPS ──
      const chipRowY = div1Y + 8;
      let chipX2 = M + 12;
      chipX2 += drawChip(doc, chipX2, chipRowY, fareType);
      chipX2 += drawChip(doc, chipX2, chipRowY, cabinClass);
      drawChip(doc, chipX2, chipRowY, "Armed Forces Fare");

      // ── 5e. BAGGAGE ROW ──
      const bagRowY = chipRowY + 24;
      // Check-in bag
      fillR(doc, M + 12, bagRowY + 1, 9, 8, 1, C.accent);
      fillR(doc, M + 15, bagRowY - 1, 3, 3, 1, C.accent);
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C.primary)
        .text("Check-in:", M + 26, bagRowY + 2, { lineBreak: false });
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.text)
        .text(
          ` ${checkInBag} per Adult`,
          M +
            26 +
            doc.font("Helvetica-Bold").fontSize(7.5).widthOfString("Check-in:"),
          bagRowY + 2,
          { lineBreak: false },
        );
      // Cabin bag
      fillR(doc, M + 230, bagRowY + 1, 9, 8, 1, C.accent2);
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C.primary)
        .text("Cabin:", M + 244, bagRowY + 2, { lineBreak: false });
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.text)
        .text(
          ` ${cabinBag} per Adult`,
          M +
            244 +
            doc.font("Helvetica-Bold").fontSize(7.5).widthOfString("Cabin:"),
          bagRowY + 2,
          { lineBreak: false },
        );

      // ── 5f. DASHED DIVIDER 2 ──
      const div2Y = bagRowY + 20;
      hDash(doc, M + 8, M + CW - 8, div2Y);

      // ── 5g. TRAVELLER TABLE HEADER ──
      const thY = div2Y + 8;
      const cols = [M + 12, M + 220, M + 300, M + 370];
      ["TRAVELLER", "SEAT", "MEAL", "E-TICKET NO"].forEach((h, i) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor(C.muted)
          .text(h, cols[i], thY, { lineBreak: false, characterSpacing: 0.5 });
      });

      // ── 5h. TRAVELLER ROWS (dynamic — all travellers) ──
      let trY = thY + 14;
      booking.travellers.forEach((t) => {
        const tName =
          `${t.title.toUpperCase()}. ${t.firstName} ${t.lastName}`.toUpperCase();
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(C.primary)
          .text(tName, cols[0], trY, { lineBreak: false });
        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor(C.muted)
          .text("Adult", cols[0], trY + 12, { lineBreak: false });
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(C.text)
          .text(seatNo, cols[1], trY, { lineBreak: false });
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(C.text)
          .text(mealOption, cols[2], trY, { lineBreak: false });
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(C.accent)
          .text(eTicket, cols[3], trY, {
            lineBreak: false,
            characterSpacing: 0.8,
          });
        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor(C.muted)
          .text(pnr, cols[3], trY + 12, { lineBreak: false });
        trY += 26;
      });

      // ── 5i. WHEELCHAIR / SSR NOTICE (only if applicable) ──
      if (hasWheelchair) {
        const wcY = trY + 4;
        fillR(doc, M + 8, wcY, CW - 16, 34, 5, "#fff8f3");
        doc
          .save()
          .moveTo(M + 8, wcY)
          .lineTo(M + 8, wcY + 34)
          .lineWidth(2.5)
          .stroke(C.accent)
          .restore();
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(C.text)
          .text(
            "♿  Wheelchair request has been accepted* by the airline.",
            M + 16,
            wcY + 5,
            { lineBreak: false },
          );
        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor(C.muted)
          .text(
            "*Please note, there is a chance that airline may refuse to acknowledge this request at the airport even after acceptance (due to unavailability at the airport). For further information in all such cases, please get in touch with the airline directly.",
            M + 16,
            wcY + 18,
            { width: CW - 30, lineBreak: true },
          );
      }

      Y = tcardY + tcardH + 12;

      // ══════════════════════════════════════════════════════════════
      // 6. PAYMENT BREAKDOWN
      // ══════════════════════════════════════════════════════════════

      const payCardH = 120;
      fillStrokeR(doc, M, Y, CW, payCardH, 8, C.card, C.border, 1.2);

      secHeading(doc, M + 12, Y + 10, "Payment Summary");

      let payY = Y + 32;

      const fareRows = [
        ["Base Fare", baseFare],
        ["Tax", tax],
        // ["YQ Tax", yqTax],
        // ["Other Charges", otherCharges],
        // ["Service Fee", serviceFee],
        ["Seat Charges", seatCharges],
        ["Meal Charges", mealCharges],
      ];

      fareRows.forEach(([label, amount]) => {
        if (!amount) return;

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(C.text)
          .text(label, M + 20, payY);

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(C.text)
          .text(`INR ${amount.toFixed(2)}`, PW - M - 100, payY, {
            width: 80,
            align: "right",
          });

        payY += 14;
      });

      // Divider
      hLine(doc, M + 20, PW - M - 20, payY);
      payY += 8;

      // Grand Total
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(C.primary)
        .text("Grand Total", M + 20, payY);

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(C.primary)
        .text(`INR ${grandTotal.toFixed(2)}`, PW - M - 100, payY, {
          width: 80,
          align: "right",
        });

      Y += payCardH + 12;

      // ══════════════════════════════════════════════════════════════
      // 7. PROHIBITED ITEMS SECTION
      // ══════════════════════════════════════════════════════════════
      const icCardH = 110;
      fillStrokeR(doc, M, Y, CW, icCardH, 8, C.card, C.border, 1.2);

      const leftColW = CW - 116;

      // Red "NOT ALLOWED" header
      fillR(doc, M + 8, Y + 8, leftColW - 16, 17, 4, C.redD);
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C.white)
        .text("Items not allowed in the aircraft", M + 8, Y + 13, {
          width: leftColW - 16,
          align: "center",
          lineBreak: false,
        });

      // Two rows of prohibited items
      const prohibited = [
        [
          "Lighters,\nMatchsticks",
          "Flammable\nLiquids",
          "Toxic",
          "Corrosives",
          "Pepper\nSpray",
        ],
        [
          "Flammable\nGas",
          "E-Cigarette",
          "Infectious\nSubstances",
          "Radioactive\nMaterials",
          "Explosives\nAmmunition",
        ],
      ];
      const iconSpc = (leftColW - 16) / 5;
      prohibited.forEach((row, ri) => {
        const ry = Y + 32 + ri * 36;
        row.forEach((lbl, ci) => {
          const icx = M + 8 + iconSpc * ci + iconSpc / 2;
          prohibCircle(doc, icx, ry + 10, 10);
          doc
            .font("Helvetica")
            .fontSize(5.5)
            .fillColor(C.text)
            .text(lbl, icx - iconSpc / 2 + 2, ry + 22, {
              width: iconSpc - 4,
              align: "center",
              lineBreak: true,
            });
        });
      });

      // Orange "ALLOWED" right panel
      const rpX = M + leftColW;
      const rpW = 116;
      doc.save().roundedRect(rpX, Y, rpW, icCardH, 8).clip();
      fillR(doc, rpX, Y, rpW, icCardH, 0, C.accent);
      doc.restore();

      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C.white)
        .text("Items allowed\nonly in Hand\nBaggage", rpX + 4, Y + 10, {
          width: rpW - 8,
          align: "center",
          lineBreak: true,
        });

      // Lithium batteries icon (simple rect)
      fillR(doc, rpX + 44, Y + 44, 18, 22, 2, "rgba(255,255,255,0.25)");
      fillR(doc, rpX + 49, Y + 41, 8, 4, 1, "rgba(255,255,255,0.25)");
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(C.white)
        .text("+", rpX + 48, Y + 50, { lineBreak: false });
      doc
        .font("Helvetica")
        .fontSize(5.5)
        .fillColor(C.white)
        .text("LITHIUM\nBATTERIES", rpX + 4, Y + 68, {
          width: rpW - 8,
          align: "center",
        });

      // Power bank icon
      fillR(doc, rpX + 43, Y + 83, 20, 12, 2, "rgba(255,255,255,0.25)");
      doc
        .font("Helvetica")
        .fontSize(5.5)
        .fillColor(C.white)
        .text("POWER\nBANKS", rpX + 4, Y + 97, {
          width: rpW - 8,
          align: "center",
        });

      Y += icCardH + 12;

      // ══════════════════════════════════════════════════════════════
      // 8. IMPORTANT INFORMATION
      // ══════════════════════════════════════════════════════════════
      const infoItems = [
        {
          bold: "Airport Reporting Time :",
          text: "Passengers must report at the airport at least 3 hours prior to departure for domestic flights. Boarding gates close 25 minutes before departure.",
        },
        {
          bold: "Web Check-In :",
          text: "Web check-in opens 48 hours prior to departure and closes 1 hour before scheduled departure time.",
        },
        {
          bold: "Baggage Allowance :",
          text: `Check-in baggage: ${checkInBag}. Cabin baggage: ${cabinBag}. Excess baggage charges may apply as per airline policy.`,
        },
        {
          bold: "Travel Documents :",
          text: "Passengers must carry valid government-issued photo ID. Name on ticket must exactly match the ID proof.",
        },
        {
          bold: "Flight Status & Changes :",
          text: "Flight schedules are subject to change due to operational reasons. Passengers are advised to check airline website for latest updates before departure.",
        },
        {
          bold: "Refund & Cancellation :",
          text: "Refund and reissue charges apply as per fare rules. In case of no-show, full fare may be forfeited.",
        },
        {
          bold: "Dangerous Goods :",
          text: "Carriage of dangerous goods including power banks in check-in baggage is strictly prohibited.",
        },
      ];

      // ── Measure info card height first ──
      let infoInnerH = 24; // heading
      infoItems.forEach((item) => {
        const fullText = (item.bold ? item.bold + " " : "") + item.text;
        const measuredH = doc
          .font("Helvetica")
          .fontSize(7.5)
          .heightOfString(fullText, { width: CW - 38 });
        infoInnerH += measuredH + 8;
      });
      const infoCardH = infoInnerH + 8;

      fillStrokeR(doc, M, Y, CW, infoCardH, 8, C.card, C.border, 1.2);
      secHeading(doc, M + 12, Y + 10, "Important Information");

      let infoY = Y + 28;
      infoItems.forEach((item) => {
        // Bullet dot
        fillR(doc, M + 13, infoY + 4, 3, 3, 1.5, C.accent);

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(C.text)
          .text("", M + 22, infoY); // move cursor

        if (item.bold) {
          doc
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .fillColor(C.primary)
            .text(item.bold + " ", M + 22, infoY, {
              continued: true,
              lineBreak: false,
              width: CW - 36,
            });
          doc
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor(C.text)
            .text(item.text, { width: CW - 36, lineBreak: true });
        } else {
          doc
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor(C.text)
            .text(item.text, M + 22, infoY, {
              width: CW - 36,
              lineBreak: true,
            });
        }
        infoY = doc.y + 6;
      });

      Y += infoCardH + 12;

      // ══════════════════════════════════════════════════════════════
      // 9. FOOTER
      // ══════════════════════════════════════════════════════════════
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(
          "You can view all cancellation, date change and baggage related information ",
          M,
          Y,
          { continued: true, lineBreak: false },
        );
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C.accent)
        .text("here", { continued: true, lineBreak: false });
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(
          ", If you want to manage your booking, you visit MyTrips section using this ",
          { continued: true, lineBreak: false },
        );
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C.accent)
        .text("link", { lineBreak: false });
      Y += 18;

      // Contact strip
      fillStrokeR(doc, M, Y, CW, 22, 6, C.card, C.border, 1);
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C.primary)
        .text("Contact myPartner : ", M + 12, Y + 7, { lineBreak: false });
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(
          "0124 6280411",
          M +
            12 +
            doc
              .font("Helvetica-Bold")
              .fontSize(7.5)
              .widthOfString("Contact myPartner : "),
          Y + 7,
          { lineBreak: false },
        );

      // ── FINALIZE ──
      doc.end();
      writeStream.on("finish", () => resolve(filepath));
      writeStream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ─── INTEGRATION SNIPPET ─────────────────────────────────────────────────────
// In your PDFService class (pdf.service.js), replace the puppeteer-based
// generateFlightTicketPdf method with:
//
//   const { generateFlightTicketPdfKit } = require("./flight_ticket_pdfkit");
//
//   async generateFlightTicketPdf({ booking, journeyType }) {
//     return generateFlightTicketPdfKit({
//       booking,
//       journeyType,
//       outputDir: this.ticketDir,
//     });
//   }
//

module.exports = { generateFlightTicketPdfKit };
