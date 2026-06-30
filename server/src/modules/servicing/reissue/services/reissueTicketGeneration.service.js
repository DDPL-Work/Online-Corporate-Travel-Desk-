const fs = require("fs");
const path = require("path");
const logger = require("../../../../utils/logger");
const ApiError = require("../../../../utils/ApiError");
const BookingRequest = require("../../../../models/BookingRequest");
const pdfService = require("../../../../services/pdf.service");
const {
  buildActiveTicketSnapshotFromState,
} = require("../utils/activeTicketSnapshot.helper");
const { normalizeSsrSnapshot } = require("../utils/ssrSnapshot.util");

class ReissueTicketGenerationService {
  constructor() {
    this.baseUploadPath = path.resolve(process.cwd(), "uploads", "reissued-tickets");
  }

  ensureDirectory() {
    fs.mkdirSync(this.baseUploadPath, { recursive: true });
  }

  toTraveller(source = {}, index = 0) {
    const firstName = source.firstName || source.givenName || source.name?.split?.(" ")?.[0] || "Passenger";
    const lastName =
      source.lastName ||
      source.surname ||
      source.name?.split?.(" ")?.slice?.(1)?.join?.(" ") ||
      `${index + 1}`;

    return {
      title: (source.title || "Mr").toString(),
      firstName,
      lastName,
      isLeadPassenger: index === 0,
      paxType: source.paxType || source.type || "Adult",
      email: source.email || null,
      phone: source.phone || source.mobile || null,
    };
  }

  buildTravellers(originalBooking) {
    if (Array.isArray(originalBooking?.travellers) && originalBooking.travellers.length) {
      return originalBooking.travellers.map((traveller, index) => this.toTraveller(traveller, index));
    }

    if (Array.isArray(originalBooking?.passengerDetails) && originalBooking.passengerDetails.length) {
      return originalBooking.passengerDetails.map((traveller, index) =>
        this.toTraveller(traveller, index),
      );
    }

    return [this.toTraveller({}, 0)];
  }

  parseDurationToMinutes(duration, departureTime, arrivalTime) {
    if (typeof duration === "number" && Number.isFinite(duration)) {
      return duration;
    }

    if (typeof duration === "string") {
      const match = duration.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i);
      if (match && (match[1] || match[2])) {
        return Number(match[1] || 0) * 60 + Number(match[2] || 0);
      }
    }

    if (departureTime && arrivalTime) {
      const diff = Math.round((new Date(arrivalTime) - new Date(departureTime)) / 60000);
      if (Number.isFinite(diff) && diff > 0) {
        return diff;
      }
    }

    return 0;
  }

  buildSegmentAirports(segment = {}) {
    const originCode = segment.origin || segment.originCode || "NA";
    const destinationCode = segment.destination || segment.destinationCode || "NA";

    return {
      origin: {
        AirportCode: originCode,
        AirportName: segment.originAirportName || `${originCode} Airport`,
        CityName: segment.originCity || originCode,
        Terminal: segment.originTerminal || "",
      },
      destination: {
        AirportCode: destinationCode,
        AirportName: segment.destinationAirportName || `${destinationCode} Airport`,
        CityName: segment.destinationCity || destinationCode,
        Terminal: segment.destinationTerminal || "",
      },
    };
  }

  buildTboSegments(selectedFlight) {
    const rawSegments = Array.isArray(selectedFlight?.segments) && selectedFlight.segments.length
      ? selectedFlight.segments
      : [selectedFlight];

    return rawSegments.map((segment, index) => {
      const airports = this.buildSegmentAirports(segment);
      return {
        Origin: {
          Airport: airports.origin,
          DepTime: segment.departureTime || selectedFlight.departureTime,
        },
        Destination: {
          Airport: airports.destination,
          ArrTime: segment.arrivalTime || selectedFlight.arrivalTime,
        },
        Airline: {
          AirlineCode:
            segment.airlineCode || selectedFlight.airlineCode || selectedFlight.airline || "XX",
          AirlineName:
            segment.airlineName || selectedFlight.airlineName || selectedFlight.airline || "Airline",
          FlightNumber:
            segment.flightNumber || selectedFlight.flightNumber || `${index + 1}`,
        },
        FlightNumber: segment.flightNumber || selectedFlight.flightNumber || `${index + 1}`,
        Duration: this.parseDurationToMinutes(
          segment.duration || selectedFlight.duration,
          segment.departureTime || selectedFlight.departureTime,
          segment.arrivalTime || selectedFlight.arrivalTime,
        ),
        CabinClass: 2,
        Baggage: segment.baggage || "15 KG",
        CabinBaggage: segment.cabinBaggage || "7 KG",
      };
    });
  }

  buildSyntheticBooking({ originalBooking, request, selectedFlight, pricingSnapshot }) {
    const travellers = this.buildTravellers(originalBooking);
    const tboSegments = this.buildTboSegments(selectedFlight);
    const rawSegmentSnapshot = tboSegments.map((segment, index) => ({
      origin: segment.Origin.Airport.AirportCode,
      destination: segment.Destination.Airport.AirportCode,
      departureTime: segment.Origin.DepTime,
      arrivalTime: segment.Destination.ArrTime,
      airlineCode: segment.Airline.AirlineCode,
      airlineName: segment.Airline.AirlineName,
      flightNumber: segment.Airline.FlightNumber,
      journeyType: index > 0 ? "return" : "onward",
      baggage: segment.Baggage,
      cabinBaggage: segment.CabinBaggage,
      duration: segment.Duration,
    }));
    const requestSelectedSsr =
      request?.metadata?.selectedSSR ??
      request?.activeTicketSnapshot?.ssrSnapshot ??
      request?.activeTicketSnapshot?.ssr ??
      {};
    const normalizedSsrSnapshot = normalizeSsrSnapshot(requestSelectedSsr, rawSegmentSnapshot);

    let baseFare = Number(
      pricingSnapshot?.newBaseFare ??
      pricingSnapshot?.baseFare ??
      selectedFlight?.baseFare ??
      0
    );
    let tax = Number(
      pricingSnapshot?.newTaxes ??
      pricingSnapshot?.tax ??
      selectedFlight?.tax ??
      0
    );
    let newFare = Number(
      pricingSnapshot?.newFare ??
      selectedFlight?.newFare ??
      selectedFlight?.fare ??
      0
    );
    let seatSSR = 0;
    let mealSSR = 0;
    let baggageSSR = 0;

    const ledger = request.financialLedger;
    const history = request.pricingHistory || [];

    if (ledger && history.length > 0) {
      const lastEntry = history[history.length - 1];
      baseFare = Number(lastEntry.newBaseFare ?? baseFare);
      tax = Number(lastEntry.newTaxes ?? tax);
      newFare = Number(lastEntry.newFare ?? newFare);
      seatSSR = Number(lastEntry.newSeatSSR ?? 0);
      mealSSR = Number(lastEntry.newMealSSR ?? 0);
      baggageSSR = Number(lastEntry.newBaggageSSR ?? 0);
    } else if (pricingSnapshot) {
      seatSSR = Number(pricingSnapshot.seatSSR ?? pricingSnapshot.seatCharges ?? 0);
      mealSSR = Number(pricingSnapshot.mealSSR ?? pricingSnapshot.mealCharges ?? 0);
      baggageSSR = Number(pricingSnapshot.baggageSSR ?? pricingSnapshot.baggageCharges ?? 0);
    }

    const totalSSR = seatSSR + mealSSR + baggageSSR;

    const syntheticBooking = {
      bookingReference:
        originalBooking?.bookingReference ||
        originalBooking?.orderId ||
        request.requestId,
      createdAt: originalBooking?.createdAt || new Date(),
      travellers,
      flightRequest: {
        segments: rawSegmentSnapshot,
        ssrSnapshot: normalizedSsrSnapshot,
        fareQuote: {
          Results: [
            {
              ResultFareType: selectedFlight?.cabinClass || "Regular Fare",
              IsFreeMealAvailable: false,
            },
          ],
        },
      },
      bookingSnapshot: {
        fareType: selectedFlight?.cabinClass || originalBooking?.bookingSnapshot?.fareType || "Regular Fare",
        cabinClass:
          selectedFlight?.cabinClass || originalBooking?.bookingSnapshot?.cabinClass || "Economy",
        amount: newFare + totalSSR,
      },
      pricingSnapshot: {
        totalAmount: newFare + totalSSR,
        baseAmount: baseFare,
        taxes: tax,
      },
      bookingResult: {
        onwardPNR: request.originalPnr || request.pnr,
        pnr: request.originalPnr || request.pnr,
        providerResponse: {
          Response: {
            Response: {
              FlightItinerary: {
                TBOConfNo: request.originalPnr || request.pnr,
                Segments: tboSegments,
                Fare: {
                  BaseFare: baseFare,
                  Tax: tax,
                  PublishedFare: newFare,
                  OfferedFare: newFare,
                  TotalSeatCharges: seatSSR,
                  TotalMealCharges: mealSSR,
                  TotalBaggageCharges: baggageSSR,
                },
                Passenger: [
                  {
                    Ssr: [],
                  },
                ],
              },
            },
          },
        },
      },
      reissueMeta: {
        isReissued: true,
        headerTitle: "REISSUED E-TICKET",
        originalPnr: request.originalPnr || request.pnr,
        generatedAt: new Date(),
        reissueReferenceId: request.requestId,
      },
    };

    syntheticBooking.activeTicketSnapshot = buildActiveTicketSnapshotFromState(syntheticBooking, {
      pnrOverride: request.originalPnr || request.pnr || null,
      ssrSnapshotOverride: normalizedSsrSnapshot,
      segmentsOverride: rawSegmentSnapshot,
    });

    return syntheticBooking;
  }

  extractOriginalItinerary(originalBooking = {}) {
    const rawSegments = Array.isArray(originalBooking?.flightRequest?.segments)
      ? originalBooking.flightRequest.segments
      : [];

    return rawSegments.map((segment) => ({
      origin:
        segment?.origin ||
        segment?.Origin?.Airport?.AirportCode ||
        segment?.OriginAirportCode ||
        null,
      destination:
        segment?.destination ||
        segment?.Destination?.Airport?.AirportCode ||
        segment?.DestinationAirportCode ||
        null,
      departureTime:
        segment?.departureTime ||
        segment?.departureDateTime ||
        segment?.Origin?.DepTime ||
        null,
      arrivalTime:
        segment?.arrivalTime ||
        segment?.arrivalDateTime ||
        segment?.Destination?.ArrTime ||
        null,
      airlineCode:
        segment?.airlineCode ||
        segment?.Airline?.AirlineCode ||
        segment?.AirlineCode ||
        null,
      flightNumber:
        segment?.flightNumber ||
        segment?.Airline?.FlightNumber ||
        segment?.FlightNumber ||
        null,
    }));
  }

  async generateReissuedTicket({ request, actor, selectedFlight }) {
    this.ensureDirectory();

    if (!selectedFlight) {
      throw new ApiError(400, "Cannot generate revised ticket without selected flight");
    }

    const originalBooking = await BookingRequest.findById(request.bookingId);
    if (!originalBooking) {
      throw new ApiError(404, "Original booking not found");
    }

    const pricingSnapshot = request.reissuePricingSnapshot || selectedFlight.pricingSnapshot || {};
    const syntheticBooking = this.buildSyntheticBooking({
      originalBooking,
      request,
      selectedFlight,
      pricingSnapshot,
    });

    try {
      const generatedTicketPath = await pdfService.generateFlightTicketFile({
        booking: syntheticBooking,
        journeyType: "onward",
        outputDir: this.baseUploadPath,
        fileName: `reissued-ticket-${request.requestId}.pdf`,
      });

      const fileName = path.basename(generatedTicketPath);
      const generatedAt = new Date();

      logger.info("offline_reissue_ticket_generated", {
        requestId: request.requestId,
        fileName,
        generatedBy: actor?._id || actor?.id || null,
      });

      return {
        generatedTicketUrl: `/uploads/reissued-tickets/${fileName}`,
        generatedTicketPath,
        fileName,
        generatedAt,
        fareDifference: roundCurrency(request.fareDifference || pricingSnapshot.fareDifference || 0),
        reissueCharge: roundCurrency(
          request.reissueCharges || pricingSnapshot.reissueCharge || 0,
        ),
        totalCollection: roundCurrency(
          request.totalAdjustment || pricingSnapshot.totalEstimate || 0,
        ),
        originalItinerary: this.extractOriginalItinerary(originalBooking),
        newItinerary: selectedFlight?.segments || [selectedFlight],
      };
    } catch (error) {
      logger.error("offline_reissue_ticket_generation_failed", {
        requestId: request.requestId,
        error: error.message,
      });
      throw new ApiError(500, "Failed to generate revised ticket");
    }
  }
}

function roundCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
}

module.exports = new ReissueTicketGenerationService();
