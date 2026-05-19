const axios = require("axios");
const config = require("../../../../../config/tbo.config");
const logger = require("../../../../../utils/logger");
const ApiError = require("../../../../../utils/ApiError");
const { parseMiniFareRules } = require("../../utils/miniFareRuleParser");
const {
  resolveBookingData,
} = require("../../../../../utils/bookingResolver.util");

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

/**
 * Safely extract a plain IATA airport code string from any TBO segment field shape:
 *
 * TBO FlightItinerary segment (real shape from bookFlight/ticketFlight response):
 *   segment.Origin = { Airport: { AirportCode: "DEL", ... } }
 *
 * Legacy / flat shapes also supported:
 *   "DEL"
 *   { Airport: "DEL" }
 *   { AirportCode: "DEL" }
 *   { Code: "DEL" }
 *
 * NEVER returns an object — always a string or null.
 */
const extractAirportCode = (value) => {
  if (!value) return null;

  // ── Plain string ──
  if (typeof value === "string") {
    const s = value.trim().toUpperCase();
    return s || null;
  }

  if (typeof value === "object") {
    // ── TBO real shape: { Airport: { AirportCode: "DEL" } } ──
    if (value.Airport && typeof value.Airport === "object") {
      const code = value.Airport.AirportCode || value.Airport.Code || value.Airport.airport;
      if (code && typeof code === "string") return code.trim().toUpperCase() || null;
    }

    // ── Flat Airport string: { Airport: "DEL" } ──
    if (typeof value.Airport === "string") {
      const s = value.Airport.trim().toUpperCase();
      return s || null;
    }

    // ── Direct code fields ──
    const direct =
      value.AirportCode ||
      value.airportCode ||
      value.Code ||
      value.code ||
      value.airport ||
      value.iata ||
      "";
    if (direct && typeof direct === "string") return direct.trim().toUpperCase() || null;
  }

  return null;
};

/**
 * Safely extract a plain IATA airline code from a TBO Airline object.
 * TBO shape: segment.Airline = { AirlineCode: "IX", AirlineName: "Air India Express" }
 */
const extractAirlineCode = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.trim().toUpperCase() || null;
  if (typeof value === "object") {
    const code =
      value.AirlineCode ||
      value.airlineCode ||
      value.Code ||
      value.code ||
      "";
    if (code && typeof code === "string") return code.trim().toUpperCase() || null;
  }
  return null;
};

class TboReissueProvider {
  constructor() {
    this.tokens = {};
  }

  getEnv() {
    const envFlag = (process.env.TBO_ENV || process.env.NODE_ENV || "").toLowerCase();
    return ["production", "prod", "live", "staging", "test", "uat"].includes(envFlag)
      ? "live"
      : "dummy";
  }

  isExpired(tokenObj) {
    if (!tokenObj) return true;
    return Date.now() > tokenObj.expiry;
  }

  async authenticate(env) {
    const cfg = config[env];
    const payload = {
      ClientId: cfg.credentials.clientId,
      UserName: cfg.credentials.username,
      Password: cfg.credentials.password,
      EndUserIp: cfg.endUserIp,
    };

    const url = config.resolveUrl(env, "authenticate");
    const { data } = await axios.post(url, payload, { timeout: config.timeout });
    const token = data?.TokenId || data?.Response?.TokenId;
    const status = data?.Status ?? data?.Response?.ResponseStatus;

    if (!token || status !== 1) {
      throw new Error(
        data?.Error?.ErrorMessage ||
          data?.Response?.Error?.ErrorMessage ||
          "TBO reissue authentication failed",
      );
    }

    this.tokens[env] = {
      value: token,
      expiry: Date.now() + 24 * 60 * 60 * 1000,
    };
    return token;
  }

  async getToken(env) {
    if (this.isExpired(this.tokens[env])) {
      await this.authenticate(env);
    }
    return this.tokens[env].value;
  }

  async execute(endpoint, payload, isRetry = false) {
    const env = this.getEnv();
    const token = await this.getToken(env);
    const url = config.resolveUrl(env, endpoint);
    const finalPayload = {
      EndUserIp: config[env].endUserIp,
      TokenId: token,
      ...payload,
    };

    const startedAt = Date.now();

    try {
      const response = await axios.post(url, finalPayload, {
        timeout: config.timeout,
      });

      const apiErrorCode = response?.data?.Response?.Error?.ErrorCode;
      if (!isRetry && apiErrorCode && [4, 6].includes(apiErrorCode)) {
        this.tokens[env] = null;
        return this.execute(endpoint, payload, true);
      }

      logger.info("TBO reissue provider call completed", {
        endpoint,
        latencyMs: Date.now() - startedAt,
        correlationId: payload?.CorrelationId || payload?.TrackingId || null,
        payload: finalPayload,
        responseStatus: response?.data?.Response?.ResponseStatus ?? response?.data?.Status,
      });

      return response.data;
    } catch (error) {
      const responseData = error?.response?.data;
      const message = responseData
        ? typeof responseData === "string"
          ? responseData
          : JSON.stringify(responseData)
        : error.message;
      logger.error("TBO REISSUE PROVIDER ERROR", {
        endpoint,
        latencyMs: Date.now() - startedAt,
        payload: finalPayload,
        error: message,
        response: responseData,
      });
      const wrapped = new ApiError(
        error.response?.status || error.status || 502,
        error.message || "TBO provider call failed",
      );
      wrapped.providerMessage = message;
      wrapped.code = error.code || "TBO_PROVIDER_CALL_FAILED";
      throw wrapped;
    }
  }

  buildSegments(booking, newJourney = {}, journeyType = 1) {
    const originalSegments = booking?.flightRequest?.segments || [];
    if (!originalSegments.length) return [];

    // FlightCabinClass: 1 = All (used for reissue search to get widest results)
    const cabinClass = 1;

    const toIso = (dateStr) => {
      if (!dateStr) return null;
      const d = String(dateStr).trim();
      // Already a full ISO datetime
      if (/\d{4}-\d{2}-\d{2}T/.test(d)) return d;
      // Date-only → add midnight time
      if (/\d{4}-\d{2}-\d{2}/.test(d)) return `${d.slice(0, 10)}T00:00:00`;
      return d;
    };

    if (journeyType === 1) {
      // JourneyType 1 = OneWay
      const seg = originalSegments[0];
      const origin = extractAirportCode(seg?.origin || seg?.Origin || seg?.originAirport || null);
      const destination = extractAirportCode(seg?.destination || seg?.Destination || seg?.destinationAirport || null);
      return [{
        Origin: origin,
        Destination: destination,
        PreferredDepartureTime: toIso(newJourney.departureDate) || `${String(newJourney.departureDate || "").slice(0, 10)}T00:00:00`,
        PreferredArrivalTime: toIso(newJourney.departureDate) || `${String(newJourney.departureDate || "").slice(0, 10)}T00:00:00`,
        FlightCabinClass: cabinClass,
      }];
    } else {
      // JourneyType 2 = Return
      const seg = originalSegments[0];
      const origin = extractAirportCode(seg?.origin || seg?.Origin || seg?.originAirport || null);
      const destination = extractAirportCode(seg?.destination || seg?.Destination || seg?.destinationAirport || null);
      return [
        {
          Origin: origin,
          Destination: destination,
          PreferredDepartureTime: toIso(newJourney.departureDate) || `${String(newJourney.departureDate || "").slice(0, 10)}T00:00:00`,
          PreferredArrivalTime: toIso(newJourney.departureDate) || `${String(newJourney.departureDate || "").slice(0, 10)}T00:00:00`,
          FlightCabinClass: cabinClass,
        },
        {
          Origin: destination,
          Destination: origin,
          PreferredDepartureTime: toIso(newJourney.returnDate) || `${String(newJourney.returnDate || "").slice(0, 10)}T00:00:00`,
          PreferredArrivalTime: toIso(newJourney.returnDate) || `${String(newJourney.returnDate || "").slice(0, 10)}T00:00:00`,
          FlightCabinClass: cabinClass,
        },
      ];
    }
  }

  buildTboReissueSearchPayload({ booking, providerPnr, providerBookingId, newJourney, preferredAirlines = [] }) {
    // ── Resolve FlightItinerary from all known TBO response shapes ──
    // bookFlight response is stored as: { pnr, bookingId, raw: tboFullResponse }
    // tboFullResponse shape: { Response: { FlightItinerary: { Segments, PNR, BookingId } } }
    const flightItinerary =
      // Correct single-nesting (bookFlight wrapper stores raw TBO response)
      booking?.bookingResult?.providerResponse?.raw?.Response?.FlightItinerary ||
      // Double-nesting fallback (some TBO endpoints)
      booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary ||
      // Direct under providerResponse (legacy/LCC paths)
      booking?.bookingResult?.providerResponse?.Response?.FlightItinerary ||
      booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary ||
      null;

    logger.info("TBO REISSUE: flightItinerary resolved", {
      bookingId: booking?._id,
      hasItinerary: !!flightItinerary,
      segmentCount: toArray(flightItinerary?.Segments || flightItinerary?.Segment).length,
    });

    const rawSegments = toArray(
      flightItinerary?.Segments ||
      flightItinerary?.Segment ||
      [],
    );

    // ── Build ISO datetime: takes a new date (YYYY-MM-DD or ISO) + original time ──
    const toIsoDateTime = (dateInput, originalDateTime) => {
      const datePart = String(dateInput || "").split("T")[0].trim();
      if (!datePart) return "";
      let timePart = "00:00:00";
      if (originalDateTime) {
        const s = String(originalDateTime).trim();
        if (s.includes("T")) timePart = s.split("T")[1].slice(0, 8);
        else if (s.includes(" ")) timePart = s.split(" ")[1].slice(0, 8);
      }
      return `${datePart}T${timePart}`;
    };

    // ── Parse segments ──
    // TBO real segment shape from FlightItinerary:
    //   segment.Origin      = { Airport: { AirportCode: "DEL", ... } }
    //   segment.Destination = { Airport: { AirportCode: "BLR", ... } }
    //   segment.Airline     = { AirlineCode: "IX", AirlineName: "Air India Express" }
    let parsedSegments = [];
    let resolvedAirlineCode = null;

    if (rawSegments.length) {
      parsedSegments = rawSegments.map((segment, index) => {
        const originalDepTime = segment?.DepTime || segment?.DepartureDateTime || segment?.departureDateTime || "";
        const originalArrTime = segment?.ArrTime || segment?.ArrivalDateTime || segment?.arrivalDateTime || originalDepTime;

        const isReturnSegment = index > 0;
        const segmentDate = isReturnSegment ? newJourney?.returnDate : newJourney?.departureDate;

        // ── Extract airport codes — handle deeply nested TBO shape ──
        // segment.Origin = { Airport: { AirportCode: "DEL" } }
        const originCode = extractAirportCode(segment?.Origin || segment?.origin || null);
        const destinationCode = extractAirportCode(segment?.Destination || segment?.destination || null);

        // ── Extract airline IATA code (not name) from first segment ──
        if (index === 0 && !resolvedAirlineCode) {
          resolvedAirlineCode = extractAirlineCode(
            segment?.Airline || segment?.airline || segment?.OperatingCarrier || null
          );
        }

        if (!originCode || !destinationCode) {
          logger.warn("TBO REISSUE SEGMENT MISSING AIRPORT CODES", {
            index,
            resolvedOrigin: originCode,
            resolvedDestination: destinationCode,
            rawOrigin: segment?.Origin,
            rawDestination: segment?.Destination,
          });
          return null;
        }

        return {
          Origin: originCode,           // IATA code string e.g. "DEL"
          Destination: destinationCode, // IATA code string e.g. "BLR"
          PreferredDepartureTime: toIsoDateTime(segmentDate, originalDepTime),
          PreferredArrivalTime: toIsoDateTime(segmentDate, originalArrTime),
          FlightCabinClass: segment?.CabinClass || 1,  // use original cabin class
        };
      }).filter(Boolean);
    }

    // ── Validate airport codes — throw before sending invalid payload to TBO ──
    if (!parsedSegments.length || !parsedSegments[0].Origin || !parsedSegments[0].Destination) {
      // Before throwing, try fallback from booking.flightRequest.segments
      logger.warn("TBO REISSUE: FlightItinerary segments empty or missing codes — trying flightRequest.segments fallback", {
        bookingId: booking?._id,
        rawSegmentsCount: rawSegments.length,
        parsedCount: parsedSegments.length,
        newJourney,
      });

      const flightReqSegments = toArray(booking?.flightRequest?.segments);
      const fallbackSegments = flightReqSegments.map((seg, index) => {
        const isReturnSegment = index > 0;
        const segmentDate = isReturnSegment ? newJourney?.returnDate : newJourney?.departureDate;
        const isoDate = toIsoDateTime(segmentDate, null);

        const originCode = extractAirportCode(
          seg?.origin || seg?.Origin || seg?.originAirport || seg?.departureAirport || null
        );
        const destinationCode = extractAirportCode(
          seg?.destination || seg?.Destination || seg?.destinationAirport || seg?.arrivalAirport || null
        );

        if (!originCode || !destinationCode) {
          logger.warn("TBO REISSUE FALLBACK SEGMENT MISSING AIRPORT CODES", { index, seg });
          return null;
        }

        return {
          Origin: originCode,
          Destination: destinationCode,
          PreferredDepartureTime: isoDate,
          PreferredArrivalTime: isoDate,
          FlightCabinClass: 1,
        };
      }).filter(Boolean);

      if (!fallbackSegments.length) {
        throw new ApiError(
          400,
          "Failed to resolve airport codes for reissue search — both FlightItinerary segments and flightRequest.segments are empty or missing airport codes",
          "REISSUE_AIRPORT_CODE_MISSING",
        );
      }

      parsedSegments = fallbackSegments;
    }

    // ── Resolve airline code: prefer segment-extracted IATA code, fallback to passed-in list ──
    // CRITICAL: PreferredAirlines must be IATA airline code ["IX"], NOT airline name ["Air India Express"]
    const finalAirlineCodes = resolvedAirlineCode
      ? [resolvedAirlineCode]
      : preferredAirlines.filter(Boolean);

    // JourneyType: 1 = OneWay, 2 = Return
    const journeyType = parsedSegments.length > 1 ? 2 : 1;
    const passengerCounts = this.resolveReissuePassengerCounts(booking);

    const payload = {
      AdultCount: passengerCounts.adults,
      ChildCount: passengerCounts.children,
      InfantCount: passengerCounts.infants,
      DirectFlight: false,
      OneStopFlight: false,
      JourneyType: journeyType,           // 1 = OneWay, 2 = Return
      PreferredAirlines: finalAirlineCodes, // IATA codes only e.g. ["IX"], never full names
      Segments: parsedSegments,            // each segment has plain-string Origin & Destination
      Sources: null,
      SearchType: 1,
      Pnr: String(providerPnr).trim(),
      BookingId: Number(providerBookingId) || String(providerBookingId).trim(),
    };

    // ── Required pre-call validation log ──
    logger.info("TBO REISSUE SEARCH PAYLOAD", { payload });

    return payload;
  }

  resolveReissuePassengerCounts(booking = {}) {
    const flightItinerary =
      booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary ||
      booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary ||
      null;

    const passengers = toArray(flightItinerary?.Passenger || flightItinerary?.Passengers || []);
    const adults = passengers.filter((p) =>
      ["ADULT", "Adult", "adult", "ADT"].includes(p?.PaxType || p?.PassengerType || p?.Type),
    ).length;
    const children = passengers.filter((p) =>
      ["CHILD", "Child", "child", "CHD"].includes(p?.PaxType || p?.PassengerType || p?.Type),
    ).length;
    const infants = passengers.filter((p) =>
      ["INFANT", "Infant", "infant", "INF"].includes(p?.PaxType || p?.PassengerType || p?.Type),
    ).length;

    if (adults + children + infants > 0) {
      return { adults: Math.max(adults, 1), children, infants };
    }

    const travellers = booking?.travellers || booking?.passengers || [];
    const fallbackAdults = travellers.filter((p) => p?.paxType === "ADULT").length || 1;
    const fallbackChildren = travellers.filter((p) => p?.paxType === "CHILD").length || 0;
    const fallbackInfants = travellers.filter((p) => p?.paxType === "INFANT").length || 0;
    return { adults: fallbackAdults, children: fallbackChildren, infants: fallbackInfants };
  }

  extractResults(searchResponse) {
    const results = searchResponse?.Response?.Results || searchResponse?.Results || [];
    return toArray(results).flat().filter(Boolean);
  }

  normalizeSearchResponse(searchResponse) {
    const itineraries = this.extractResults(searchResponse);
    const firstResult = itineraries[0] || null;
    const miniFareRules =
      firstResult?.MiniFareRules ||
      firstResult?.Fare?.MiniFareRules ||
      firstResult?.FareRules ||
      null;
    const parsedMiniFareRules = parseMiniFareRules(miniFareRules);

    logger.info("TBO REISSUE SEARCH NORMALIZED", {
      traceId: searchResponse?.Response?.TraceId || searchResponse?.TraceId,
      itinerariesCount: itineraries.length,
      firstResultIndex: firstResult?.ResultIndex,
      onlineRefundAllowed: parsedMiniFareRules?.onlineReissueAllowed,
    });


    return {
      traceId: searchResponse?.Response?.TraceId || searchResponse?.TraceId || null,
      itineraries,
      firstResultIndex: firstResult?.ResultIndex ?? null,
      miniFareRules,
      parsedMiniFareRules,
      onlineRefundAllowed: parsedMiniFareRules?.onlineReissueAllowed ?? false,
    };
  }

  async searchReissueFlights({ booking, reissueRequest }) {
    // ── Step 1: Resolve all provider identifiers from booking document ──
    const resolved = resolveBookingData(booking);


    // Prefer reissueRequest stored values (set at request creation) over re-resolution
    const supplierPnr = reissueRequest.originalPnr || resolved.pnr;
    const supplierBookingId = reissueRequest.originalBookingId || resolved.bookingId;
    const supplierTraceId =
      reissueRequest?.metadata?.originalTraceId ||
      resolved.traceId ||
      null;
    const supplierResultIndex =
      reissueRequest?.metadata?.originalResultIndex ||
      booking?.flightRequest?.resultIndex ||
      null;
    const supplierAirline = resolved.airlineCode || reissueRequest.airline || null;

    // ── Step 2: Full diagnostic dump — required for debugging PNR resolution failures ──
    logger.info("RESOLVED REISSUE IDENTIFIERS", {
      bookingMongoId: booking._id?.toString(),
      resolvedPnr: supplierPnr,
      resolvedBookingId: supplierBookingId,
      resolvedTraceId: supplierTraceId,
      // Full providerResponse dump to identify the actual PNR storage path
      providerResponse: booking.bookingResult?.providerResponse,
      storedOnRequest: {
        originalPnr: reissueRequest.originalPnr,
        originalBookingId: reissueRequest.originalBookingId,
      },
      resolvedFrom: resolved.resolvedFrom,
      resolverMissingFields: resolved.missingFields,
      supplierAirline,
      supplierResultIndex,
    });

    // ── Step 3: Strict validation with specific error codes ──
    if (!supplierPnr) {
      throw new ApiError(
        400,
        "Resolved provider PNR missing — cannot call TBO reissue search without PNR",
        "REISSUE_PNR_MISSING",
      );
    }

    if (!supplierBookingId) {
      throw new ApiError(
        400,
        "Resolved provider BookingId missing — cannot call TBO reissue search without BookingId",
        "REISSUE_BOOKING_ID_MISSING",
      );
    }

    logger.info("TBO REISSUE SEARCH IDENTIFIERS CONFIRMED", {
      bookingMongoId: booking._id,
      providerPnr: supplierPnr,
      providerBookingId: supplierBookingId,
      traceId: supplierTraceId,
      reissueRequestId: reissueRequest._id,
      newJourney: reissueRequest.newJourney,
      resolvedPnrFrom: resolved.resolvedFrom?.pnr,
      resolvedBookingIdFrom: resolved.resolvedFrom?.bookingId,
    });

    const preferredAirlines = [supplierAirline].filter(Boolean);

    const payload = this.buildTboReissueSearchPayload({
      booking,
      providerPnr: supplierPnr,
      providerBookingId: supplierBookingId,
      newJourney: reissueRequest.newJourney,
      preferredAirlines,
    });

    logger.info("TBO REISSUE SEARCH REQUEST", {
      payload,
      bookingMongoId: booking?._id,
      resolvedPnr: supplierPnr,
      resolvedBookingId: supplierBookingId,
    });

    const response = await this.execute("flightSearch", payload);

    logger.info("TBO REISSUE SEARCH RESPONSE", {
      response,
      status: response?.Response?.ResponseStatus ?? response?.Status,
      traceId: response?.Response?.TraceId || response?.TraceId,
      resultsCount: this.extractResults(response).length,
    });

    const status = response?.Response?.ResponseStatus ?? response?.Status ?? null;
    const errorCode = response?.Response?.Error?.ErrorCode ?? null;
    const errorMessage =
      response?.Response?.Error?.ErrorMessage ||
      response?.Error?.ErrorMessage ||
      response?.ErrorMessage ||
      null;

    if (status !== 1) {
      const isSandboxOrServicingRestriction =
        // TBO returns ResponseStatus 3 with this exact message for sandbox/unsupported servicing
        (status === 3 || status === 4 || status === 6) &&
        /please\s+provide\s+pnr\s+for\s+reissue|pnr.*reissue|reissue.*pnr|not\s+eligible\s+for\s+reissue|reissue.*not\s+supported|servicing\s+not\s+available/i.test(
          errorMessage || "",
        );

      if (isSandboxOrServicingRestriction) {
        // ── Production note: this also fires when the PNR is not reissue-enabled in production ──
        logger.warn(
          "TBO online reissue may require production credentials or a supported servicing PNR",
          {
            bookingMongoId: booking?._id,
            status,
            errorCode,
            providerMessage: errorMessage,
            pnr: payload?.Pnr,
            bookingId: payload?.BookingId,
          },
        );

        const sandboxError = new ApiError(
          400,
          "Online reissue is currently unavailable for this booking/airline.",
        );
        sandboxError.code = "TBO_SANDBOX_REISSUE_UNSUPPORTED";
        sandboxError.providerMessage =
          "TBO sandbox or airline does not support online reissue for this PNR. " +
          (errorMessage || "");
        sandboxError.fallbackAvailable = true;
        sandboxError.mode = "OFFLINE";
        throw sandboxError;
      }

      // ── All other TBO errors ──
      const apiError = new ApiError(
        400,
        errorMessage || "TBO reissue search failed from supplier side",
      );
      apiError.code = errorCode
        ? `TBO_REISSUE_SEARCH_${errorCode}`
        : "REISSUE_NOT_AVAILABLE";
      apiError.providerMessage = errorMessage;
      throw apiError;
    }

    return response;
  }

  async getReissueFareQuote({ traceId, resultIndex, correlationId }) {
    return this.execute("flightFareQuote", {
      TraceId: traceId,
      ResultIndex: resultIndex,
      CorrelationId: correlationId,
    });
  }

  extractTicketIds(booking = {}) {
    const passengers =
      booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Passenger ||
      [];

    return passengers
      .map((passenger) => passenger?.Ticket?.TicketId)
      .filter(Boolean);
  }

  buildTicketData(ticketData = {}, booking = {}) {
    const data = {
      TourCode: ticketData?.TourCode || booking?.ticketData?.TourCode || "",
      Endorsement:
        ticketData?.Endorsement || booking?.ticketData?.Endorsement || "Corporate full reissue",
      CorporateCode:
        ticketData?.CorporateCode || booking?.ticketData?.CorporateCode || booking?.corporateCode || "",
      AgentDealCode: ticketData?.AgentDealCode || booking?.ticketData?.AgentDealCode || "",
    };

    const missing = Object.entries(data)
      .filter(([key, value]) => !value && key !== "AgentDealCode")
      .map(([key]) => key);

    if (missing.length) {
      logger.warn("TBO ticket reissue payload missing optional ticket metadata", {
        bookingId: booking?._id,
        missingFields: missing,
        ticketDataSource: ticketData?.TourCode ? "request" : "booking",
      });
    }

    return data;
  }

  async ticketReissue({ booking, reissueRequest, remarks, ticketData }) {
    const ticketIds = this.extractTicketIds(booking);
    if (!ticketIds.length) {
      throw new ApiError(400, "Unable to locate ticket IDs for ticket reissue");
    }

    const env = this.getEnv();
    const cfg = config[env];
    const endpoint = cfg?.endpoints?.flightTicketReissue;

    if (!endpoint) {
      throw new ApiError(400, "TicketReissue endpoint not available for this environment");
    }

    const basePayload = {
      BookingId: reissueRequest.originalBookingId,
      Pnr: reissueRequest.originalPnr,
      TraceId: reissueRequest.metadata?.searchTraceId || null,
      ResultIndex: reissueRequest.metadata?.selectedResultIndex ?? null,
      TicketIds: ticketIds,
      TicketId: ticketIds.join(","),
      Remarks: remarks || "Enterprise online reissue execution",
      TicketData: this.buildTicketData(ticketData, booking),
      CorrelationId: reissueRequest.correlationId,
    };

    logger.info("TBO TICKET REISSUE PAYLOAD", basePayload);

    const response = await this.execute("flightTicketReissue", basePayload);

    logger.info("TBO TICKET REISSUE RESPONSE", {
      status: response?.Response?.ResponseStatus,
      error: response?.Response?.Error?.ErrorMessage,
      changeRequestId: response?.Response?.ChangeRequestId,
      newBookingId: response?.Response?.NewBookingId,
      newPnr: response?.Response?.NewPNR,
    });

    if (response?.Response?.ResponseStatus !== 1) {
      const apiError = new ApiError(
        400,
        response?.Response?.Error?.ErrorMessage || "Ticket reissue failed from supplier side",
      );
      apiError.providerMessage = response?.Response?.Error?.ErrorMessage || null;
      apiError.code = response?.Response?.Error?.ErrorCode
        ? `TBO_TICKET_REISSUE_${response.Response.Error.ErrorCode}`
        : "TICKET_REISSUE_FAILED";
      throw apiError;
    }

    return response;
  }

  normalizeQuote(searchResponse, quoteResponse, selectedResultIndex = null) {
    const searchResults = this.extractResults(searchResponse);
    const searchResult =
      searchResults.find(
        (item) =>
          selectedResultIndex != null &&
          String(item?.ResultIndex) === String(selectedResultIndex),
      ) ||
      searchResults[0] ||
      null;
    const quoteResult = quoteResponse?.Response?.Results?.[0] || quoteResponse?.Results?.[0] || {};
    const rawMiniFareRules =
      quoteResult?.MiniFareRules ||
      quoteResult?.Fare?.MiniFareRules ||
      quoteResult?.FareRules ||
      searchResult?.MiniFareRules ||
      null;
    const parsedMiniFareRules = parseMiniFareRules(rawMiniFareRules);
    const supplierReissueCharges =
      quoteResult?.Fare?.SupplierReissueCharges ||
      quoteResult?.SupplierReissueCharges ||
      0;
    const publishedFare =
      quoteResult?.Fare?.PublishedFare ||
      quoteResult?.Fare?.OfferedFare ||
      searchResult?.Fare?.PublishedFare ||
      0;

    return {
      searchTraceId: searchResponse?.Response?.TraceId || searchResponse?.TraceId || null,
      selectedResultIndex: searchResult?.ResultIndex ?? quoteResult?.ResultIndex ?? null,
      itinerary: searchResult || quoteResult,
      publishedFare,
      supplierReissueCharges,
      quoteResult,
      miniFareRules: parsedMiniFareRules,
      onlineRefundAllowed: parsedMiniFareRules.onlineReissueAllowed,
    };
  }
}

module.exports = new TboReissueProvider();
