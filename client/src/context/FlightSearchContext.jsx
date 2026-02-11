// flight search context
import React, { createContext, useContext, useState } from "react";

// Create the context
const FlightSearchContext = createContext();

// Custom hook
export const useFlightSearch = () => {
  const context = useContext(FlightSearchContext);
  if (!context) {
    throw new Error(
      "useFlightSearch must be used within a FlightSearchProvider",
    );
  }
  return context;
};

// Provider
export const FlightSearchProvider = ({ children }) => {
  /* ---------------- TRIP DETAILS ---------------- */
  const [tripType, setTripType] = useState("one-way");
  const [from, setFrom] = useState("Mumbai (BOM)");
  const [to, setTo] = useState("Dubai (DXB)");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  /* ---------------- FIXED TRAVELERS ---------------- */
  const adults = 1; // 🔒 FIXED
  const travelers = 1; // 🔒 FIXED
  const [travelClass, setTravelClass] = useState("Economy");

  const displayText = "1 Adult";

  /* ---------------- OPTIONS ---------------- */
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [nearbyAirportsTo, setNearbyAirportsTo] = useState(false);
  const [nearbyAirportsFrom, setNearbyAirportsFrom] = useState(false);
  const [directOnly, setDirectOnly] = useState(false);
  const [priceAlert, setPriceAlert] = useState(false);

  /* ---------------- MODAL ---------------- */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const openDropdown = (event) => {
    if (!event?.currentTarget) return;

    const rect = event.currentTarget.getBoundingClientRect();

    setModalPosition({
      top: rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      width: rect.width,
    });

    setIsModalOpen(true);
  };

  const closeDropdown = () => {
    setIsModalOpen(false);
  };

  // 🔒 Apply only cabin class + direct flight
  const handleApply = ({ travelClass }) => {
    setTravelClass(travelClass);
    setIsModalOpen(false);
  };

  /* ---------------- UI ---------------- */
  const [activeTab, setActiveTab] = useState("flights");
  const [activeFilter, setActiveFilter] = useState(null);

  /* ---------------- FORM SUBMIT ---------------- */
  const handleSubmit = (e) => {
    e.preventDefault();

    console.log({
      tripType,
      from,
      to,
      departureDate,
      returnDate,
      travelers: 1,
      adults: 1,
      travelClass,
      flexibleDates,
      nearbyAirports: {
        from: nearbyAirportsFrom,
        to: nearbyAirportsTo,
      },
      directOnly,
      priceAlert,
    });
  };

  const toggleFilter = (filter) => {
    setActiveFilter((prev) => (prev === filter ? null : filter));
  };

  /* ---------------- CONTEXT VALUE ---------------- */
  const value = {
    // Trip
    tripType,
    setTripType,
    from,
    setFrom,
    to,
    setTo,
    departureDate,
    setDepartureDate,
    returnDate,
    setReturnDate,

    // Travelers (READ-ONLY)
    adults,
    travelers,
    travelClass,
    setTravelClass,
    displayText,

    // Options
    flexibleDates,
    setFlexibleDates,
    nearbyAirportsTo,
    setNearbyAirportsTo,
    nearbyAirportsFrom,
    setNearbyAirportsFrom,
    directOnly,
    setDirectOnly,
    priceAlert,
    setPriceAlert,

    // Modal
    isModalOpen,
    modalPosition,
    // toggleModal,
    handleApply,

    openDropdown,
    closeDropdown,

    // UI
    activeTab,
    setActiveTab,
    activeFilter,
    setActiveFilter,

    // Data & helpers
    handleSubmit,
    toggleFilter,
  };

  return (
    <FlightSearchContext.Provider value={value}>
      {children}
    </FlightSearchContext.Provider>
  );
};
