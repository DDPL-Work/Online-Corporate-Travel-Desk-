const mongoose = require("mongoose");
const crypto = require("crypto");
const Corporate = require("../../../../models/Corporate");
const WalletTransaction = require("../../../../models/Wallet");
const Ledger = require("../../../../models/Ledger");
const ApiError = require("../../../../utils/ApiError");
const { BILLING_MODES } = require("../constants/reissue.constants");

class ReissueBillingService {
  async reserve({ reissueRequest, actorId }) {
    const amount = Number(reissueRequest.totalAdjustment || 0);
    if (amount <= 0) {
      reissueRequest.billingReservation = {
        reservationId: `RR-${reissueRequest.reissueId}`,
        status: "not_required",
        amount: 0,
        createdAt: new Date(),
      };
      return reissueRequest.billingReservation;
    }

    if (
      reissueRequest.billingReservation?.status === "reserved" ||
      reissueRequest.billingReservation?.status === "finalized"
    ) {
      return reissueRequest.billingReservation;
    }

    const session = await mongoose.startSession();
    const reservationId = `RR-${reissueRequest.reissueId}-${crypto.randomUUID()}`;
    const idempotencyKey = `${reissueRequest.reissueId}:${amount.toFixed(2)}`;

    try {
      session.startTransaction();

      const corporate = await Corporate.findById(reissueRequest.corporateId).session(session);
      if (!corporate) throw new ApiError(404, "Corporate not found for reissue billing");

      if (reissueRequest.billingMode === BILLING_MODES.PREPAID) {
        if (corporate.walletBalance < amount) {
          throw new ApiError(409, "Insufficient corporate wallet balance for reissue");
        }

        const before = corporate.walletBalance;
        corporate.walletBalance -= amount;
        await corporate.save({ session });

        const walletTxn = await WalletTransaction.create(
          [
            {
              corporateId: corporate._id,
              type: "adjustment",
              amount,
              balanceBefore: before,
              balanceAfter: corporate.walletBalance,
              description: `Reserved for reissue ${reissueRequest.reissueId}`,
              operationType: "Flight-Reissue",
              reference: reissueRequest.reissueId,
              bookingId: reissueRequest.bookingId,
              processedBy: actorId || null,
              status: "pending",
              metadata: {
                reservationId,
                reissueRequestId: reissueRequest._id,
                reservationOnly: true,
              },
            },
          ],
          { session },
        );

        reissueRequest.walletAdjustment = {
          transactionId: walletTxn[0]._id,
          amount,
        };
      } else {
        corporate.currentCredit += amount;
        await corporate.save({ session });

        const ledgerEntries = await Ledger.create(
          [
            {
              corporateId: corporate._id,
              userId: reissueRequest.userId,
              bookingId: reissueRequest.bookingId,
              bookingReference: reissueRequest.originalPnr || reissueRequest.reissueId,
              type: "adjustment",
              amount,
              transactionType: "debit",
              bookingDate: new Date(),
              travelDate: reissueRequest.newJourney?.departureDate || new Date(),
              description: `Reserved postpaid exposure for reissue ${reissueRequest.reissueId}`,
              operationType: "Flight-Reissue",
              status: "pending",
              metadata: {
                reservationId,
                reissueRequestId: reissueRequest._id,
                reservationOnly: true,
              },
            },
          ],
          { session },
        );

        reissueRequest.creditAdjustment = {
          ledgerId: ledgerEntries[0]._id,
          amount,
        };
      }

      reissueRequest.billingReservation = {
        reservationId,
        idempotencyKey,
        status: "reserved",
        amount,
        createdAt: new Date(),
      };

      await reissueRequest.save({ session });
      await session.commitTransaction();
      return reissueRequest.billingReservation;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async finalize({ reissueRequest }) {
    if (!reissueRequest.billingReservation) return null;
    if (
      reissueRequest.billingReservation.status === "finalized" ||
      reissueRequest.billingReservation.status === "not_required"
    ) {
      return reissueRequest.billingReservation;
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      if (reissueRequest.walletAdjustment?.transactionId) {
        await WalletTransaction.findByIdAndUpdate(
          reissueRequest.walletAdjustment.transactionId,
          { status: "completed" },
          { session },
        );
      }

      if (reissueRequest.creditAdjustment?.ledgerId) {
        await Ledger.findByIdAndUpdate(
          reissueRequest.creditAdjustment.ledgerId,
          { status: "billed" },
          { session },
        );
      }

      reissueRequest.billingReservation.status = "finalized";
      reissueRequest.billingReservation.finalizedAt = new Date();
      await reissueRequest.save({ session });

      await session.commitTransaction();
      return reissueRequest.billingReservation;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async release({ reissueRequest, reason = "Released due to failure" }) {
    if (!reissueRequest.billingReservation) return null;
    if (
      ["released", "not_required"].includes(reissueRequest.billingReservation.status)
    ) {
      return reissueRequest.billingReservation;
    }

    const amount = Number(reissueRequest.billingReservation.amount || 0);
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const corporate = await Corporate.findById(reissueRequest.corporateId).session(session);
      if (!corporate) throw new ApiError(404, "Corporate not found for billing release");

      if (reissueRequest.billingMode === BILLING_MODES.PREPAID && amount > 0) {
        const before = corporate.walletBalance;
        corporate.walletBalance += amount;
        await corporate.save({ session });

        await WalletTransaction.create(
          [
            {
              corporateId: corporate._id,
              type: "refund",
              amount,
              balanceBefore: before,
              balanceAfter: corporate.walletBalance,
              description: `Released reissue reservation ${reissueRequest.reissueId}`,
              operationType: "Flight-Reissue",
              reference: reissueRequest.reissueId,
              bookingId: reissueRequest.bookingId,
              status: "completed",
              metadata: {
                reservationId: reissueRequest.billingReservation.reservationId,
                releaseReason: reason,
              },
            },
          ],
          { session },
        );

        if (reissueRequest.walletAdjustment?.transactionId) {
          await WalletTransaction.findByIdAndUpdate(
            reissueRequest.walletAdjustment.transactionId,
            { status: "reversed" },
            { session },
          );
        }
      }

      if (reissueRequest.billingMode === BILLING_MODES.POSTPAID && amount > 0) {
        corporate.currentCredit = Math.max(0, corporate.currentCredit - amount);
        await corporate.save({ session });

        if (reissueRequest.creditAdjustment?.ledgerId) {
          await Ledger.findByIdAndUpdate(
            reissueRequest.creditAdjustment.ledgerId,
            { status: "cancelled" },
            { session },
          );
        }
      }

      reissueRequest.billingReservation.status = "released";
      reissueRequest.billingReservation.releasedAt = new Date();
      reissueRequest.billingReservation.failureReason = reason;
      await reissueRequest.save({ session });

      await session.commitTransaction();
      return reissueRequest.billingReservation;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new ReissueBillingService();
