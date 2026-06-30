const ApiError = require("../../../../utils/ApiError");
const BookingRequest = require("../../../../models/BookingRequest");
const { getProvider } = require("../providers/providerFactory");

class ReissueExecutionService {
  async searchFlights({ booking, reissueRequest }) {
    const provider = getProvider(reissueRequest.provider);
    const searchResponse = await provider.searchReissueFlights({
      booking,
      reissueRequest,
    });

    // Validate supplier response status
    if (searchResponse?.Response?.ResponseStatus !== 1) {
      throw new ApiError(400, searchResponse?.Response?.Error?.ErrorMessage || "Reissue search failed from supplier side");
    }

    const normalized = provider.normalizeSearchResponse(searchResponse);

    if (!normalized.traceId || !normalized.itineraries.length) {
      throw new ApiError(422, "Provider did not return valid reissue flight options");
    }

    return {
      searchResponse,
      normalized,
    };
  }

  async fareQuote({ reissueRequest, resultIndex = null }) {
    const provider = getProvider(reissueRequest.provider);
    const traceId = reissueRequest.metadata?.searchTraceId;
    const resolvedResultIndex =
      resultIndex ?? reissueRequest.metadata?.selectedResultIndex;

    if (!traceId || resolvedResultIndex === undefined || resolvedResultIndex === null) {
      throw new ApiError(409, "Reissue search must complete before fare quote");
    }

    const quoteResponse = await provider.getReissueFareQuote({
      traceId,
      resultIndex: resolvedResultIndex,
      correlationId: reissueRequest.correlationId,
    });

    const normalized = provider.normalizeQuote(
      reissueRequest.supplierResponse?.searchResponse || null,
      quoteResponse,
      resolvedResultIndex,
    );

    return {
      quoteResponse,
      normalized,
    };
  }

  async executeOnline({ booking, reissueRequest, remarks, ticketData }) {
    const provider = getProvider(reissueRequest.provider);
    const result = await provider.ticketReissue({
      booking,
      reissueRequest,
      remarks,
      ticketData,
    });

    const changeRequestId =
      result?.Response?.ChangeRequestId ||
      result?.Response?.TicketCRInfo?.[0]?.ChangeRequestId ||
      result?.Response?.TicketReissue?.ChangeRequestId ||
      null;

    const newBookingId =
      result?.Response?.NewBookingId ||
      result?.Response?.BookingId ||
      result?.Response?.Response?.BookingId ||
      changeRequestId;

    const newPnr =
      result?.Response?.NewPNR ||
      result?.Response?.PNR ||
      result?.Response?.Response?.PNR ||
      booking?.bookingResult?.pnr ||
      reissueRequest.originalPnr;

    await BookingRequest.findByIdAndUpdate(booking._id, {
      $set: {
        "servicing.reissue.currentRequestId": reissueRequest._id,
        "servicing.reissue.status": "REISSUED",
        "servicing.reissue.reissuedBookingId": newBookingId,
        "servicing.reissue.originalBookingId":
          reissueRequest?.bookingLineage?.originalBookingId || reissueRequest.originalBookingId,
        "servicing.reissue.originalPnr":
          reissueRequest?.bookingLineage?.originalPnr || reissueRequest.originalPnr,
        "servicing.reissue.activeBookingId": newBookingId,
        "servicing.reissue.activePnr": newPnr,
        "amendment.type": "FULL_REISSUE",
        "amendment.changeRequestId": changeRequestId,
        "amendment.status": "completed",
        "amendment.response": result,
      },
      $push: {
        amendmentHistory: {
          type: "FULL_REISSUE",
          changeRequestId,
          status: "completed",
          response: result,
          createdAt: new Date(),
        },
      },
    });

    return {
      supplierResponse: result,
      newBookingId,
      newPnr,
      revisedTicket: result?.Response?.Ticket || result?.Response?.UpdatedTicket || null,
      revisedInvoice: result?.Response?.Invoice || result?.Response?.Invoices || null,
    };
  }
}

module.exports = new ReissueExecutionService();
