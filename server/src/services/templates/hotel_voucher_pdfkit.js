const PDFDocument = require("pdfkit");

const generateHotelVoucherPdfKit = async ({
  booking,
  outputPath,
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });

      const stream = require("fs").createWriteStream(outputPath);
      doc.pipe(stream);

      const hotel = booking.hotelRequest?.selectedHotel || {};
      const room = booking.hotelRequest?.selectedRoom || {};
      const result =
        booking.bookingResult?.providerResponse?.BookResult || {};

      const guest = booking.travellers?.[0];

      const formatDate = (date) =>
        new Date(date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

      /* ================= HEADER ================= */
      doc
        .rect(0, 0, 600, 80)
        .fill("#0a2540");

      doc
        .fillColor("white")
        .fontSize(20)
        .text("HOTEL BOOKING VOUCHER", 40, 30);

      doc
        .fontSize(10)
        .text(`Booking Ref: ${result.BookingRefNo}`, 400, 30);

      doc
        .text(`Confirmation: ${result.ConfirmationNo}`, 400, 45);

      doc.moveDown(3);

      doc.fillColor("black");

      /* ================= HOTEL ================= */
      doc.fontSize(16).text(hotel.hotelName, { bold: true });
      doc.fontSize(10).text(hotel.address || "");

      doc.moveDown();

      /* ================= STAY INFO ================= */
      doc
        .rect(40, doc.y, 520, 60)
        .stroke();

      doc.fontSize(10);

      doc.text(`Check-in: ${formatDate(booking.hotelRequest.checkInDate)}`, 50, doc.y + 10);
      doc.text(`Check-out: ${formatDate(booking.hotelRequest.checkOutDate)}`, 250, doc.y + 10);
      doc.text(`Guests: 1`, 420, doc.y + 10);

      doc.moveDown(3);

      /* ================= ROOM ================= */
      doc.fontSize(12).text("Room Details", { underline: true });

      doc.fontSize(10);
      doc.text(`Room: ${room.rawRoomData?.Name?.[0]}`);
      doc.text(`Meal: ${room.mealType}`);
      doc.text(`Refundable: ${room.isRefundable ? "Yes" : "No"}`);

      doc.moveDown();

      /* ================= GUEST ================= */
      doc.fontSize(12).text("Guest Details", { underline: true });

      doc.fontSize(10);
      doc.text(`${guest.title} ${guest.firstName} ${guest.lastName}`);

      doc.moveDown();

      /* ================= PRICE ================= */
      doc.fontSize(12).text("Price Details", { underline: true });

      doc.fontSize(10);
      doc.text(
        `Total Amount: ₹${booking.pricingSnapshot?.totalAmount.toLocaleString()}`,
      );

      doc.moveDown();

      /* ================= CANCELLATION ================= */
      doc.fontSize(12).text("Cancellation Policy", { underline: true });

      room.cancelPolicies?.forEach((p) => {
        doc
          .fontSize(9)
          .text(
            `From ${p.FromDate} → ${p.CancellationCharge}${p.ChargeType === "Percentage" ? "%" : ""}`,
          );
      });

      doc.moveDown(2);

      /* ================= FOOTER ================= */
      doc
        .fontSize(8)
        .fillColor("gray")
        .text(
          "This is a computer-generated voucher and does not require a signature.",
          { align: "center" },
        );

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateHotelVoucherPdfKit };