// components/HotelDetails/RoomTypesList.jsx
import React from 'react';
import RoomCard from './RoomCard';

const RoomTypesList = ({ rooms, onSelectRoom }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Room Types</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Order by:</span>
          <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent">
            <option>Popularity</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Rating</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {rooms.map((room) => (
          <RoomCard 
            key={room.id} 
            room={room}
            onSelect={() => onSelectRoom(room)}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomTypesList;