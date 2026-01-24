const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
// const { v4: uuidv4 } = require('uuid');
const { randomUUID } = require("crypto");
const logger = require("../utils/logger");
const QRCode = require("qrcode");

const puppeteer = require("puppeteer");

// const puppeteer = require("puppeteer-core");
// const chromium = require("@sparticuz/chromium");

class PDFService {
  constructor() {
    const baseDir = path.join(__dirname, "../../uploads");

    this.ticketDir = path.join(baseDir, "tickets");
    this.voucherDir = path.join(baseDir, "vouchers");
    this.invoiceDir = path.join(baseDir, "invoices");

    [this.ticketDir, this.voucherDir, this.invoiceDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async generateFlightTicketPdf({ booking, tboDetails }) {
    try {
      const filename = `ticket-${booking.bookingReference}-${randomUUID()}.pdf`;
      const filepath = path.join(this.ticketDir, filename);

      /* ================= LOAD HTML TEMPLATE ================= */

      const templatePath = path.join(
        __dirname,
        "./templates/flight-ticket.html",
      );

      let html = fs.readFileSync(templatePath, "utf8");

      /* ================= EXTRACT DATA ================= */

      const segment = booking.flightRequest.segments[0];

      const passenger =
        booking.travellers.find((t) => t.isLeadPassenger) ||
        booking.travellers[0];

      const qrCodeBase64 = await QRCode.toDataURL(
        `PNR:${booking.bookingResult.pnr}`,
      );

      const replacements = {
        airlineName: segment.airlineName,
        airlineCode: segment.airlineCode,

        passengerName: `${passenger.lastName}/${passenger.firstName} ${passenger.title}`,

        originCity: segment.origin.city,
        destinationCity: segment.destination.city,

        originCode: segment.origin.airportCode,
        destinationCode: segment.destination.airportCode,

        originAirport: segment.origin.airportName,
        destinationAirport: segment.destination.airportName,

        originCountry: segment.origin.country,
        destinationCountry: segment.destination.country,

        flightNumber: `${segment.airlineCode} ${segment.flightNumber}`,

        departureDate: new Date(segment.departureDateTime).toDateString(),
        arrivalDate: new Date(segment.arrivalDateTime).toDateString(),

        departureTime: new Date(segment.departureDateTime).toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        ),

        arrivalTime: new Date(segment.arrivalDateTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),

        duration: `${Math.floor(segment.durationMinutes / 60)}h ${
          segment.durationMinutes % 60
        }m`,

        cabinClass: booking.bookingSnapshot.cabinClass,
        terminal: segment.origin.terminal || "—",

        baggage: segment.baggage.checkIn,
        cabinBaggage: segment.baggage.cabin,

        seatNumber:
          booking.flightRequest.ssrSnapshot?.seats?.[0]?.seatNo || "—",

        pnr: booking.bookingResult.pnr,

        eTicket:
          booking.bookingResult.providerResponse.Response.Response
            .FlightItinerary.TBOConfNo || "—",

        refundable: booking.flightRequest.fareSnapshot.refundable
          ? "Yes"
          : "No",

        cancellationCharges:
          booking.flightRequest.fareSnapshot.miniFareRules?.[0]?.find(
            (r) => r.Type === "Cancellation",
          )?.Details || "As per airline rules",

        reissueCharges:
          booking.flightRequest.fareSnapshot.miniFareRules?.[0]?.find(
            (r) => r.Type === "Reissue",
          )?.Details || "As per airline rules",

        qrCode: qrCodeBase64,

        barcodeText:
          `M1${passenger.lastName}/${passenger.firstName} ` +
          `${booking.bookingResult.pnr} ` +
          `${segment.origin.airportCode}${segment.destination.airportCode} ` +
          `${segment.airlineCode}${segment.flightNumber}`,

        sequenceNumber: "001",

        airlineWebsite: "airindia.com",
        customerCare: "1800-233-1407",
        customerEmail: "support@airindia.com",

        mealService: booking.flightRequest.fareQuote.Results[0]
          .IsFreeMealAvailable
          ? "Complimentary"
          : "Buy on board",

        status: "CONFIRMED",
        ffNumber: passenger.FFNumber || "—",
      };

      /* ================= APPLY REPLACEMENTS ================= */

      for (const [key, value] of Object.entries(replacements)) {
        html = html.replaceAll(`{{${key}}}`, value ?? "");
      }

      /* ================= GENERATE PDF USING PUPPETEER ================= */

      // const browser = await puppeteer.launch({
      //   args: chromium.args,
      //   defaultViewport: chromium.defaultViewport,
      //   executablePath: await chromium.executablePath(),
      //   headless: chromium.headless,
      // });

      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: "networkidle0",
      });

      await page.pdf({
        path: filepath,
        format: "A4",
        printBackground: true,
        margin: {
          top: "10mm",
          bottom: "10mm",
          left: "10mm",
          right: "10mm",
        },
      });

      await browser.close();

      return filepath;
    } catch (error) {
      logger.error("Flight ticket PDF generation failed", error);
      throw error;
    }
  }

  async generateFlightVoucher(booking, user, corporate) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `flight-${booking.bookingReference}-${randomUUID()}.pdf`;
        const filepath = path.join(this.voucherDir, filename);

        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc.fontSize(20).text("FLIGHT BOOKING VOUCHER", { align: "center" });
        doc.moveDown();

        // Corporate Info
        doc.fontSize(12).text(`Corporate: ${corporate.corporateName}`);
        doc.fontSize(10).text(`Booking Reference: ${booking.bookingReference}`);
        doc.text(`PNR: ${booking.flightDetails.pnr}`);
        doc.moveDown();

        // Passenger Details
        doc.fontSize(14).text("Passenger Details", { underline: true });
        doc.moveDown(0.5);
        booking.travellers.forEach((traveller, index) => {
          doc
            .fontSize(10)
            .text(
              `${index + 1}. ${traveller.title} ${traveller.firstName} ${traveller.lastName}`,
            );
        });
        doc.moveDown();

        // Flight Details
        doc.fontSize(14).text("Flight Details", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(
          `Airline: ${booking.flightDetails.airline} (${booking.flightDetails.flightNumber})`,
        );
        doc.text(
          `From: ${booking.flightDetails.origin} - ${booking.flightDetails.originCity}`,
        );
        doc.text(
          `To: ${booking.flightDetails.destination} - ${booking.flightDetails.destinationCity}`,
        );
        doc.text(
          `Date: ${new Date(booking.flightDetails.departureDate).toLocaleDateString()}`,
        );
        doc.text(`Departure: ${booking.flightDetails.departureTime}`);
        doc.text(`Arrival: ${booking.flightDetails.arrivalTime}`);
        doc.text(`Class: ${booking.flightDetails.cabinClass}`);
        doc.moveDown();

        // Fare Details
        doc.fontSize(14).text("Fare Details", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Base Fare: ₹${booking.pricing.baseFare.toLocaleString()}`);
        doc.text(`Taxes: ₹${booking.pricing.taxes.toLocaleString()}`);
        doc
          .fontSize(12)
          .text(
            `Total Amount: ₹${booking.pricing.totalAmount.toLocaleString()}`,
            { bold: true },
          );

        // Footer
        doc.moveDown(2);
        doc
          .fontSize(8)
          .text(
            "This is a computer-generated voucher and does not require a signature.",
            { align: "center" },
          );

        doc.end();

        stream.on("finish", () => {
          // resolve(`/uploads/vouchers/${filename}`);
          resolve(filepath);
        });

        stream.on("error", reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateHotelVoucher(booking, user, corporate) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `hotel-${booking.bookingReference}-${randomUUID()}.pdf`;
        const filepath = path.join(this.voucherDir, filename);

        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc.fontSize(20).text("HOTEL BOOKING VOUCHER", { align: "center" });
        doc.moveDown();

        doc.fontSize(12).text(`Corporate: ${corporate.corporateName}`);
        doc.fontSize(10).text(`Booking Reference: ${booking.bookingReference}`);
        doc.text(`Confirmation No: ${booking.hotelDetails.confirmationNumber}`);
        doc.moveDown();

        // Guest Details
        doc.fontSize(14).text("Guest Details", { underline: true });
        doc.moveDown(0.5);
        booking.travellers.forEach((traveller, index) => {
          doc
            .fontSize(10)
            .text(
              `${index + 1}. ${traveller.title} ${traveller.firstName} ${traveller.lastName}`,
            );
        });
        doc.moveDown();

        // Hotel Details
        doc.fontSize(14).text("Hotel Details", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Hotel: ${booking.hotelDetails.hotelName}`);
        doc.text(
          `Address: ${booking.hotelDetails.address.street}, ${booking.hotelDetails.address.city}`,
        );
        doc.text(
          `Check-in: ${new Date(booking.hotelDetails.checkInDate).toLocaleDateString()}`,
        );
        doc.text(
          `Check-out: ${new Date(booking.hotelDetails.checkOutDate).toLocaleDateString()}`,
        );
        doc.text(`Nights: ${booking.hotelDetails.numberOfNights}`);
        doc.text(`Room Type: ${booking.hotelDetails.roomType}`);
        doc.text(`Meal Plan: ${booking.hotelDetails.mealPlan}`);
        doc.moveDown();

        // Fare Details
        doc.fontSize(14).text("Fare Details", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Base Fare: ₹${booking.pricing.baseFare.toLocaleString()}`);
        doc.text(`Taxes: ₹${booking.pricing.taxes.toLocaleString()}`);
        doc
          .fontSize(12)
          .text(
            `Total Amount: ₹${booking.pricing.totalAmount.toLocaleString()}`,
            { bold: true },
          );

        doc.moveDown(2);
        doc
          .fontSize(8)
          .text(
            "This is a computer-generated voucher and does not require a signature.",
            { align: "center" },
          );

        doc.end();

        stream.on("finish", () => {
          resolve(`/uploads/vouchers/${filename}`);
        });

        stream.on("error", reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new PDFService();
