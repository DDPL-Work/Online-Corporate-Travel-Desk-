import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchHotelDetails, fetchRoomInfo } from "../../../Redux/Actions/hotelThunks";
import HotelHeader from "./components/HotelHeader";
import HotelImageGallery from "./components/HotelImageGallery";
import HotelInfo from "./components/HotelInfo";
import Amenities from "./components/Amenities";
import RoomTypesList from "./components/RoomTypesList";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import Attractions from "./components/Attractions";
import HotelDetailsSkeleton from "./components/HotelDetailsSkeleton";
import { MdArrowBack } from "react-icons/md";

const HotelDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const hotelCode = location.state?.hotelCode;

  const { hotels, hotelDetailsById, searchPayload, loading, traceId: reduxTraceId } = useSelector(
    (state) => state.hotel,
  );

  // Prefer location.state traceId (from navigation), fall back to Redux state
  const traceId = location.state?.traceId || reduxTraceId;

  /* ----------------------------
     1️⃣ Get hotel from search
  ----------------------------- */
  const hotelFromSearch = useMemo(() => {
    return hotels?.find((h) => h.HotelCode === hotelCode);
  }, [hotels, hotelCode]);

  /* ----------------------------
     2️⃣ Call dynamic details & rooms API
  ----------------------------- */
  useEffect(() => {
    if (hotelCode && traceId && hotelFromSearch?.ResultIndex) {
      const payload = {
        hotelCode,
        traceId,
        resultIndex: hotelFromSearch.ResultIndex,
      };

      // Fetch dynamic details
      dispatch(fetchHotelDetails(payload));

      // Fetch latest rooms (locks the price & refreshes the TBO session)
      dispatch(fetchRoomInfo(payload));
    }
  }, [hotelCode, traceId, hotelFromSearch?.ResultIndex, dispatch]);

  const hotelFromDetails = hotelDetailsById?.[hotelCode]?.HotelDetails?.[0];
  const roomsFromRedux = hotelDetailsById?.[hotelCode]?.Rooms || [];

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
      hotelCode: hotelCode,
      name:
        hotelFromDetails?.HotelName || hotelFromSearch?.HotelName || "Hotel",

      address:
        hotelFromDetails?.Address ||
        hotelFromSearch?.Address ||
        "Address not available",
      
      pinCode: hotelFromDetails?.PinCode || "",
      cityName: hotelFromDetails?.CityName || hotelFromSearch?.CityName || "",
      countryName: hotelFromDetails?.CountryName || "",
      map: hotelFromDetails?.Map || "", // Lat/Lng string or URL

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

      rooms: (roomsFromRedux.length > 0 ? roomsFromRedux : hotelFromSearch?.Rooms || []).map((room, index) => {
        const allImages = hotelFromDetails?.Images || [];
        const roomCount = roomsFromRedux?.length || 1;

        const imagesPerRoom = Math.ceil(allImages.length / roomCount);

        const start = index * imagesPerRoom;
        const end = start + imagesPerRoom;

        return {
          ...room, // ✅ KEEP FULL ORIGINAL ROOM DATA (now from Room Info API)
          images: allImages.slice(start, end),
        };
      }),
      resultIndex: hotelFromSearch?.ResultIndex,
      traceId: traceId,
    };
  }, [hotelFromSearch, hotelFromDetails, traceId, roomsFromRedux]);

  const handleSelectRoom = (room) => {
    navigate("/hotel-review-booking", {
      state: {
        hotel: mergedHotel,
        room: room,
        searchParams: {
          checkIn: searchPayload?.CheckIn,
          checkOut: searchPayload?.CheckOut,
          rooms: searchPayload?.PaxRooms,
          city: hotelFromSearch?.CityName,
        },
      },
    });
  };

  // --- SHOW SKELETON WHILE LOADING DYNAMIC DATA ---
  const isInitialLoading = loading.details || loading.rooms;
  const hasDynamicData = !!hotelFromDetails && roomsFromRedux.length > 0;

  if (isInitialLoading && !hasDynamicData) {
    return (
      <>
        <EmployeeHeader />
        <HotelDetailsSkeleton />
      </>
    );
  }

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
    (curr.Price?.TotalFare || curr.TotalFare) < (prev.Price?.TotalFare || prev.TotalFare) ? curr : prev,
    mergedHotel.rooms[0]
  );

  /* ========================= */
  return (
    <div className="min-h-screen bg-blue-50">
      <EmployeeHeader />
      <HotelHeader
        name={mergedHotel.name}
        address={`${mergedHotel.address}${mergedHotel.pinCode ? `, ${mergedHotel.pinCode}` : ""}`}
        cityName={mergedHotel.cityName}
        countryName={mergedHotel.countryName}
        rating={mergedHotel.rating}
        reviewCount={0}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <HotelImageGallery images={mergedHotel.images} />
          </div>
        </div>

        <HotelInfo
          description={mergedHotel.description}
          checkIn={mergedHotel.checkIn}
          checkOut={mergedHotel.checkOut}
          contact={mergedHotel.contact}
          map={mergedHotel.map}
        />

        <Amenities
          amenities={mergedHotel.facilities}
        />

        {mergedHotel.attractions?.length > 0 && (
          <Attractions attractions={mergedHotel.attractions} />
        )}

        <RoomTypesList
          rooms={mergedHotel.rooms}
          onSelectRoom={handleSelectRoom}
        />
      </div>
    </div>
  );
};

export default HotelDetailsPage;