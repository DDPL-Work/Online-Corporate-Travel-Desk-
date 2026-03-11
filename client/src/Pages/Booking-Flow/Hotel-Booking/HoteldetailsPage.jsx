import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchHotelDetails } from "../../../Redux/Actions/hotelThunks";
import HotelHeader from "./components/HotelHeader";
import HotelImageGallery from "./components/HotelImageGallery";
import HotelInfo from "./components/HotelInfo";
import Amenities from "./components/Amenities";
import RoomTypesList from "./components/RoomTypesList";
import PriceCard from "./components/PriceCard";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import Attractions from "./components/Attractions";
import { MdArrowBack } from "react-icons/md";
import TravellersModal from "./components/TravellersModal";

const HotelDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const hotelCode = location.state?.hotelCode;
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [travellerDetails, setTravellerDetails] = useState(null);
  const [showTravellerModal, setShowTravellerModal] = useState(false);

  const { hotels, hotelDetailsById, loading } = useSelector(
    (state) => state.hotel,
  );

  /* ----------------------------
     1️⃣ Get hotel from search
  ----------------------------- */
  const hotelFromSearch = useMemo(() => {
    return hotels?.find((h) => h.HotelCode === hotelCode);
  }, [hotels, hotelCode]);

  /* ----------------------------
     2️⃣ Call details API
  ----------------------------- */
  useEffect(() => {
    if (hotelCode && !hotelDetailsById?.[hotelCode]) {
      dispatch(fetchHotelDetails(hotelCode));
    }
  }, [hotelCode, hotelDetailsById, dispatch]);

  const hotelFromDetails = hotelDetailsById?.[hotelCode]?.HotelDetails?.[0];

  /* ----------------------------
     3️⃣ Merge Search + Details
  ----------------------------- */

  const rotateImages = (images, offset) => {
    if (!images || images.length === 0) return [];

    const shift = offset % images.length;

    return [...images.slice(shift), ...images.slice(0, shift)];
  };

  const extractAttractions = (html) => {
    if (!html) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const sections = Array.from(doc.querySelectorAll("p"));
    let attractions = [];

    sections.forEach((p) => {
      const strong = p.querySelector("strong");
      if (
        strong &&
        strong.textContent.toLowerCase().includes("nearby attractions")
      ) {
        const next = p.nextElementSibling;

        if (next && next.tagName === "UL") {
          attractions = Array.from(next.querySelectorAll("li")).map((li) =>
            li.textContent.trim(),
          );
        }
      }
    });

    return attractions;
  };

  const mergedHotel = useMemo(() => {
    if (!hotelFromSearch) return null;

    return {
      // Basic
      name:
        hotelFromDetails?.HotelName || hotelFromSearch?.HotelName || "Hotel",

      address:
        hotelFromDetails?.Address ||
        hotelFromSearch?.Address ||
        "Address not available",

      rating: hotelFromDetails?.HotelRating || hotelFromSearch?.StarRating || 0,

      description: hotelFromDetails?.Description || "No description available",

      checkIn: hotelFromDetails?.CheckInTime || "2:00 PM",
      checkOut: hotelFromDetails?.CheckOutTime || "12:00 PM",

      images: hotelFromDetails?.Images?.length
        ? hotelFromDetails.Images
        : hotelFromSearch?.Images || [],

      facilities:
        hotelFromDetails?.HotelFacilities || hotelFromSearch?.Amenities || [],
      attractions: extractAttractions(hotelFromDetails?.Description || ""),

      contact: {
        phone: hotelFromDetails?.PhoneNumber || "",
        email: hotelFromDetails?.Email || "",
        website: hotelFromDetails?.HotelWebsiteUrl || "",
        fax: hotelFromDetails?.FaxNumber || "",
      },

      rooms: (hotelFromSearch?.Rooms || []).map((room, index) => {
        const allImages = hotelFromDetails?.Images || [];
        const roomCount = hotelFromSearch?.Rooms?.length || 1;

        const imagesPerRoom = Math.ceil(allImages.length / roomCount);

        const start = index * imagesPerRoom;
        const end = start + imagesPerRoom;

        return {
          ...room, // ✅ KEEP FULL ORIGINAL ROOM DATA
          images: allImages.slice(start, end),
        };
      }),
    };
  }, [hotelFromSearch, hotelFromDetails]);

  const handleSendForApproval = () => {
    if (!travellerDetails) {
      setShowTravellerModal(true);
      return;
    }

    // call approval API here
    dispatch(
      sendApproval({
        hotelCode,
        room: selectedRoom || priceCardRoom,
        travellerDetails,
      }),
    );
  };

  if (!hotelFromSearch) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Hotel not found</p>
      </div>
    );
  }

  /* ----------------------------
     4️⃣ Prepare Cheapest Room
  ----------------------------- */
  const cheapestRoom = mergedHotel.rooms?.reduce((prev, curr) =>
    curr.TotalFare < prev.TotalFare ? curr : prev,
  );

  const nights = cheapestRoom?.DayRates?.[0]?.length || 1;

  const priceCardRoom = cheapestRoom;

  /* ========================= */
  return (
    <div className="min-h-screen bg-blue-50">
      <EmployeeHeader />
      <HotelHeader
        name={mergedHotel.name}
        address={mergedHotel.address}
        rating={mergedHotel.rating}
        reviewCount={0}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <HotelImageGallery images={mergedHotel.images} />
          </div>

          <div>
            <PriceCard
              selectedRoom={selectedRoom || priceCardRoom}
              travellerDetails={travellerDetails}
              onOpenTravellerModal={() => setShowTravellerModal(true)}
              onSendForApproval={handleSendForApproval}
            />
          </div>
        </div>

        <HotelInfo
          description={mergedHotel.description}
          checkIn={mergedHotel.checkIn}
          checkOut={mergedHotel.checkOut}
          contact={mergedHotel.contact}
        />

        <Amenities
          // ✅ CORRECT
          amenities={mergedHotel.facilities}
        />

        {/* Nearby Attractions — object passed directly */}
        {mergedHotel.attractions?.length > 0 && (
          <Attractions attractions={mergedHotel.attractions} />
        )}

        <RoomTypesList
          rooms={mergedHotel.rooms}
          onSelectRoom={setSelectedRoom}
        />
      </div>
      {showTravellerModal && (
        <TravellersModal
          isOpen={showTravellerModal}
          onClose={() => setShowTravellerModal(false)}
          onSubmit={(HotelPassengerArray) => {
            setTravellerDetails(HotelPassengerArray);
            setShowTravellerModal(false);
          }}
          rooms={[{ adults: 1, children: 0 }]}
          countryCode="IN"
          hotelCountryCode="AE"
        />
      )}
    </div>
  );
};

export default HotelDetailsPage;
