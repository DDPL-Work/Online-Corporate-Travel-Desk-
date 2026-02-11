// components/HotelDetails/HotelImageGallery.jsx
import React, { useState } from 'react';
import { MdPhotoLibrary } from 'react-icons/md';

const HotelImageGallery = ({ images }) => {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm">
      <div className="grid grid-cols-2 gap-2 p-2">
        {/* Main Large Image */}
        <div className="col-span-2 relative group">
          <img 
            src={images[0]} 
            alt="Hotel main view"
            className="w-full h-96 object-cover rounded-lg"
          />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
  <img
    src={images[3] || images[0]} // fallback safety
    alt="Overlay view"
    className="w-full h-full object-cover rounded-lg"
  />
</div>

        </div>

        {/* Two Smaller Images */}
        <div className="relative group">
          <img 
            src={images[1]} 
            alt="Hotel view 2"
            className="w-full h-48 object-cover rounded-lg"
          />
         <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
  <img
    src={images[3] || images[0]} // fallback safety
    alt="Overlay view"
    className="w-full h-full object-cover rounded-lg"
  />
</div>

        </div>

        <div className="relative group">
          <img 
            src={images[2]} 
            alt="Hotel view 3"
            className="w-full h-48 object-cover rounded-lg"
          />
         <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
  <img
    src={images[3] || images[0]} // fallback safety
    alt="Overlay view"
    className="w-full h-full object-cover rounded-lg"
  />
</div>

          
          {/* View All Photos Button */}
          <button 
            onClick={() => setShowAll(true)}
            className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium"
          >
            <MdPhotoLibrary className="text-orange-500" />
            <span>+{images.length} Photos</span>
          </button>
        </div>
      </div>

      {/* Room Type Badge */}
      <div className="px-4 pb-4">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
          <span>Superior: Double</span>
          <button className="text-blue-500 underline hover:text-blue-700">View Details</button>
        </div>
      </div>
    </div>
  );
};

export default HotelImageGallery;