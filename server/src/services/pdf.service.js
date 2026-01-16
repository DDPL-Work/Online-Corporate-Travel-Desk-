const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
// const { v4: uuidv4 } = require('uuid');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

class PDFService {
  constructor() {
    this.voucherDir = './uploads/vouchers';
    this.invoiceDir = './uploads/invoices';
    
    [this.voucherDir, this.invoiceDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
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
        doc.fontSize(20).text('FLIGHT BOOKING VOUCHER', { align: 'center' });
        doc.moveDown();
        
        // Corporate Info
        doc.fontSize(12).text(`Corporate: ${corporate.corporateName}`);
        doc.fontSize(10).text(`Booking Reference: ${booking.bookingReference}`);
        doc.text(`PNR: ${booking.flightDetails.pnr}`);
        doc.moveDown();

        // Passenger Details
        doc.fontSize(14).text('Passenger Details', { underline: true });
        doc.moveDown(0.5);
        booking.travellers.forEach((traveller, index) => {
          doc.fontSize(10).text(`${index + 1}. ${traveller.title} ${traveller.firstName} ${traveller.lastName}`);
        });
        doc.moveDown();

        // Flight Details
        doc.fontSize(14).text('Flight Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Airline: ${booking.flightDetails.airline} (${booking.flightDetails.flightNumber})`);
        doc.text(`From: ${booking.flightDetails.origin} - ${booking.flightDetails.originCity}`);
        doc.text(`To: ${booking.flightDetails.destination} - ${booking.flightDetails.destinationCity}`);
        doc.text(`Date: ${new Date(booking.flightDetails.departureDate).toLocaleDateString()}`);
        doc.text(`Departure: ${booking.flightDetails.departureTime}`);
        doc.text(`Arrival: ${booking.flightDetails.arrivalTime}`);
        doc.text(`Class: ${booking.flightDetails.cabinClass}`);
        doc.moveDown();

        // Fare Details
        doc.fontSize(14).text('Fare Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Base Fare: ₹${booking.pricing.baseFare.toLocaleString()}`);
        doc.text(`Taxes: ₹${booking.pricing.taxes.toLocaleString()}`);
        doc.fontSize(12).text(`Total Amount: ₹${booking.pricing.totalAmount.toLocaleString()}`, { bold: true });

        // Footer
        doc.moveDown(2);
        doc.fontSize(8).text('This is a computer-generated voucher and does not require a signature.', { align: 'center' });
        
        doc.end();

        stream.on('finish', () => {
          resolve(`/uploads/vouchers/${filename}`);
        });

        stream.on('error', reject);
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
        doc.fontSize(20).text('HOTEL BOOKING VOUCHER', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12).text(`Corporate: ${corporate.corporateName}`);
        doc.fontSize(10).text(`Booking Reference: ${booking.bookingReference}`);
        doc.text(`Confirmation No: ${booking.hotelDetails.confirmationNumber}`);
        doc.moveDown();

        // Guest Details
        doc.fontSize(14).text('Guest Details', { underline: true });
        doc.moveDown(0.5);
        booking.travellers.forEach((traveller, index) => {
          doc.fontSize(10).text(`${index + 1}. ${traveller.title} ${traveller.firstName} ${traveller.lastName}`);
        });
        doc.moveDown();

        // Hotel Details
        doc.fontSize(14).text('Hotel Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Hotel: ${booking.hotelDetails.hotelName}`);
        doc.text(`Address: ${booking.hotelDetails.address.street}, ${booking.hotelDetails.address.city}`);
        doc.text(`Check-in: ${new Date(booking.hotelDetails.checkInDate).toLocaleDateString()}`);
        doc.text(`Check-out: ${new Date(booking.hotelDetails.checkOutDate).toLocaleDateString()}`);
        doc.text(`Nights: ${booking.hotelDetails.numberOfNights}`);
        doc.text(`Room Type: ${booking.hotelDetails.roomType}`);
        doc.text(`Meal Plan: ${booking.hotelDetails.mealPlan}`);
        doc.moveDown();

        // Fare Details
        doc.fontSize(14).text('Fare Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Base Fare: ₹${booking.pricing.baseFare.toLocaleString()}`);
        doc.text(`Taxes: ₹${booking.pricing.taxes.toLocaleString()}`);
        doc.fontSize(12).text(`Total Amount: ₹${booking.pricing.totalAmount.toLocaleString()}`, { bold: true });

        doc.moveDown(2);
        doc.fontSize(8).text('This is a computer-generated voucher and does not require a signature.', { align: 'center' });
        
        doc.end();

        stream.on('finish', () => {
          resolve(`/uploads/vouchers/${filename}`);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new PDFService();