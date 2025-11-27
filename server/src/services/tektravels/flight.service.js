const axios = require('axios');
const logger = require('../../utils/logger');
const BASE = process.env.TEKTRAVELS_BASE_URL || 'https://api.tektravels.com';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'ClientId': process.env.TEKTRAVELS_CLIENT_ID,
  'ClientSecret': process.env.TEKTRAVELS_CLIENT_SECRET,
});

exports.searchFlights = async (searchPayload) => {
  // Build body according to TekTravels Search method structure
  const url = `${BASE}/api/UniversalAPI/FlightSearch`; // example path: check docs for exact method name
  const res = await axios.post(url, searchPayload, { headers: authHeaders() });
  return res.data;
};

exports.fareQuote = async (payload) => {
  const url = `${BASE}/api/UniversalAPI/FareQuote`;
  const res = await axios.post(url, payload, { headers: authHeaders() });
  return res.data;
};

exports.book = async (payload) => {
  const url = `${BASE}/api/UniversalAPI/Book`;
  const res = await axios.post(url, payload, { headers: authHeaders() });
  return res.data;
};

exports.ticket = async (pnr) => {
  const url = `${BASE}/api/UniversalAPI/Ticket`;
  const res = await axios.post(url, { PNR: pnr }, { headers: authHeaders() });
  return res.data;
};
