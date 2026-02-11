import React, { useState } from "react";
import Header from "./Hotel-Header";
import FilterSidebar from "./Filter-Sidebar";
import HotelCard from "./Hotel-Card";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";

function HotelSearchResults() {
  const [hotels] = useState([
    {
      id: 1,
      name: "Hotel S B Inn Paharganj",
      address: "897 Chandi Wali Gali Paharganj, New Delhi, 110055",
      rating: 3,
      price: 2485,
      image:
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop",
    },
    {
      id: 2,
      name: "Bir Home Stays",
      address: "Opposite Birbal Park, Jangpura, New Delhi, 110014",
      rating: 3,
      price: 2866,
      image:
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop",
    },
    {
      id: 3,
      name: "Hotel Dolphin Near Igi Airport",
      address: "Road No 02, New Delhi, 110037",
      rating: 3,
      price: 2909,
      image:
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop",
    },
    {
      id: 4,
      name: "Hotel Delhi Regency",
      address: "218 Asukasan Road, New Delhi, 110055",
      rating: 3,
      price: 3100,
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
    },
    {
      id: 5,
      name: "Hotel S B Inn Paharganj",
      address: "897 Chandi Wali Gali Paharganj, New Delhi, 110055",
      rating: 3,
      price: 2485,
      image:
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop",
    },
    {
      id: 6,
      name: "Bir Home Stays",
      address: "Opposite Birbal Park, Jangpura, New Delhi, 110014",
      rating: 3,
      price: 2866,
      image:
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop",
    },
    {
      id: 7,
      name: "Hotel Dolphin Near Igi Airport",
      address: "Road No 02, New Delhi, 110037",
      rating: 3,
      price: 2909,
      image:
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop",
    },
    {
      id: 8,
      name: "Hotel Delhi Regency",
      address: "218 Asukasan Road, New Delhi, 110055",
      rating: 3,
      price: 3100,
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
    },
    {
      id: 9,
      name: "Hotel S B Inn Paharganj",
      address: "897 Chandi Wali Gali Paharganj, New Delhi, 110055",
      rating: 3,
      price: 2485,
      image:
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop",
    },
    {
      id: 10,
      name: "Bir Home Stays",
      address: "Opposite Birbal Park, Jangpura, New Delhi, 110014",
      rating: 3,
      price: 2866,
      image:
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop",
    },
    {
      id: 11,
      name: "Hotel Dolphin Near Igi Airport",
      address: "Road No 02, New Delhi, 110037",
      rating: 3,
      price: 2909,
      image:
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop",
    },
    {
      id: 12,
      name: "Hotel Delhi Regency",
      address: "218 Asukasan Road, New Delhi, 110055",
      rating: 3,
      price: 3100,
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
    },
  ]);

  const [filters, setFilters] = useState({
    minPrice: 2484,
    maxPrice: 555957,
    starRating: [],
  });

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <EmployeeHeader />

      <Header />
      <div className="max-w-auto mx-10 overflow-x-hidden mt-5">
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-80 shrink-0">
              <FilterSidebar filters={filters} setFilters={setFilters} />
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Found {hotels.length} hotels for{" "}
                  <span className="font-bold">DELHI AND VICINITY</span>
                </h2>
              </div>

              <div className="flex gap-4 mb-6">
                <div className="flex gap-2">
                  <span className="text-gray-600">Sort By</span>
                  <button className="px-4 py-1 border border-gray-300 rounded hover:bg-gray-100">
                    Rating
                  </button>
                  <button className="px-4 py-1 border border-gray-300 rounded hover:bg-gray-100">
                    Preferred
                  </button>
                  <button className="px-4 py-1 border border-gray-300 rounded hover:bg-gray-100">
                    Price
                  </button>
                </div>
              </div>

              {/* Hotel Cards */}
              <div className="space-y-4">
                {hotels.map((hotel) => (
                  <HotelCard key={hotel.id} hotel={hotel} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HotelSearchResults;
