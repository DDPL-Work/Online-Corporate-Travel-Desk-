// components/HotelDetails/HotelDetailsPage.jsx
import React, { useState } from "react";
import HotelHeader from "./components/HotelHeader";
import HotelImageGallery from "./components/HotelImageGallery";
import HotelInfo from "./components/HotelInfo";
import Amenities from "./components/Amenities";
import RoomTypesList from "./components/RoomTypesList";
import PriceCard from "./components/PriceCard";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";

const HotelDetailsPage = () => {
  const [selectedRoom, setSelectedRoom] = useState(null);

  const hotelData = {
    name: "Pride Plaza Hotel Aerocity New Delhi",
    address:
      "Asset Area 1, Hospitality District, Aerocity New Delhi, Indira Gandhi International Airport, New Delhi 110037 India",
    rating: 4.3,
    reviewCount: 8532,
    images: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop",
    ],
    description:
      "Located in New Delhi, Aerocity, Pride Plaza Hotel Aerocity New Delhi is within a 5-minute drive of Indira Gandhi International Airport. This luxurious hotel is 13.7 km (8.5 mi) from India Gate and 9.8 km (6.1 mi) from Qutub Minar.",
    amenities: [
      { icon: "wifi", label: "Free WiFi" },
      { icon: "parking", label: "Free Parking" },
      { icon: "pool", label: "Swimming Pool" },
      { icon: "gym", label: "Fitness Center" },
      { icon: "restaurant", label: "Restaurant" },
      { icon: "spa", label: "Spa" },
      { icon: "ac", label: "Air Conditioning" },
      { icon: "bar", label: "Bar/Lounge" },
    ],
    checkIn: "Check In 2 PM",
    checkOut: "Check Out 12 PM",
    roomTypes: [
      {
        id: 1,
        name: "Superior, Double",
        type: "Room Only",
        refundable: "Non-refundable",
        paxRequired: "PAN not Required",
        image:
          "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop",
        features: [
          "1 Double bed",
          "air conditioning",
          "bathtub",
          "coffee/tea maker",
          "television",
        ],
        originalPrice: "₹83,523",
        discountedPrice: "₹46,322",
        taxes: "+ ₹8,337 taxes",
        discount: "45% off",
        amenities: [
          "Breakfast not included",
          "Superior Double room-King beds (total beds in subject to availability)",
          "Free Cancellation till 16th January 2025",
        ],
      },
      {
        id: 2,
        name: "Superior, 2 Twin",
        type: "Room Only",
        refundable: "Non-refundable",
        paxRequired: "PAN not Required",
        image:
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop",
        features: ["2 Twin", "desk", "bathtub", "free toiletries"],
        originalPrice: "₹83,523",
        discountedPrice: "₹48,376",
        taxes: "+ ₹8,707 taxes",
        discount: "42% off",
        amenities: [
          "Breakfast",
          "Non-refundable",
          "PAN not Required",
          "Superior Double room-2twin beds (total beds in subject to availability)",
          "Free Cancellation",
        ],
      },
      {
        id: 3,
        name: "Premium Double, Room",
        type: "Room Only",
        refundable: "Non-refundable",
        paxRequired: "PAN not Required",
        image:
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop",
        features: ["1 Double", "free mini bar"],
        originalPrice: "₹1,12,185",
        discountedPrice: "₹48,181",
        taxes: "+ ₹8,672 taxes",
        discount: "57% off",
        amenities: [
          "Breakfast",
          "Non-refundable",
          "PAN not Required",
          "Premium Double -King bed (total beds in subject to availability)",
        ],
      },
      {
        id: 4,
        name: "Superior, King",
        type: "Room Only",
        refundable: "Refundable",
        paxRequired: "PAN not Required",
        image:
          "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=300&fit=crop",
        features: [
          "1 King",
          "Wardrobe access",
          "Minibar",
          "Direct-dial phone",
          "Pillow",
        ],
        originalPrice: "₹2,67,626",
        discountedPrice: "₹1,57,802",
        taxes: "+ ₹28,404 taxes",
        discount: "41% off",
        amenities: [
          "Free Cancellation",
          "Free Cancellation till 16th January 2025",
        ],
      },
      {
        id: 5,
        name: "Superior",
        type: "Room Only",
        refundable: "Non-refundable",
        paxRequired: "PAN not Required",
        image:
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop",
        features: [
          "1 Double",
          "air conditioning",
          "bathtub",
          "bed",
          "television",
        ],
        originalPrice: "₹2,67,626",
        discountedPrice: "₹2,20,658",
        taxes: "+ ₹39,718 taxes",
        discount: "18% off",
        amenities: [
          "Breakfast",
          "Non-refundable",
          "PAN not Required",
          "SUPERIOR",
        ],
      },
      {
        id: 6,
        name: "Superior Double Room",
        type: "Room Only",
        refundable: "Non-refundable",
        paxRequired: "PAN not Required",
        image:
          "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=400&h=300&fit=crop",
        features: [
          "1 Double",
          "air conditioning",
          "bathtub",
          "bed",
          "television",
        ],
        originalPrice: "₹2,67,626",
        discountedPrice: "₹2,39,874",
        taxes: "+ ₹43,177 taxes",
        discount: "10% off",
        amenities: [
          "Breakfast",
          "Non-refundable",
          "PAN not Required",
          "Double room Superior",
          "Free Cancellation till 16th January 2025",
        ],
      },
    ],
    policies: {
      checkIn: "2:00 PM",
      checkOut: "12:00 PM",
    },
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <EmployeeHeader />
      {/* Header */}
      <HotelHeader
        name={hotelData.name}
        address={hotelData.address}
        rating={hotelData.rating}
        reviewCount={hotelData.reviewCount}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col gap-5"> 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <HotelImageGallery images={hotelData.images} />
            </div>
            {/* Right Column - Price Card */}
            <div className="lg:col-span-1">
              <div className=" top-6">
                <PriceCard
                  selectedRoom={selectedRoom || hotelData.roomTypes[0]}
                />
              </div>
            </div>
          </div>
         <div className="flex flex-col gap-5">
           {/* Hotel Info */}
          <HotelInfo
            description={hotelData.description}
            checkIn={hotelData.checkIn}
            checkOut={hotelData.checkOut}
          />

          {/* Amenities */}
          <Amenities amenities={hotelData.amenities} />

          {/* Room Types */}
          <RoomTypesList
            rooms={hotelData.roomTypes}
            onSelectRoom={setSelectedRoom}
          />
         </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailsPage;
