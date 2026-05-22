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

  // for localhost

  // async _launchBrowser() {
  //   try {
  //     if (isProduction) {
  //       logger.info("Launching Puppeteer-core in production mode");
  //       return await puppeteerCore.launch({
  //         executablePath: "/usr/bin/chromium-browser",
  //         args: [
  //           "--no-sandbox",
  //           "--disable-setuid-sandbox",
  //           "--disable-dev-shm-usage",
  //           "--disable-gpu",
  //           "--no-zygote",
  //           "--single-process",
  //         ],
  //       });
  //     } else {
  //       logger.info("Launching Puppeteer in development mode");
  //       return await puppeteer.launch({
  //         headless: true,
  //         args: ["--no-sandbox"],
  //       });
  //     }
  //   } catch (error) {
  //     logger.error("Failed to launch browser", error);
  //     throw error;
  //   }
  // }

  // for production

    async _launchBrowser() {
    try {
      if (isProduction) {
        logger.info("Launching Puppeteer-core in production mode");

        return await puppeteerCore.launch({
          executablePath: "/snap/bin/chromium",
          headless: true,
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

  async generateFlightTicketPdf({ booking, journeyType }) {
    let browser;
    try {
      const br = booking?.bookingResult;
      let journeyResponse = null;
      let allSegments = [];
      let onwardPNR = br?.onwardPNR || br?.pnr || "—";
      let returnPNR = br?.returnPNR || null;

      // Helper to extract segments and response from a response object
      const getJourneyData = (res) => {
        if (!res) return { response: null, segments: [] };
        const response =
          res?.raw?.Response?.Response ||
          res?.Response?.Response ||
          res?.Response ||
          res?.raw?.Response ||
          res;
        const segments = response?.FlightItinerary?.Segments || [];
        return { response, segments };
      };

      const onwardData = getJourneyData(
        br?.onwardResponse || br?.providerResponse,
      );
      const returnData = getJourneyData(br?.returnResponse);

      // Improved Round-Trip detection for international bookings
      // In international round-trips, both legs usually come under a single PNR/response
      const hasReturnSegments = onwardData.segments.some(
        (s) => s.TripIndicator === 2,
      );
      const isInternationalRoundTrip = !br?.returnResponse && hasReturnSegments;
      const isRoundTrip = !!br?.returnResponse || isInternationalRoundTrip;

      if (isRoundTrip) {
        journeyResponse = onwardData.response; // Use onward for global fare/airline info
        if (isInternationalRoundTrip) {
          allSegments = onwardData.segments;
          if (!returnPNR) returnPNR = onwardPNR; // Mirror PNR for international single-PNR trips
        } else {
          allSegments = [...onwardData.segments, ...returnData.segments];
        }
      } else {
        journeyResponse = onwardData.response || returnData.response;
        allSegments = journeyResponse?.FlightItinerary?.Segments || [];
      }

      if (!journeyResponse) throw new Error("Invalid booking structure");

      const journeySegments = allSegments;
      const pnr =
        isRoundTrip && returnPNR && returnPNR !== onwardPNR
          ? `${onwardPNR} / ${returnPNR}`
          : onwardPNR || returnPNR || "—";

      const firstLeg = journeySegments[0];
      const airlineCode = firstLeg?.Airline?.AirlineCode;
      const airlineName = firstLeg?.Airline?.AirlineName || "Airline";
      const airlineLogo = await this._fetchAirlineLogo(airlineCode);

      // Determine global cabin class from the first leg
      const firstSegCabin =
        firstLeg?.CabinClass ||
        journeyResponse?.FlightItinerary?.Segments?.[0]?.CabinClass;
      const globalCabinClass =
        firstSegCabin === 2
          ? "Economy"
          : firstSegCabin === 3
            ? "Premium Economy"
            : firstSegCabin === 4
              ? "Business"
              : "Standard";

      // ── Load static assets as base64 (ensures they render inside Puppeteer) ──
      const publicDir = path.join(__dirname, "../../public");
      const airSevaImg = `data:image/jpeg;base64,${fs.readFileSync(path.join(publicDir, "AirSeva.jpg")).toString("base64")}`;
      const rulesImg = `data:image/png;base64,${fs.readFileSync(path.join(publicDir, "rules.png")).toString("base64")}`;
      const traveamerLogo = `data:image/svg+xml;base64,${fs.readFileSync(path.join(publicDir, "logo-traveamer.svg")).toString("base64")}`;
      const iataLogo = `data:image/svg+xml;base64,${fs.readFileSync(path.join(publicDir, "iata-logo.svg")).toString("base64")}`;

      // ── Get Ticketed Date ──
      const ticketInfo =
        journeyResponse?.FlightItinerary?.Passenger?.[0]?.Ticket;
      const issueDateRaw =
        ticketInfo?.IssueDate ||
        journeyResponse?.FlightItinerary?.InvoiceCreatedOn ||
        booking.createdAt;
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
      // Calculate onward segments count properly to distinguish between onward and return legs
      const onwardSegmentsCount = onwardData.segments.filter(
        (s) => s.TripIndicator === 1,
      ).length;
      const segmentsData = await Promise.all(
        journeySegments.map(async (seg, segIdx) => {
          const depTime = new Date(
            seg.Origin?.DepTime || seg.departureDateTime,
          );
          const arrTime = new Date(
            seg.Destination?.ArrTime || seg.arrivalDateTime,
          );

          let layover = null;
          const isLegTransition =
            isRoundTrip && segIdx === onwardSegmentsCount - 1;

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
            originGate:
              seg.Origin?.Airport?.Gate ||
              seg.Origin?.Gate ||
              seg.origin?.gate ||
              "",
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
              seg.destination?.city ||
              "City",
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
            segmentPNR:
              seg.AirlinePNR ||
              (isRoundTrip
                ? segIdx < onwardSegmentsCount
                  ? onwardPNR
                  : returnPNR || onwardPNR
                : onwardPNR),
            journeyType: isRoundTrip
              ? segIdx < onwardSegmentsCount
                ? "ONWARD"
                : "RETURN"
              : null,
            isLastOfJourneyType: isRoundTrip
              ? segIdx === onwardSegmentsCount - 1 ||
                segIdx === journeySegments.length - 1
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
            checkInBaggage: (seg.Baggage || "15 KG")
              .toUpperCase()
              .includes("INCLUDED")
              ? "15 KG"
              : seg.Baggage || "15 KG",
            cabinBaggage: (seg.CabinBaggage || "7 KG")
              .toUpperCase()
              .includes("INCLUDED")
              ? "7 KG"
              : seg.CabinBaggage || "7 KG",
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
      const activeTicketSnapshot =
        booking?.activeTicketSnapshot || booking?.reissueMeta?.activeTicketSnapshot || null;

      // Calculate SSR (Seats, Meals, Baggage) totals
      const ssrSnapshot =
        activeTicketSnapshot?.ssr ||
        activeTicketSnapshot?.ssrSnapshot ||
        booking.flightRequest?.ssrSnapshot ||
        {};
      const seatTotal =
        Number(
          ssrSnapshot.totalSeatAmount ||
            (ssrSnapshot.seats || []).reduce((acc, s) => acc + (s.price || s.amount || 0), 0),
        ) || 0;
      const mealTotal =
        Number(
          ssrSnapshot.totalMealAmount ||
            (ssrSnapshot.meals || []).reduce((acc, m) => acc + (m.price || m.amount || 0), 0),
        ) || 0;
      const baggageTotal =
        Number(
          ssrSnapshot.totalBaggageAmount ||
            (ssrSnapshot.baggage || []).reduce((acc, b) => acc + (b.price || b.amount || 0), 0),
        ) || 0;
      const ssrTotal =
        Number(ssrSnapshot.totalSSRAmount || ssrSnapshot.totalAmount || seatTotal + mealTotal + baggageTotal) || 0;

      const template = handlebars.compile(htmlTemplate);

      // ── Prepare Consolidated Passenger Data (Global for the journey) ──
      const consolidatedTravellers = await Promise.all(
        (Array.isArray(booking.travellers) ? booking.travellers : []).map(async (traveller, tIdx) => {
          const tboPaxOnward =
            onwardData.response?.FlightItinerary?.Passenger?.[tIdx] || {};
          const tboPaxReturn =
            returnData.response?.FlightItinerary?.Passenger?.[tIdx] || {};

          const onwardTicket = tboPaxOnward?.Ticket
            ? {
                id: tboPaxOnward.Ticket.TicketId || "—",
                no: tboPaxOnward.Ticket.TicketNumber || "—",
              }
            : null;

          const returnTicket = tboPaxReturn?.Ticket
            ? {
                id: tboPaxReturn.Ticket.TicketId || "—",
                no: tboPaxReturn.Ticket.TicketNumber || "—",
              }
            : isInternationalRoundTrip
              ? onwardTicket
              : null;

          const ticketNumber =
            onwardTicket && returnTicket && onwardTicket.no !== returnTicket.no
              ? `${onwardTicket.no} / ${returnTicket.no}`
              : onwardTicket?.no ||
                returnTicket?.no ||
                onwardData.response?.FlightItinerary?.TBOConfNo ||
                "E-TICKET";

          // Merge SegmentAdditionalInfo for round trips
          const onwardAddInfo = tboPaxOnward?.SegmentAdditionalInfo || [];
          const returnAddInfo = tboPaxReturn?.SegmentAdditionalInfo || [];
          const mergedAddInfo = [...onwardAddInfo, ...returnAddInfo];

          // ── BARCODE GENERATION (Dual for Round-Trip) ──
          let onwardBarcodeBase64 = null;
          let returnBarcodeBase64 = null;

          const onwardBarcodes = tboPaxOnward?.BarcodeDetails?.Barcode || [];
          const returnBarcodes = tboPaxReturn?.BarcodeDetails?.Barcode || [];

          let onwardContent = onwardBarcodes[0]?.Content;
          let returnContent = returnBarcodes[0]?.Content;

          // Handle International Round-Trip where both barcodes are in the onward/provider response
          if (
            isInternationalRoundTrip &&
            onwardBarcodes.length >= 2 &&
            !returnContent
          ) {
            returnContent = onwardBarcodes[1]?.Content;
          }

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
            ticketId:
              tboPaxOnward?.Ticket?.TicketId ||
              tboPaxReturn?.Ticket?.TicketId ||
              "",
            onwardTicket,
            returnTicket,
            email: traveller.isLeadPassenger ? traveller.email || "" : "",
            phone: traveller.isLeadPassenger
              ? traveller.phoneWithCode || ""
              : "",
            onwardBarcodeBase64,
            returnBarcodeBase64,
            // Fallback for one-way or if one is missing
            barcodeBase64: onwardBarcodeBase64 || returnBarcodeBase64,
            segmentServices: journeySegments.map((seg, segIdx) => {
              const addInfo = mergedAddInfo[segIdx] || {};
              const snapshotSegment = activeTicketSnapshot?.segments?.[segIdx] || null;
              const seatLabel = snapshotSegment?.ssr?.seat?.label || null;
              const mealLabel = snapshotSegment?.ssr?.meal?.label || null;
              const bagLabel = snapshotSegment?.ssr?.baggage?.label || null;
              const checkIn = (seg.Baggage || "15 KG")
                .toUpperCase()
                .includes("INCLUDED")
                ? "15 KG"
                : seg.Baggage || "15 KG";

              return {
                route: `${seg.Origin?.Airport?.AirportCode || seg.Origin?.airportCode || "ORG"}-${seg.Destination?.Airport?.AirportCode || seg.Destination?.airportCode || "DEST"}`,
                seat: seatLabel || "—",
                meal: mealLabel || "—",
                baggage: checkIn,
                addOnBaggage: bagLabel || "—",
                hasAddOn: Boolean(bagLabel),
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
        ticketTypeTitle:
          booking?.reissueMeta?.headerTitle ||
          (booking?.reissueMeta?.isReissued
            ? "Reissued Flight E-ticket"
            : "Flight E-ticket"),
        segments: segmentsData,
        travellers: consolidatedTravellers,
        barcodeBase64,
        fareRules,
        airSevaImg,
        rulesImg,
        traveamerLogo,
        iataLogo,
        inlineCss: cssContent,
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

      // Inline CSS in the rendered template so PDF/email/browser previews do not
      // depend on resolving a separate stylesheet file at render time.
      await page.setContent(finalHtml, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10px", right: "10px", bottom: "10px", left: "10px" },
      });

      logger.info("PDF_GENERATED", {
        bookingReference: booking?.bookingReference || null,
        pnr,
        isReissued: Boolean(booking?.reissueMeta?.isReissued || booking?.activeTicketSnapshot),
        totalSSRAmount: ssrTotal,
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

  async generateFlightTicketFile({
    booking,
    journeyType,
    outputDir = this.ticketDir,
    fileName = null,
  }) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });

      const pdfBuffer = await this.generateFlightTicketPdf({
        booking,
        journeyType,
      });

      const resolvedFileName =
        fileName ||
        `ticket-${booking?.bookingReference || "flight"}-${randomUUID()}.pdf`;
      const filePath = path.join(outputDir, resolvedFileName);

      await fs.promises.writeFile(filePath, pdfBuffer);
      return filePath;
    } catch (error) {
      logger.error("Flight ticket file generation failed", error);
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
    let browser;
    try {
      const filename = `hotel-${booking.bookingReference || "hotel"}-${randomUUID()}.pdf`;
      const filepath = path.join(this.voucherDir, filename);

      const hotel = booking.hotelRequest?.selectedHotel || {};
      const room = booking.hotelRequest?.selectedRoom || {};
      const result = booking.bookingResult?.providerResponse?.BookResult || {};
      const guest = booking.travellers?.[0] || {};

      // ── Hotel Image Extraction ──
      const extractImageUrl = (img) => {
        if (!img) return null;
        if (typeof img === "string") return img;
        if (typeof img === "object") {
          return img.Url || img.url || img.Image || img.image || null;
        }
        return null;
      };

      let hotelImages = booking.hotelRequest?.selectedHotel?.images ||
                        booking.hotelRequest?.rawHotelData?.Images ||
                        booking.hotelRequest?.rawHotelData?.images ||
                        [];
      if (hotelImages.length === 0 && booking.bookingSnapshot?.hotelImage) {
        hotelImages = [booking.bookingSnapshot.hotelImage];
      }

      let hotelImage = null;
      for (const img of hotelImages) {
        let url = extractImageUrl(img);
        if (url && typeof url === "string") {
          let cleaned = url.trim();
          if (cleaned.startsWith("//")) {
            cleaned = "https:" + cleaned;
          }
          if (cleaned.startsWith("http")) {
            hotelImage = cleaned;
            break;
          }
        }
      }

      // Self-contained luxury gold & navy corporate hotel SVG vector illustration
      // 100% offline-ready and guaranteed to load instantly under all environments
      if (!hotelImage) {
        hotelImage = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+CiAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMwNDExMmYiIHJ4PSI2Ii8+CiAgPHJlY3QgeD0iMzUiIHk9IjI1IiB3aWR0aD0iMzAiIGhlaWdodD0iNjAiIGZpbGw9IiMxMDIyMzgiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KICA8cmVjdCB4PSI0MiIgeT0iMzIiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOCIvPgogIDxyZWN0IHg9IjUyIiB5PSIzMiIgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iI2M5YTg0YyIgb3BhY2l0eT0iMC44Ii8+CiAgPHJlY3Qgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iI2M5YTg0YyIgb3BhY2l0eT0iMC44IiB4PSI0MiIgeT0iNDIiLz4KICA8cmVjdCB3aWR0aD0iYiIgaGVpZ2h0PSI2IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjgiIHg9IjUyIiB5PSI0MiIvPgogIDxyZWN0IHdpZHRoPSI2IiBoZWlnaHQ9IjYiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOCIgeD0iNDIiIHk9IjUyIi8+CiAgPHJlY3Qgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iI2M5YTg0YyIgb3BhY2l0eT0iMC44IiB4PSI1MiIgeT0iNTIiLz4KICA8cmVjdCB3aWR0aD0iNiIgaGVpZ2h0PSI2IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjgiIHg9IjQyIiB5PSI2MiIvPgogIDxyZWN0IHdpZHRoPSI2IiBoZWlnaHQ9IjYiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOCIgeD0iNTIiIHk9IjYyIi8+CiAgPHJlY3QgeD0iNDciIHk9Ijc0IiB3aWR0aD0iNiIgaGVpZ2h0PSIxMSIgZmlsbD0iI2M5YTg0YyIvPgogIDxwYXRoIGQ9Ik01MCAxMiBMNTMgMTcgTDU5IDE3IEw1NCAyMCBMNTYgMjUgTDUwIDIyIEw0NCAyNSBMNDYgMjAgTDQxIDE3IEw0NyAxNyBaIiBmaWxsPSIjYzlhODRjIi8+Cjwvc3ZnPg==";
      }

      // Preload image to base64 to ensure Puppeteer renders it 100% of the time, avoiding Cloudflare/WAF blocks
      let resolvedHotelImage = hotelImage;
      if (hotelImage && !hotelImage.startsWith("data:")) {
        try {
          const axios = require("axios");
          const response = await axios.get(hotelImage, {
            responseType: "arraybuffer",
            timeout: 5000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://www.tboholidays.com/"
            }
          });
          const contentType = response.headers["content-type"] || "image/jpeg";
          const base64Data = Buffer.from(response.data, "binary").toString("base64");
          resolvedHotelImage = `data:${contentType};base64,${base64Data}`;
        } catch (err) {
          logger.warn(`Failed to preload hotel image from ${hotelImage}, using offline SVG fallback. Error: ${err.message}`);
          resolvedHotelImage = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+CiAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMwNDExMmYiIHJ4PSI2Ii8+CiAgPHJlY3QgeD0iMzUiIHk9IjI1IiB3aWR0aD0iMzAiIGhlaWdodD0iNjAiIGZpbGw9IiMxMDIyMzgiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KICA8cmVjdCB4PSI0MiIgeT0iMzIiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOCIvPgogIDxyZWN0IHg9IjUyIiB5PSIzMiIgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iI2M5YTg0YyIgb3BhY2l0eT0iMC44Ii8+CiAgPHJlY3Qgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iI2M5YTg0YyIgb3BhY2l0eT0iMC44IiB4PSI0MiIgeT0iNDIiLz4KICA8cmVjdCBgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iI2M5YTg0YyIgb3BhY2l0eT0iMC44IiB4PSI1MiIgeT0iNDIiLz4KICA8cmVjdCB3aWR0aD0iNiIgaGVpZ2h0PSI2IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjgiIHg9IjQyIiB5PSI1MiIvPgogIDxyZWN0IHdpZHRoPSI2IiBoZWlnaHQ9IjYiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOCIgeD0iNTIiIHk9IjUzIi8+CiAgPHJlY3Qgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iI2M5YTg0YyIgb3BhY2l0eT0iMC44IiB4PSI0MiIgeT0iNjIiLz4KICA8cmVjdCB3aWR0aD0iNiIgaGVpZ2h0PSI2IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjgiIHg9IjUyIiB5PSI2MiIvPgogIDxyZWN0IHg9IjQ3IiB5PSI3NCIgd2lkdGg9IjYiIGhlaWdodD0xMSIgZmlsbD0iI2M5YTg0YyIvPgogIDxwYXRoIGQ9Ik01MCAxMiBMNTMgMTcgTDU5IDE3IEw1NCAyMCBMNTYgMjUgTDUwIDIyIEw0NCAyNSBMNDYgMjAgTDQxIDE3IEw0NyAxNyBaIiBmaWxsPSIjYzlhODRjIi8+Cjwvc3ZnPg==";
        }
      }

      // ── Date Formatting Helpers ──
      const safeParseDate = (dateVal) => {
        if (!dateVal) return new Date();
        if (dateVal instanceof Date) return dateVal;
        if (typeof dateVal === "object" && dateVal.$date) {
          return new Date(dateVal.$date);
        }
        const parsed = new Date(dateVal);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      };

      const formatDateDay = (dateStr) => {
        if (!dateStr) return "—";
        const d = safeParseDate(dateStr);
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        });
      };

      const formatDateFull = (dateStr) => {
        if (!dateStr) return "—";
        const d = safeParseDate(dateStr);
        return d.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      };

      const rawVoucheredDate = booking.voucheredAt || 
                               booking.voucheredDate || 
                               booking.approvedAt || 
                               booking.payment?.paidAt || 
                               booking.createdAt || 
                               new Date();
      const voucheredDate = safeParseDate(rawVoucheredDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      const bookedDate = safeParseDate(booking.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      const checkInDate = safeParseDate(booking.hotelRequest?.checkInDate);
      const checkOutDate = safeParseDate(booking.hotelRequest?.checkOutDate);

      // ── Nights Calculation ──
      const checkIn = checkInDate;
      const checkOut = checkOutDate;
      const diffTime = Math.abs(checkOut - checkIn);
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      // ── Amendment Handling ──
      const amendment = booking.changeRequest || booking.amendmentRequest ? {
        status: booking.changeRequest?.status || booking.amendmentRequest?.status || "Requested",
        reason: booking.changeRequest?.reason || booking.amendmentRequest?.reason || "Change of travel plans.",
        id: booking.changeRequest?.id || booking.amendmentRequest?.id || "—",
        lastChecked: booking.changeRequest?.updatedAt 
          ? new Date(booking.changeRequest.updatedAt).toLocaleDateString("en-GB") 
          : new Date().toLocaleDateString("en-GB")
      } : null;

      // ── Primary Guest ──
      const primaryGuest = {
        name: `${guest.title || "Mr."} ${guest.firstName || ""} ${guest.lastName || ""}`.trim().toUpperCase(),
        panCard: guest.panCard || guest.pan || null,
        nationality: guest.nationality || "India (IN)",
        dateOfBirth: guest.dateOfBirth 
          ? new Date(guest.dateOfBirth).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) 
          : null,
        email: guest.email || "—",
        phone: guest.phoneWithCode || guest.phone || "—"
      };

      // ── All Travellers ──
      const parsedTravellers = (booking.travellers || []).map((t, idx) => {
        return {
          index: idx + 1,
          name: `${t.title || "Mr."} ${t.firstName || ""} ${t.lastName || ""}`.trim().toUpperCase(),
          gender: t.gender || "—",
          age: t.age || "—",
          paxType: t.paxType || "Adult",
          panCard: t.panCard || t.pan || "—",
          nationality: t.nationality || "IN",
          email: t.email || "—",
          phone: t.phoneWithCode || t.phone || "—"
        };
      });

      // ── Room Details ──
      const rawRoomsList = Array.isArray(room.rawRoomData) 
        ? room.rawRoomData 
        : (room.rawRoomData ? [room.rawRoomData] : []);
      const parsedRooms = rawRoomsList.map((rawRoom, idx) => {
        const nameVal = Array.isArray(rawRoom.Name) 
          ? rawRoom.Name[0] 
          : (rawRoom.Name || rawRoom.name || "Room " + (idx + 1));
        const meal = rawRoom.MealType || rawRoom.mealType || "Room Only";
        const inclusionStr = rawRoom.Inclusion || rawRoom.inclusion || "";
        const inclusionsList = inclusionStr.split(",").map(i => i.trim()).filter(Boolean);
        
        return {
          index: idx + 1,
          name: nameVal,
          mealType: meal.replace(/_/g, " "),
          inclusions: inclusionsList,
          hasInclusions: inclusionsList.length > 0,
          isRefundable: rawRoom.IsRefundable ?? rawRoom.isRefundable ?? false,
          description: rawRoom.Description || rawRoom.description || "",
          amenities: Array.isArray(rawRoom.Amenities) ? rawRoom.Amenities.slice(0, 15) : (Array.isArray(rawRoom.amenities) ? rawRoom.amenities.slice(0, 15) : []),
          hasAmenities: (Array.isArray(rawRoom.Amenities) && rawRoom.Amenities.length > 0) || (Array.isArray(rawRoom.amenities) && rawRoom.amenities.length > 0)
        };
      });

      const roomTypeName = parsedRooms.length > 0 ? parsedRooms[0].name : (room.roomTypeName || room.RoomTypeName || "Standard Room");
      const roomsCount = booking.hotelRequest?.rooms?.length || booking.hotelRequest?.noOfRooms || 1;
      const multiRoom = roomsCount > 1;
      const adultsCount = booking.hotelRequest?.rooms?.reduce((acc, r) => acc + (Number(r.adults) || 1), 0) || booking.travellers?.length || 1;
      const multiAdult = adultsCount > 1;
      const mealType = parsedRooms.length > 0 ? parsedRooms[0].mealType : (room.mealType?.replace(/_/g, " ") || room.MealType?.replace(/_/g, " ") || "Room Only");
      const isRefundable = parsedRooms.length > 0 ? parsedRooms[0].isRefundable : (room.isRefundable ?? room.IsRefundable ?? false);

      const inclusions = parsedRooms.length > 0 ? parsedRooms[0].inclusions : ((room.rawRoomData?.Inclusion || room.Inclusion || "")
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean));

      // ── Voucher API Response Info ──
      const rawVoucher = booking.voucher?.raw || booking.bookingResult?.providerResponse?.BookResult || {};
      const voucherApiResponse = {
        apiName: "TBO GenerateVoucher API",
        status: rawVoucher.VoucherStatus ? "SUCCESS" : "CONFIRMED",
        bookingId: rawVoucher.BookingId || booking.bookingResult?.providerResponse?.BookResult?.BookingId || "—",
        invoiceNumber: rawVoucher.InvoiceNumber || booking.bookingResult?.providerResponse?.BookResult?.InvoiceNumber || "—",
        traceId: rawVoucher.TraceId || booking.bookingResult?.providerResponse?.BookResult?.TraceId || "—",
        responseStatus: rawVoucher.ResponseStatus === 1 ? "1 (Success)" : (rawVoucher.ResponseStatus || "—"),
        errorCode: rawVoucher.Error?.ErrorCode ?? 0,
        errorMessage: rawVoucher.Error?.ErrorMessage || "No Errors"
      };

      const tboBookingId = voucherApiResponse.bookingId || "—";

      // ── Pricing Details ──
      const currency = booking.pricingSnapshot?.currency || room.rawRoomData?.Currency || "INR";
      let currencySymbol = currency;
      try {
        const symbol = (0).toLocaleString("en-US", {
          style: "currency",
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).replace(/\d/g, "").trim();
        currencySymbol = symbol ? `${symbol} ` : `${currency} `;
      } catch (e) {
        currencySymbol = `${currency} `;
      }
      
      const totalAmountVal = booking.pricingSnapshot?.totalAmount || booking.pricingSnapshot?.totalFare || room.rawRoomData?.TotalFare || 0;
      const taxesVal = booking.pricingSnapshot?.taxes || booking.pricingSnapshot?.totalTax || room.rawRoomData?.TotalTax || 0;
      const baseFareVal = booking.pricingSnapshot?.baseAmount || booking.pricingSnapshot?.baseFare || (totalAmountVal - taxesVal) || 0;

      const baseFare = Number(baseFareVal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const taxes = Number(taxesVal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const totalAmount = Number(totalAmountVal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const perNightRate = Number(Math.round(totalAmountVal / nights)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const perNightBase = Number(Math.round(baseFareVal / nights)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const paymentMethod = booking.paymentSnapshot?.paymentMethod || booking.paymentMethod || "Wallet";
      const paymentStatus = booking.paymentSnapshot?.status || booking.paymentStatus || "Completed";

      // ── Cancellation Policy ──
      const cancelPolicies = (room.cancelPolicies || room.CancelPolicies || []).map((policy) => {
        return {
          FromDate: policy.FromDate || "—",
          CancellationCharge: policy.CancellationCharge ? Number(policy.CancellationCharge).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00",
          isFree: Number(policy.CancellationCharge) === 0
        };
      });

      // ── GST Details ──
      const gstInfo = booking.gstDetails || booking.hotelRequest?.gstDetails || null;
      const gst = gstInfo && gstInfo.gstin ? {
        gstin: gstInfo.gstin || "—",
        legalName: gstInfo.legalName || "—",
        address: gstInfo.address || gstInfo.registeredAddress || "—"
      } : null;

      // ── Load Templates ──
      const templatePath = path.join(__dirname, "./templates/hotel.voucher.html");
      const cssPath = path.join(__dirname, "./templates/hotel.css");
      const htmlTemplate = fs.readFileSync(templatePath, "utf8");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      const publicDir = path.join(__dirname, "../../public");
      const traveamerLogo = `data:image/svg+xml;base64,${fs.readFileSync(path.join(publicDir, "logo-traveamer.svg")).toString("base64")}`;
      const iataLogo = `data:image/svg+xml;base64,${fs.readFileSync(path.join(publicDir, "iata-logo.svg")).toString("base64")}`;

      const template = handlebars.compile(htmlTemplate);

      const finalHtml = template({
        bookingReference: booking.bookingReference || result.BookingRefNo || "—",
        hotelCity: hotel.cityName || hotel.city || "—",
        hotelName: hotel.hotelName || hotel.name || "—",
        hotelAddress: hotel.address || "—",
        projectName: booking.project?.name || booking.project?.projectName || booking.projectName || null,
        invoiceNo: booking.bookingResult?.invoiceNumber || booking.invoiceNumber || booking.bookingResult?.invoiceNo || "—",
        confirmationNo: result.ConfirmationNo || booking.bookingResult?.providerResponse?.BookResult?.ConfirmationNo || "—",
        checkInDay: formatDateDay(checkInDate),
        checkInFull: formatDateFull(checkInDate),
        checkInTime: hotel.checkInTime || "02:00 PM",
        checkOutDay: formatDateDay(checkOutDate),
        checkOutFull: formatDateFull(checkOutDate),
        checkOutTime: hotel.checkOutTime || "12:00 PM",
        nights,
        amendment,
        primaryGuest,
        roomTypeName,
        roomsCount,
        multiRoom,
        adultsCount,
        multiAdult,
        mealType,
        isRefundable,
        inclusions,
        currency,
        currencySymbol,
        baseFare,
        taxes,
        totalAmount,
        perNightRate,
        perNightBase,
        paymentMethod,
        paymentStatus,
        cancelPolicies,
        gst,
        hotelImage: resolvedHotelImage,
        importantInfo: [],
        bookedOn: safeParseDate(booking.createdAt).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }) + " UTC",
        traveamerLogo,
        iataLogo,
        generatedAt: new Date().toLocaleString("en-IN"),
        voucheredDate,
        bookedDate,
        parsedRooms,
        voucherApiResponse,
        tboBookingId,
        parsedTravellers,
        inlineCss: cssContent
      });

      // ── Generate PDF via Puppeteer ──
      browser = await this._launchBrowser();
      const page = await browser.newPage();

      await page.setContent(finalHtml, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10px", right: "10px", bottom: "10px", left: "10px" },
      });

      await browser.close();
      browser = null;

      await fs.promises.writeFile(filepath, pdfBuffer);
      return filepath;
    } catch (error) {
      if (browser) await browser.close();
      logger.error("Hotel voucher Puppeteer PDF generation failed", error);
      throw error;
    }
  }
}

module.exports = new PDFService();
