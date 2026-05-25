const axios = require("axios");
const config = require("../../../../../config/tbo.config");
const logger = require("../../../../../utils/logger");
const ApiError = require("../../../../../utils/ApiError");
const { parseMiniFareRules } = require("../../utils/miniFareRuleParser");
const providerReferenceService = require("../../../../../services/reissue/providerReference.service");
const {
  resolveBookingData,
} = require("../../../../../utils/bookingResolver.util");
const {
  buildOnlineReissueContext,
  validateOnlineReissueContext,
} = require("../../utils/onlineReissueContext.util");

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

  resolveReissuePassengerCountsFromContext(booking = {}, onlineReissueContext = {}) {
    const passengers = toArray(onlineReissueContext?.passengers);
    const mapType = (value) => String(value || "").trim().toUpperCase();

    const adults = passengers.filter((p) => ["ADULT", "ADT", "1"].includes(mapType(p?.paxType))).length;
    const children = passengers.filter((p) => ["CHILD", "CHD", "2"].includes(mapType(p?.paxType))).length;
    const infants = passengers.filter((p) => ["INFANT", "INF", "3"].includes(mapType(p?.paxType))).length;

    if (adults + children + infants > 0) {
      return { adults: Math.max(adults, 1), children, infants };
    }

    return this.resolveReissuePassengerCounts(booking);
  }

  buildTboReissueSearchPayloadFromContext({
    booking,
    reissueRequest,
    onlineReissueContext,
    providerPnr,
    providerBookingId,
    newJourney,
    preferredAirlines = [],
  }) {
    const toIsoDateTime = (dateInput, originalDateTime) => {
      const datePart = String(dateInput || originalDateTime || "").split("T")[0].trim();
      if (!datePart) return "";
      let timePart = "00:00:00";
      const sourceTime = String(originalDateTime || "").trim();
      if (sourceTime.includes("T")) timePart = sourceTime.split("T")[1].slice(0, 8);
      else if (sourceTime.includes(" ")) timePart = sourceTime.split(" ")[1].slice(0, 8);
      return `${datePart}T${timePart}`;
    };

    const createSearchSegment = (segments = [], dateInput) => {
      const first = segments[0] || {};
      const last = segments[segments.length - 1] || first;
      const origin = extractAirportCode(first?.origin || first?.Origin || null);
      const destination = extractAirportCode(last?.destination || last?.Destination || null);
      if (!origin || !destination) return null;

      return {
        Origin: origin,
        Destination: destination,
        PreferredDepartureTime: toIsoDateTime(
          dateInput || first?.departureTime,
          first?.departureTime,
        ),
        PreferredArrivalTime: toIsoDateTime(
          dateInput || last?.arrivalTime || first?.departureTime,
          last?.arrivalTime || first?.departureTime,
        ),
        FlightCabinClass: Number(first?.cabinClass) || 1,
      };
    };

    const onwardSegments = toArray(onlineReissueContext?.onwardSegments);
    const returnSegments = toArray(onlineReissueContext?.returnSegments);
    const journeyType = Number(
      onlineReissueContext?.journeyType || (returnSegments.length ? 2 : onwardSegments.length > 1 ? 3 : 1),
    );

    let parsedSegments = [];
    if (journeyType === 2) {
      const onward = createSearchSegment(onwardSegments, newJourney?.departureDate);
      const returning = createSearchSegment(returnSegments, newJourney?.returnDate);
      parsedSegments = [onward, returning].filter(Boolean);
    } else if (journeyType === 3) {
      parsedSegments = onwardSegments
        .map((segment, index) =>
          createSearchSegment(
            [segment],
            newJourney?.segments?.[index]?.departureDate || segment?.departureTime,
          ),
        )
        .filter(Boolean);
    } else {
      parsedSegments = [createSearchSegment(onwardSegments, newJourney?.departureDate)].filter(Boolean);
    }

    if (!parsedSegments.length) {
      const fallbackSegments = this.buildSegments(booking, newJourney, journeyType === 3 ? 1 : journeyType);
      parsedSegments = toArray(fallbackSegments).filter(
        (segment) => segment?.Origin && segment?.Destination,
      );
    }

    if (!parsedSegments.length) {
      const error = new ApiError(400, "Failed to resolve airport codes for reissue search");
      error.code = "REISSUE_AIRPORT_CODE_MISSING";
      throw error;
    }

    const resolvedAirlineCode =
      onwardSegments[0]?.airlineCode ||
      returnSegments[0]?.airlineCode ||
      null;
    const finalAirlineCodes = (resolvedAirlineCode
      ? [resolvedAirlineCode]
      : preferredAirlines
    ).filter(Boolean);

    const passengerCounts = this.resolveReissuePassengerCountsFromContext(
      booking,
      onlineReissueContext,
    );

    const corporateFareContext =
      reissueRequest?.metadata?.corporateFareContext ||
      onlineReissueContext?.corporateFareContext ||
      {};

    return {
      AdultCount: passengerCounts.adults,
      ChildCount: passengerCounts.children,
      InfantCount: passengerCounts.infants,
      DirectFlight: false,
      OneStopFlight: false,
      JourneyType: journeyType,
      PreferredAirlines: finalAirlineCodes,
      Segments: parsedSegments,
      Sources: null,
      SearchType: 1,
      Pnr: String(providerPnr).trim(),
      BookingId: Number(providerBookingId) || String(providerBookingId).trim(),
      SupplierBookingReference:
        onlineReissueContext?.supplierBookingReference || String(providerBookingId).trim(),
      ProviderBookingReference: String(providerBookingId).trim(),
      TraceId: onlineReissueContext?.traceId || null,
      ...(corporateFareContext?.pcc ? { PCC: corporateFareContext.pcc } : {}),
      ...(corporateFareContext?.corporateCode
        ? { CorporateCode: corporateFareContext.corporateCode }
        : {}),
      ...(Array.isArray(corporateFareContext?.corporateCodes) &&
      corporateFareContext.corporateCodes.length
        ? { CorporateCodes: corporateFareContext.corporateCodes }
        : {}),
      ...(corporateFareContext?.airlineMappings
        ? { AirlineCorporateMappings: corporateFareContext.airlineMappings }
        : {}),
    };
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
    const parsedMiniFareRules = parseMiniFareRules(miniFareRules, {
      strictEligibility: true,
      acceptRefundAsReissue: true,
    });

    logger.info("TBO REISSUE SEARCH NORMALIZED", {
      traceId: searchResponse?.Response?.TraceId || searchResponse?.TraceId,
      itinerariesCount: itineraries.length,
      firstResultIndex: firstResult?.ResultIndex,
      onlineReissueAllowed: parsedMiniFareRules?.onlineReissueAllowed,
    });


    return {
      traceId: searchResponse?.Response?.TraceId || searchResponse?.TraceId || null,
      itineraries,
      firstResultIndex: firstResult?.ResultIndex ?? null,
      miniFareRules,
      parsedMiniFareRules,
      onlineReissueAllowed: parsedMiniFareRules?.onlineReissueAllowed ?? false,
      onlineRefundAllowed: parsedMiniFareRules?.onlineRefundAllowed ?? false,
    };
  }

  async searchReissueFlights({ booking, reissueRequest }) {
    // ── Step 1: Resolve all provider identifiers from booking document ──
    const resolved = resolveBookingData(booking);
    const onlineReissueContext =
      reissueRequest?.onlineReissueContext || buildOnlineReissueContext(booking);
    const resolvedReferences = await providerReferenceService.resolveProviderReferences({
      request: reissueRequest,
      booking,
      originalBooking: booking,
      throwOnMissing: true,
      saveBackfilledBooking: true,
    });
    const contextValidation = validateOnlineReissueContext({
      ...onlineReissueContext,
      providerBookingReference:
        onlineReissueContext?.providerBookingReference ||
        resolvedReferences.providerBookingReference,
      supplierBookingReference:
        onlineReissueContext?.supplierBookingReference ||
        resolvedReferences.supplierBookingReference,
      originalPnr: onlineReissueContext?.originalPnr || resolvedReferences.pnr,
      traceId: onlineReissueContext?.traceId || resolvedReferences.traceId,
    });


    // Prefer reissueRequest stored values (set at request creation) over re-resolution
    const activeLineage = reissueRequest?.bookingLineage || {};
    const supplierPnr =
      activeLineage?.activePnr ||
      resolvedReferences?.pnr ||
      onlineReissueContext?.providerReferences?.pnr ||
      onlineReissueContext?.originalPnr ||
      reissueRequest.originalPnr ||
      resolved.pnr;
    const supplierBookingId =
      activeLineage?.activeBookingId ||
      resolvedReferences?.providerBookingReference ||
      onlineReissueContext?.providerReferences?.providerBookingReference ||
      onlineReissueContext?.providerBookingReference ||
      reissueRequest.originalBookingId ||
      resolved.bookingId;
    const supplierTraceId =
      resolvedReferences?.traceId ||
      onlineReissueContext?.traceId ||
      reissueRequest?.metadata?.originalTraceId ||
      resolved.traceId ||
      null;
    const supplierResultIndex =
      onlineReissueContext?.resultIndex ??
      reissueRequest?.metadata?.originalResultIndex ??
      booking?.flightRequest?.resultIndex ??
      null;
    const supplierAirline =
      onlineReissueContext?.onwardSegments?.[0]?.airlineCode ||
      resolved.airlineCode ||
      reissueRequest.airline ||
      null;

    logger.info("ONLINE_REISSUE_SEARCH_STARTED", {
      bookingMongoId: booking._id?.toString(),
      reissueRequestId: reissueRequest?._id?.toString?.() || null,
      journeyType: onlineReissueContext?.journeyType || null,
      onwardSegments: onlineReissueContext?.onwardSegments?.length || 0,
      returnSegments: onlineReissueContext?.returnSegments?.length || 0,
      resolvedPnr: supplierPnr,
      resolvedBookingId: supplierBookingId,
      resolvedTraceId: supplierTraceId,
      missingContextFields: contextValidation.missingFields,
    });

    if (!contextValidation.isValid) {
      logger.error("SUPPLIER_REFERENCE_MISSING", {
        bookingMongoId: booking._id?.toString(),
        reissueRequestId: reissueRequest?._id?.toString?.() || null,
        missingFields: contextValidation.missingFields,
        onlineReissueContext,
      });
      const error = new ApiError(
        422,
        `Online reissue context is incomplete. Missing: ${contextValidation.missingFields.join(", ")}`,
      );
      error.code = "ONLINE_REISSUE_CONTEXT_INCOMPLETE";
      error.details = { missingFields: contextValidation.missingFields };
      throw error;
    }

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
      const error = new ApiError(
        422,
        "Resolved provider PNR missing — cannot call TBO reissue search without PNR",
      );
      error.code = "REISSUE_PNR_MISSING";
      throw error;
    }

    if (!supplierBookingId) {
      const error = new ApiError(
        422,
        "Resolved provider BookingId missing — cannot call TBO reissue search without BookingId",
      );
      error.code = "REISSUE_BOOKING_ID_MISSING";
      throw error;
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

    const payload = this.buildTboReissueSearchPayloadFromContext({
      booking,
      reissueRequest,
      onlineReissueContext,
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

    let response;
    try {
      response = await this.execute("flightSearch", payload);
    } catch (error) {
      logger.error("ONLINE_REISSUE_SEARCH_FAILED", {
        bookingMongoId: booking?._id?.toString(),
        reissueRequestId: reissueRequest?._id?.toString?.() || null,
        message: error.message,
        code: error.code || null,
      });
      throw error;
    }

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

  extractTicketIds(booking = {}, reissueRequest = {}) {
    const contextTicketIds = toArray(
      reissueRequest?.onlineReissueContext?.ticketIds ||
      booking?.originalBookingSnapshot?.ticketId ||
      [],
    ).filter(Boolean);

    if (contextTicketIds.length) {
      return Array.from(new Set(contextTicketIds.map((item) => String(item))));
    }

    const passengerGroups = [
      booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Passenger,
      booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.Passenger,
      booking?.bookingResult?.providerResponse?.ticketResponse?.Response?.Response?.FlightItinerary?.Passenger,
      booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary?.Passenger,
      booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.FlightItinerary?.Passenger,
    ];

    return Array.from(
      new Set(
        passengerGroups
          .flatMap((group) => toArray(group))
          .map((passenger) => passenger?.Ticket?.TicketId || passenger?.TicketId)
          .filter(Boolean)
          .map((item) => String(item)),
      ),
    );
  }

  buildTicketData(ticketData = {}, booking = {}, reissueRequest = {}) {
    const fallbackTicketData =
      booking?.ticketData ||
      booking?.lastTicketedSnapshot?.ticketData ||
      booking?.originalBookingSnapshot?.ticketData ||
      reissueRequest?.lastTicketedSnapshot?.ticketData ||
      reissueRequest?.onlineReissueContext?.ticketData ||
      reissueRequest?.metadata?.originalTicketData ||
      null;
    const data = {
      TourCode: ticketData?.TourCode || fallbackTicketData?.TourCode || "",
      Endorsement:
        ticketData?.Endorsement ||
        fallbackTicketData?.Endorsement ||
        "Corporate full reissue",
      CorporateCode:
        ticketData?.CorporateCode ||
        fallbackTicketData?.CorporateCode ||
        booking?.corporateCode ||
        "",
      AgentDealCode:
        ticketData?.AgentDealCode || fallbackTicketData?.AgentDealCode || "",
    };

    const missing = Object.entries(data)
      .filter(([key, value]) => !value && key !== "AgentDealCode")
      .map(([key]) => key);

    if (missing.length) {
      logger.warn("TBO ticket reissue payload missing optional ticket metadata", {
        bookingId: booking?._id,
        missingFields: missing,
        ticketDataSource: ticketData?.TourCode ? "request" : "booking_snapshot",
      });
    }

    return data;
  }

  async ticketReissue({ booking, reissueRequest, remarks, ticketData }) {
    const ticketIds = this.extractTicketIds(booking, reissueRequest);
    if (!ticketIds.length) {
      throw new ApiError(400, "Unable to locate ticket IDs for ticket reissue");
    }

    const env = this.getEnv();
    const cfg = config[env];
    const endpoint = cfg?.endpoints?.flightTicketReissue;

    if (!endpoint) {
      throw new ApiError(400, "TicketReissue endpoint not available for this environment");
    }

    const onlineReissueContext =
      reissueRequest?.onlineReissueContext || buildOnlineReissueContext(booking);
    const resolvedReferences = await providerReferenceService.resolveProviderReferences({
      request: reissueRequest,
      booking,
      originalBooking: booking,
      throwOnMissing: true,
      saveBackfilledBooking: true,
    });
    const contextValidation = validateOnlineReissueContext({
      ...onlineReissueContext,
      providerBookingReference:
        onlineReissueContext?.providerBookingReference ||
        resolvedReferences.providerBookingReference,
      supplierBookingReference:
        onlineReissueContext?.supplierBookingReference ||
        resolvedReferences.supplierBookingReference,
      originalPnr: onlineReissueContext?.originalPnr || resolvedReferences.pnr,
      traceId: onlineReissueContext?.traceId || resolvedReferences.traceId,
    });
    if (!contextValidation.isValid) {
      logger.error("SUPPLIER_REFERENCE_MISSING", {
        bookingMongoId: booking?._id?.toString(),
        reissueRequestId: reissueRequest?._id?.toString?.() || null,
        missingFields: contextValidation.missingFields,
        stage: "ticketReissue",
      });
      const error = new ApiError(
        422,
        `Online reissue context is incomplete. Missing: ${contextValidation.missingFields.join(", ")}`,
      );
      error.code = "ONLINE_REISSUE_CONTEXT_INCOMPLETE";
      error.details = { missingFields: contextValidation.missingFields };
      throw error;
    }

    const basePayload = {
      BookingId:
        reissueRequest?.bookingLineage?.activeBookingId ||
        resolvedReferences?.providerBookingReference ||
        onlineReissueContext?.providerReferences?.providerBookingReference ||
        onlineReissueContext?.providerBookingReference ||
        reissueRequest.originalBookingId,
      Pnr:
        reissueRequest?.bookingLineage?.activePnr ||
        resolvedReferences?.pnr ||
        onlineReissueContext?.providerReferences?.pnr ||
        onlineReissueContext?.originalPnr ||
        reissueRequest.originalPnr,
      TraceId:
        reissueRequest.metadata?.searchTraceId ||
        resolvedReferences?.traceId ||
        onlineReissueContext?.traceId ||
        null,
      ResultIndex: reissueRequest.metadata?.selectedResultIndex ?? null,
      SupplierBookingReference:
        reissueRequest?.bookingLineage?.activeBookingId ||
        resolvedReferences?.supplierBookingReference ||
        onlineReissueContext?.providerReferences?.supplierBookingReference ||
        onlineReissueContext?.supplierBookingReference ||
        reissueRequest.originalBookingId,
      ProviderBookingReference:
        reissueRequest?.bookingLineage?.activeBookingId ||
        resolvedReferences?.providerBookingReference ||
        onlineReissueContext?.providerReferences?.providerBookingReference ||
        onlineReissueContext?.providerBookingReference ||
        reissueRequest.originalBookingId,
      TicketIds: ticketIds,
      TicketId: ticketIds.join(","),
      Remarks: remarks || "Enterprise online reissue execution",
      TicketData: this.buildTicketData(ticketData, booking, reissueRequest),
      CorrelationId: reissueRequest.correlationId,
    };

    logger.info("TBO_TICKETREISSUE_PAYLOAD_GENERATED", basePayload);

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
    const parsedMiniFareRules = parseMiniFareRules(rawMiniFareRules, {
      strictEligibility: true,
      acceptRefundAsReissue: true,
    });
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
      onlineReissueAllowed: parsedMiniFareRules.onlineReissueAllowed,
      onlineRefundAllowed: parsedMiniFareRules.onlineRefundAllowed,
    };
  }
}

module.exports = new TboReissueProvider();
