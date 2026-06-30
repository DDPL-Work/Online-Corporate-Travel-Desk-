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

  /* ---------------- TRAVELERS ---------------- */
  const [passengers, setPassengers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
    childAges: [],
  });
  const [travelClass, setTravelClass] = useState("Economy");

  const totalTravelers =
    (passengers.adults || 0) +
    (passengers.children || 0) +
    (passengers.infants || 0);

  const displayText = [
    passengers.adults
      ? `${passengers.adults} Adult${passengers.adults > 1 ? "s" : ""}`
      : null,
    passengers.children
      ? `${passengers.children} Child${passengers.children > 1 ? "ren" : ""}`
      : null,
    passengers.infants
      ? `${passengers.infants} Infant${passengers.infants > 1 ? "s" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(", ")
    .concat(` · ${travelClass}`);

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

    if (isModalOpen) {
      setIsModalOpen(false);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const isRightAligned = rect.left > window.innerWidth / 2;

    setModalPosition({
      top: rect.bottom + 6,
      ...(isRightAligned ? { right: window.innerWidth - rect.right } : { left: rect.left }),
    });

    setIsModalOpen(true);
  };

  const closeDropdown = () => {
    setIsModalOpen(false);
  };

  const handleApply = ({
    adults,
    children,
    infants,
    childAges,
    travelClass: newClass,
  }) => {
    const safeAdults = Math.max(1, Number(adults ?? passengers.adults) || 1);
    const safeChildren = Math.max(0, Number(children ?? 0) || 0);
    const safeInfants = Math.max(
      0,
      Math.min(Number(infants ?? 0) || 0, safeAdults),
    );

    setPassengers({
      adults: safeAdults,
      children: safeChildren,
      infants: safeInfants,
      childAges: childAges || [],
    });

    if (newClass) setTravelClass(newClass);
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

    // Travelers
    passengers,
    adults: passengers.adults,
    children: passengers.children,
    infants: passengers.infants,
    travelers: totalTravelers,
    setPassengers,
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
