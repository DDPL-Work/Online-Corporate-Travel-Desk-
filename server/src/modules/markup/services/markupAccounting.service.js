const mongoose = require("mongoose");
const MarkupAudit = require("../schemas/BookingMarkupAudit.model");
const MarkupRevenue = require("../schemas/MarkupRevenue.model");

class MarkupAccountingService {
  /**
   * Records booking revenue and audit trails.
   * This should ONLY be called when a booking is confirmed successfully.
   * 
   * @param {Object} booking - The BookingRequest document (Flight or Hotel).
   * @param {Object} corporate - The Corporate document.
   */
  static async recordBookingRevenue(booking, corporate) {
    if (!booking || !booking._id) {
      console.error("[MarkupAccountingService] Invalid booking object provided.");
      return;
    }

    if (!corporate || !corporate._id) {
      console.error(`[MarkupAccountingService] Missing corporate data for booking ${booking._id}.`);
      return;
    }

    // Extract the markup snapshot. It could be under markupSnapshot.
    // If not present, log safe failure and exit.
    let snapshot = booking.markupSnapshot;
    
    if ((!snapshot || !snapshot.markupAmount || !snapshot.markupBreakdown || snapshot.markupBreakdown.length === 0) && booking.bookingType === "flight") {
      const fareSnapshot = booking.flightRequest?.fareSnapshot;
      if (fareSnapshot && fareSnapshot.markupAmount > 0) {
        snapshot = {
          markupAmount: fareSnapshot.markupAmount,
          supplierFare: fareSnapshot.supplierFare || 0,
          finalFare: fareSnapshot.finalFare || fareSnapshot.TotalFare || fareSnapshot.totalFare || 0,
          markupBreakdown: fareSnapshot.markupBreakdown || []
        };
      } else {
        const results = booking.flightRequest?.fareQuote?.Results;
        if (results && results.length > 0) {
          const flightResult = results[0];
          if (flightResult.markupApplied && flightResult.markupAmount > 0) {
            snapshot = {
              markupAmount: flightResult.markupAmount,
              supplierFare: flightResult.supplierFare,
              finalFare: (flightResult.supplierFare || 0) + flightResult.markupAmount,
              markupBreakdown: flightResult.markupBreakdown || []
            };
          }
        }
      }
    } else if ((!snapshot || !snapshot.markupBreakdown || snapshot.markupBreakdown.length === 0) && booking.bookingType === "hotel") {
      // Fallback for hotel: if snapshot is missing breakdown, extract it from hotelRequest
      const roomData = booking.hotelRequest?.selectedRoom?.rawRoomData;
      const actualRawRoom = roomData?.rawRoomData || roomData || {};
      
      if (actualRawRoom && actualRawRoom.markupAmount > 0) {
        snapshot = {
          markupAmount: actualRawRoom.markupAmount,
          supplierFare: actualRawRoom.supplierFare || snapshot?.supplierFare || 0,
          finalFare: actualRawRoom.TotalFare || actualRawRoom.totalFare || snapshot?.finalFare || 0,
          markupBreakdown: actualRawRoom.markupBreakdown || []
        };
      }
    }

    if (!snapshot || !snapshot.markupAmount || snapshot.markupAmount <= 0) {
      console.log(`[MarkupAccountingService] No markup applied or snapshot missing for booking ${booking._id}. Skipping.`);
      return;
    }

    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (e) {
      // Transactions not supported in this environment (e.g. standalone test db)
      session = null;
    }

    try {
      // Duplicate protection
      let query = MarkupAudit.findOne({ bookingId: booking._id });
      if (session) query = query.session(session);
      const existingAudit = await query;
      if (existingAudit) {
        console.warn(`[MarkupAccountingService] Audit record already exists for booking ${booking._id}. Duplicate prevented.`);
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        return;
      }

      // Determine product type (flight or hotel)
      const productType = booking.productType || booking.bookingType || "flight";
      
      // Basic Details Extraction
      const bookingId = booking._id;
      const orderId = booking.orderId || booking.bookingReference;
      const bookingReference = booking.bookingReference;
      const corporateId = corporate._id;
      const corporateName = corporate.name || corporate.corporateName || "Unknown";
      const userId = booking.userId;
      const employeeId = booking.employeeId;
      const bookingStatus = booking.executionStatus || booking.requestStatus || "booked";
      const bookingDate = booking.createdAt || new Date();
      
      // Flight/Hotel specific extraction
      let supplier = "";
      let supplierBookingId = "";
      let pnr = "";
      let travelDate = null;
      let routeDetails = {};
      let airlineDetails = {};
      let passengerDetails = { totalPassengers: 0, adults: 0, children: 0, infants: 0 };
      let ticketNumbers = [];

      if (productType === "flight") {
        supplier = booking.bookingResult?.provider || "TBO";
        supplierBookingId = booking.bookingResult?.providerBookingId;
        pnr = booking.bookingResult?.pnr;
        ticketNumbers = booking.bookingResult?.ticketNumbers || [];
        
        // Extract from flightRequest or snapshot
        if (booking.flightRequest) {
          routeDetails = {
            origin: booking.flightRequest.origin,
            destination: booking.flightRequest.destination,
            journeyType: booking.flightRequest.journeyType
          };
          if (booking.flightRequest.travelDates && booking.flightRequest.travelDates.length > 0) {
             travelDate = new Date(booking.flightRequest.travelDates[0]);
          }
          if (booking.flightRequest.passengers) {
            passengerDetails.adults = booking.flightRequest.passengers.AdultCount || 0;
            passengerDetails.children = booking.flightRequest.passengers.ChildCount || 0;
            passengerDetails.infants = booking.flightRequest.passengers.InfantCount || 0;
            passengerDetails.totalPassengers = passengerDetails.adults + passengerDetails.children + passengerDetails.infants;
          }
        }
      } else if (productType === "hotel") {
        supplier = booking.bookingResult?.provider || "TBO";
        supplierBookingId = booking.bookingResult?.providerBookingId;
        pnr = booking.bookingResult?.confirmationNumber;
        
        if (booking.hotelRequest) {
          routeDetails = {
            destination: booking.hotelRequest.city || booking.hotelRequest.cityCode
          };
          if (booking.hotelRequest.checkInDate) {
            travelDate = new Date(booking.hotelRequest.checkInDate);
          }
        }
      }

      // Snapshot parsing
      const supplierFare = snapshot.supplierFare || snapshot.baseFare || 0;
      const finalFare = snapshot.finalFare || snapshot.totalFare || 0;
      const markupAmount = snapshot.markupAmount || snapshot.totalMarkup || 0;
      const markupBreakdown = snapshot.markupBreakdown || [];

      // Format Applied Rules for Audit
      const appliedMarkupRules = markupBreakdown.map(rule => ({
        ruleId: rule.ruleId || rule._id,
        category: rule.category,
        markupMethod: rule.markupMethod || rule.type,
        markupValue: rule.markupValue || rule.value,
        markupAmount: rule.markupAmount,
        refundPolicy: rule.refundPolicy || "NONE"
      }));

      // 1. Create MarkupAudit
      const audit = new MarkupAudit({
        bookingId,
        orderId,
        bookingReference,
        corporateId,
        corporateName,
        userId,
        employeeId,
        productType,
        bookingStatus,
        supplier,
        supplierBookingId,
        pnr,
        bookingDate,
        fareBeforeMarkup: {
          supplierFare: supplierFare
        },
        fareAfterMarkup: {
          finalFare: finalFare,
          markupAmount: markupAmount
        },
        earnings: {
          totalMarkupEarned: markupAmount,
          profitGenerated: markupAmount
        },
        appliedMarkupRules,
        markupSnapshot: snapshot
      });

      const saveOpts = session ? { session } : {};
      await audit.save(saveOpts);

      // 2. Create MarkupRevenue
      const revenue = new MarkupRevenue({
        bookingId,
        orderId,
        bookingReference,
        corporateId,
        corporateName,
        productType,
        bookingDate,
        travelDate,
        supplier,
        supplierFare,
        finalFare,
        totalMarkup: markupAmount,
        netRevenue: markupAmount,
        revenueStatus: "EARNED",
        markupBreakdown: appliedMarkupRules,
        routeSummary: {
          origin: routeDetails.origin,
          destination: routeDetails.destination,
          journeyType: routeDetails.journeyType
        },
        airlineSummary: {
          airlineCode: airlineDetails.airlineCode,
          airlineName: airlineDetails.airlineName
        }
      });

      await revenue.save(saveOpts);

      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      console.log(`[MarkupAccountingService] Successfully recorded revenue and audit for booking ${bookingId}`);
      return { success: true, audit, revenue };
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      console.error(`[MarkupAccountingService] Failed to record revenue for booking ${booking._id}:`, error);
      // We throw error but hook caller should catch and ignore so booking isn't broken
      throw error; 
    }
  }
}

module.exports = MarkupAccountingService;
