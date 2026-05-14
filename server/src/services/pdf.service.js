const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const logger = require("../utils/logger");
const puppeteer = require("puppeteer");
const puppeteerCore = require("puppeteer-core");
const bwipjs = require("bwip-js");
const handlebars = require("handlebars");
const axios = require("axios");

const {
  generateFlightTicketPdfKit,
} = require("./templates/flight_ticket_pdfkit");
const {
  generateHotelVoucherPdfKit,
} = require("./templates/hotel_voucher_pdfkit");

const isProduction = process.env.NODE_ENV === "production";

// ── Handlebars custom helpers ──
handlebars.registerHelper("includes", (str, sub) => {
  if (!str || !sub) return false;
  return str.toUpperCase().includes(sub.toUpperCase());
});
handlebars.registerHelper("eq", (a, b) => a === b);
handlebars.registerHelper("ne", (a, b) => a !== b);

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

  /* ======================================================
     PUPPETEER HELPERS
  ====================================================== */

  async _launchBrowser() {
    try {
      if (isProduction) {
        logger.info("Launching Puppeteer-core in production mode");
        return await puppeteerCore.launch({
          executablePath: "/usr/bin/chromium-browser",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-zygote",
            "--single-process",
          ],
        });
      } else {
        logger.info("Launching Puppeteer in development mode");
        return await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox"],
        });
      }
    } catch (error) {
      logger.error("Failed to launch browser", error);
      throw error;
    }
  }

  async _generateBarcode(text) {
    try {
      if (!text) return null;
      const buffer = await bwipjs.toBuffer({
        bcid: "pdf417",
        text: text,
        scale: 3,
        height: 10,
        includetext: false,
        padding: 4,
        backgroundcolor: "ffffff",
      });
      return `data:image/png;base64,${buffer.toString("base64")}`;
    } catch (error) {
      logger.error("Barcode generation failed", error);
      return null;
    }
  }

  async _fetchAirlineLogo(code) {
    try {
      if (!code) return null;
      const url = `https://images.kiwi.com/airlines/64x64/${code}.png`;
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const base64 = Buffer.from(response.data).toString("base64");
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      return null;
    }
  }

  /* ======================================================
     FLIGHT TICKET PDF (HTML → PUPPETEER → PDF)
  ====================================================== */

  // OLD PDFKIT IMPLEMENTATION
  /*
  async generateFlightTicketPdf({ booking, journeyType }) {
    try {
      return await generateFlightTicketPdfKit({
        booking,
        journeyType,
        outputDir: this.ticketDir,
      });
    } catch (error) {
      logger.error("Flight ticket PDF generation failed", error);
      throw error;
    }
  }
  */

  // NEW PUPPETEER IMPLEMENTATION
  async generateFlightTicketPdf({ booking, journeyType }) {
    let browser;
    try {
      const br = booking?.bookingResult;
      let journeyResponse = null;
      let allSegments = [];
      let onwardPNR = br?.onwardPNR || br?.pnr || "—";
      let returnPNR = br?.returnPNR || null;
      const isRoundTrip = !!returnPNR && !!br?.returnResponse;

      // Helper to extract segments and response from a response object
      const getJourneyData = (res) => {
        if (!res) return { response: null, segments: [] };
        const response = res?.raw?.Response?.Response || res?.Response?.Response || res?.Response || res?.raw?.Response || res;
        const segments = response?.FlightItinerary?.Segments || [];
        return { response, segments };
      };

      const onwardData = getJourneyData(br?.onwardResponse || br?.providerResponse);
      const returnData = getJourneyData(br?.returnResponse);

      if (isRoundTrip) {
        journeyResponse = onwardData.response; // Use onward for global fare/airline info
        allSegments = [...onwardData.segments, ...returnData.segments];
      } else {
        journeyResponse = onwardData.response || returnData.response;
        allSegments = journeyResponse?.FlightItinerary?.Segments || [];
      }

      if (!journeyResponse) throw new Error("Invalid booking structure");

      const journeySegments = allSegments;
      const pnr = isRoundTrip ? `${onwardPNR} / ${returnPNR}` : (onwardPNR || returnPNR || "—");

      const firstLeg = journeySegments[0];
      const airlineCode = firstLeg?.Airline?.AirlineCode;
      const airlineName = firstLeg?.Airline?.AirlineName || "Airline";
      const airlineLogo = await this._fetchAirlineLogo(airlineCode);
      
      // Determine global cabin class from the first leg
      const firstSegCabin = firstLeg?.CabinClass || journeyResponse?.FlightItinerary?.Segments?.[0]?.CabinClass;
      const globalCabinClass = firstSegCabin === 2 ? "Economy" : 
                               firstSegCabin === 3 ? "Premium Economy" : 
                               firstSegCabin === 4 ? "Business" : "Standard";

      // ── Load static assets as base64 (ensures they render inside Puppeteer) ──
      const publicDir = path.join(__dirname, "../../public");
      const airSevaImg = `data:image/jpeg;base64,${fs.readFileSync(path.join(publicDir, "AirSeva.jpg")).toString("base64")}`;
      const rulesImg = `data:image/png;base64,${fs.readFileSync(path.join(publicDir, "rules.png")).toString("base64")}`;
      const traveamerLogo = `data:image/svg+xml;base64,${fs.readFileSync(path.join(publicDir, "logo-traveamer.svg")).toString("base64")}`;
      const iataLogo = `data:image/svg+xml;base64,${fs.readFileSync(path.join(publicDir, "iata-logo.svg")).toString("base64")}`;

      // ── Get Ticketed Date ──
      const ticketInfo = journeyResponse?.FlightItinerary?.Passenger?.[0]?.Ticket;
      const issueDateRaw = ticketInfo?.IssueDate || journeyResponse?.FlightItinerary?.InvoiceCreatedOn || booking.createdAt;
      const ticketedDate = new Date(issueDateRaw).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      // ── Extract fare rules from the stored fareQuote snapshot ──
      const fareRulesRaw =
        booking.flightRequest?.fareQuote?.Results?.[0]?.FareRules ||
        (Array.isArray(booking.flightRequest?.fareQuote?.Results)
          ? booking.flightRequest.fareQuote.Results[0]?.FareRules
          : booking.flightRequest?.fareQuote?.Results?.FareRules) ||
        [];

      const fareRules = fareRulesRaw.map((rule) => ({
        origin: rule.Origin || "",
        destination: rule.Destination || "",
        fareBasisCode: rule.FareBasisCode || "—",
        fareRuleDetail: rule.FareRuleDetail || "",
      }));

      // ── Prepare Segment-wise Data (Flight Cards Only) ──
      const onwardSegmentsCount = onwardData.segments.length;
      const segmentsData = await Promise.all(
        journeySegments.map(async (seg, segIdx) => {
          const depTime = new Date(
            seg.Origin?.DepTime || seg.departureDateTime,
          );
          const arrTime = new Date(
            seg.Destination?.ArrTime || seg.arrivalDateTime,
          );

          let layover = null;
          const isLegTransition = isRoundTrip && segIdx === onwardSegmentsCount - 1;

          if (segIdx < journeySegments.length - 1 && !isLegTransition) {
            const nextSeg = journeySegments[segIdx + 1];
            const nextDepTime = new Date(
              nextSeg.Origin?.DepTime || nextSeg.departureDateTime,
            );
            const layoverMs = nextDepTime - arrTime;
            if (layoverMs > 0) {
              const layoverHours = Math.floor(layoverMs / 3600000);
              const layoverMins = Math.floor((layoverMs % 3600000) / 60000);
              layover = `${layoverHours}h ${layoverMins}m`;
            }
          }

          return {
            originCity:
              seg.Origin?.Airport?.CityName || seg.origin?.city || "City",
            originCode:
              seg.Origin?.Airport?.AirportCode ||
              seg.origin?.airportCode ||
              "ORG",
            originAirport:
              seg.Origin?.Airport?.AirportName ||
              seg.origin?.airportName ||
              "Airport",
            originTerminal:
              seg.Origin?.Airport?.Terminal || seg.origin?.terminal || "",
            departureTime: depTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            departureDate: depTime.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),

            destinationCity:
              seg.Destination?.Airport?.CityName ||
              seg.destination?.city || "City",
            destinationCode:
              seg.Destination?.Airport?.AirportCode ||
              seg.destination?.airportCode ||
              "DEST",
            destinationAirport:
              seg.Destination?.Airport?.AirportName ||
              seg.destination?.airportName ||
              "Airport",
            destinationTerminal:
              seg.Destination?.Airport?.Terminal ||
              seg.destination?.terminal ||
              "",
            arrivalTime: arrTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            arrivalDate: arrTime.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),

            duration: seg.Duration
              ? `${Math.floor(seg.Duration / 60)}h ${seg.Duration % 60}m`
              : "—",
            isNonStop: journeySegments.length === 1,
            aircraft: seg.Craft || "Airbus/Boeing",
            flightNumber: `${seg.Airline?.AirlineCode}-${seg.Airline?.FlightNumber}`,
            airlineLogo: airlineLogo,
            segmentPNR: seg.AirlinePNR || (isRoundTrip ? (segIdx < onwardSegmentsCount ? onwardPNR : returnPNR) : onwardPNR),
            journeyType: isRoundTrip ? (segIdx < onwardSegmentsCount ? "ONWARD" : "RETURN") : null,
            isLastOfJourneyType: isRoundTrip 
              ? (segIdx === onwardSegmentsCount - 1 || segIdx === journeySegments.length - 1)
              : segIdx === journeySegments.length - 1,
            cabinClass:
              (seg.CabinClass === 2
                ? "Economy"
                : seg.CabinClass === 3
                  ? "Premium Economy"
                  : seg.CabinClass === 4
                    ? "Business"
                    : null) || globalCabinClass,
            fareType:
              journeyResponse?.FlightItinerary?.SupplierFareClasses ||
              (journeyResponse?.FlightItinerary?.FareClassification?.includes(
                "#",
              )
                ? journeyResponse.FlightItinerary.FareClassification.split(
                    "#",
                  )[0]
                : journeyResponse?.FlightItinerary?.FareClassification) ||
              seg.supplierFareClass ||
              seg.SupplierFareClass ||
              seg.FareClassification?.Type ||
              seg.Remark ||
              "Regular",
            checkInBaggage: (seg.Baggage || "15 KG").toUpperCase().includes("INCLUDED") ? "15 KG" : (seg.Baggage || "15 KG"),
            cabinBaggage: (seg.CabinBaggage || "7 KG").toUpperCase().includes("INCLUDED") ? "7 KG" : (seg.CabinBaggage || "7 KG"),
            layover: layover,
          };
        }),
      );

      // Barcode for the main PNR (general info)
      const barcodeBase64 = await this._generateBarcode(pnr);

      // Load Template and CSS
      const templatePath = path.join(__dirname, "./templates/ticket.html");
      const cssPath = path.join(__dirname, "./templates/ticket.css");
      const htmlTemplate = fs.readFileSync(templatePath, "utf8");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Calculate SSR (Seats, Meals, Baggage) totals
      const ssrSnapshot = booking.flightRequest?.ssrSnapshot || {};
      const seatTotal = (ssrSnapshot.seats || []).reduce(
        (acc, s) => acc + (s.price || 0),
        0,
      );
      const mealTotal = (ssrSnapshot.meals || []).reduce(
        (acc, m) => acc + (m.price || 0),
        0,
      );
      const baggageTotal = (ssrSnapshot.baggage || []).reduce(
        (acc, b) => acc + (b.price || 0),
        0,
      );
      const ssrTotal = seatTotal + mealTotal + baggageTotal;

      const template = handlebars.compile(htmlTemplate);

      // ── Prepare Consolidated Passenger Data (Global for the journey) ──
      const consolidatedTravellers = await Promise.all(
        booking.travellers.map(async (traveller, tIdx) => {
          const tboPaxOnward = onwardData.response?.FlightItinerary?.Passenger?.[tIdx] || {};
          const tboPaxReturn = returnData.response?.FlightItinerary?.Passenger?.[tIdx] || {};
          
          const ticketNumbers = [tboPaxOnward?.Ticket?.TicketNumber, tboPaxReturn?.Ticket?.TicketNumber]
            .filter(Boolean);
          const ticketNumber = ticketNumbers.join(" / ") || 
                             onwardData.response?.FlightItinerary?.TBOConfNo || 
                             "E-TICKET";

          // Merge SegmentAdditionalInfo for round trips
          const onwardAddInfo = tboPaxOnward?.SegmentAdditionalInfo || [];
          const returnAddInfo = tboPaxReturn?.SegmentAdditionalInfo || [];
          const mergedAddInfo = [...onwardAddInfo, ...returnAddInfo];

          // ── BARCODE GENERATION (Dual for Round-Trip) ──
          let onwardBarcodeBase64 = null;
          let returnBarcodeBase64 = null;
          
          const onwardContent = tboPaxOnward?.BarcodeDetails?.Barcode?.[0]?.Content;
          const returnContent = tboPaxReturn?.BarcodeDetails?.Barcode?.[0]?.Content;

          if (onwardContent) {
            onwardBarcodeBase64 = await this._generateBarcode(onwardContent);
          }
          if (returnContent) {
            returnBarcodeBase64 = await this._generateBarcode(returnContent);
          }

          return {
            name: `${traveller.firstName} ${traveller.lastName}`.toUpperCase(),
            title: traveller.title.toUpperCase(),
            ticketNumber: ticketNumber,
            ticketId: tboPaxOnward?.Ticket?.TicketId || tboPaxReturn?.Ticket?.TicketId || "",
            onwardTicket: tboPaxOnward?.Ticket ? {
              id: tboPaxOnward.Ticket.TicketId || "—",
              no: tboPaxOnward.Ticket.TicketNumber || "—"
            } : null,
            returnTicket: tboPaxReturn?.Ticket ? {
              id: tboPaxReturn.Ticket.TicketId || "—",
              no: tboPaxReturn.Ticket.TicketNumber || "—"
            } : null,
            email: traveller.isLeadPassenger ? traveller.email || "" : "",
            phone: traveller.isLeadPassenger ? traveller.phoneWithCode || "" : "",
            onwardBarcodeBase64,
            returnBarcodeBase64,
            // Fallback for one-way or if one is missing
            barcodeBase64: onwardBarcodeBase64 || returnBarcodeBase64,
            segmentServices: journeySegments.map((seg, segIdx) => {
              const addInfo = mergedAddInfo[segIdx] || {};
              const checkIn = (seg.Baggage || "15 KG").toUpperCase().includes("INCLUDED") ? "15 KG" : (seg.Baggage || "15 KG");
              
              return {
                route: `${seg.Origin?.Airport?.AirportCode || seg.Origin?.airportCode || "ORG"}-${seg.Destination?.Airport?.AirportCode || seg.Destination?.airportCode || "DEST"}`,
                seat: addInfo.Seat || "Auto",
                meal: addInfo.Meal && addInfo.Meal !== "0 Platter" ? addInfo.Meal : "N/A",
                baggage: checkIn,
                addOnBaggage: "N/A",
              };
            }),
          };
        }),
      );

      const finalHtml = template({
        pnr,
        issueDate: new Date(booking.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        airlineName,
        airlineLogo,
        baseFare: `₹ ${journeyResponse.FlightItinerary.Fare.BaseFare.toLocaleString()}`,
        taxes: `₹ ${journeyResponse.FlightItinerary.Fare.Tax.toLocaleString()}`,
        ssrCharges: ssrTotal > 0 ? `₹ ${ssrTotal.toLocaleString()}` : "₹ 0",
        seatCharges: `₹ ${seatTotal.toLocaleString()}`,
        mealCharges: `₹ ${mealTotal.toLocaleString()}`,
        baggageCharges: `₹ ${baggageTotal.toLocaleString()}`,
        totalFare: `₹ ${(booking.pricingSnapshot?.totalAmount || journeyResponse.FlightItinerary.Fare.PublishedFare + ssrTotal).toLocaleString()}`,
        currency: journeyResponse.FlightItinerary.Fare.Currency || "INR",
        segments: segmentsData,
        travellers: consolidatedTravellers,
        barcodeBase64,
        fareRules,
        airSevaImg,
        rulesImg,
        traveamerLogo,
        iataLogo,
        ticketedDate,
        generatedAt: new Date().toLocaleString(),
        generatedAtDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        isRefundable: journeySegments.some((s) => s.IsRefundable),
        isRoundTrip: isRoundTrip,
        journeyTypeLabel: isRoundTrip ? "Round-Trip" : "One-Way",
      });

      // Generate PDF
      browser = await this._launchBrowser();
      const page = await browser.newPage();

      // Set content and inject CSS
      await page.setContent(finalHtml, { waitUntil: "networkidle0" });
      await page.addStyleTag({ content: cssContent });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10px", right: "10px", bottom: "10px", left: "10px" },
      });

      await browser.close();
      browser = null;

      return pdfBuffer;
    } catch (error) {
      if (browser) await browser.close();
      logger.error("Flight ticket Puppeteer PDF generation failed", error);
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

  async generateHotelVoucher(booking) {
    try {
      const filename = `hotel-${booking.bookingReference}-${randomUUID()}.pdf`;
      const filepath = path.join(this.voucherDir, filename);

      await generateHotelVoucherPdfKit({
        booking,
        outputPath: filepath,
      });

      return filepath;
    } catch (error) {
      logger.error("Hotel voucher PDF generation failed", error);
      throw error;
    }
  }
}

module.exports = new PDFService();
