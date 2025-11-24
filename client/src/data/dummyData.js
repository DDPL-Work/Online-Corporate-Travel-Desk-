export const bookingsData = [
  { id: 1, date: '2024-01-15', department: 'Sales', employee: 'John Doe', type: 'Flight', destination: 'New York', amount: 450 },
  { id: 2, date: '2024-01-18', department: 'Marketing', employee: 'Jane Smith', type: 'Hotel', destination: 'London', amount: 320 },
  { id: 3, date: '2024-01-20', department: 'IT', employee: 'Mike Johnson', type: 'Flight', destination: 'Tokyo', amount: 1200 },
  { id: 4, date: '2024-01-22', department: 'Sales', employee: 'Sarah Williams', type: 'Hotel', destination: 'Paris', amount: 280 },
  { id: 5, date: '2024-02-01', department: 'HR', employee: 'Emily Brown', type: 'Flight', destination: 'Dubai', amount: 850 },
  { id: 6, date: '2024-02-05', department: 'Marketing', employee: 'Jane Smith', type: 'Hotel', destination: 'Singapore', amount: 420 },
  { id: 7, date: '2024-02-10', department: 'IT', employee: 'David Lee', type: 'Flight', destination: 'Berlin', amount: 380 },
  { id: 8, date: '2024-02-12', department: 'Sales', employee: 'John Doe', type: 'Hotel', destination: 'Rome', amount: 290 },
  { id: 9, date: '2024-02-15', department: 'Finance', employee: 'Lisa Anderson', type: 'Flight', destination: 'Sydney', amount: 1400 },
  { id: 10, date: '2024-02-18', department: 'HR', employee: 'Emily Brown', type: 'Hotel', destination: 'Barcelona', amount: 310 },
];

export const travelRequestsData = [
  { 
    id: 1, 
    requestDate: '2024-02-20', 
    employee: 'John Doe', 
    department: 'Sales', 
    type: 'Flight', 
    destination: 'New York',
    departureDate: '2024-03-01',
    returnDate: '2024-03-05',
    estimatedCost: 450,
    reason: 'Client meeting with Tech Corp',
    status: 'Pending',
    priority: 'High'
  },
  { 
    id: 2, 
    requestDate: '2024-02-21', 
    employee: 'Jane Smith', 
    department: 'Marketing', 
    type: 'Hotel', 
    destination: 'London',
    departureDate: '2024-03-10',
    returnDate: '2024-03-15',
    estimatedCost: 320,
    reason: 'Marketing conference attendance',
    status: 'Pending',
    priority: 'Medium'
  },
  { 
    id: 3, 
    requestDate: '2024-02-22', 
    employee: 'Mike Johnson', 
    department: 'IT', 
    type: 'Flight', 
    destination: 'Tokyo',
    departureDate: '2024-03-20',
    returnDate: '2024-03-28',
    estimatedCost: 1200,
    reason: 'Technical training and system implementation',
    status: 'Pending',
    priority: 'High'
  },
  { 
    id: 4, 
    requestDate: '2024-02-23', 
    employee: 'Sarah Williams', 
    department: 'Sales', 
    type: 'Hotel', 
    destination: 'Paris',
    departureDate: '2024-03-12',
    returnDate: '2024-03-16',
    estimatedCost: 280,
    reason: 'Partnership negotiation',
    status: 'Pending',
    priority: 'High'
  },
  { 
    id: 5, 
    requestDate: '2024-02-24', 
    employee: 'Emily Brown', 
    department: 'HR', 
    type: 'Flight', 
    destination: 'Dubai',
    departureDate: '2024-04-01',
    returnDate: '2024-04-07',
    estimatedCost: 850,
    reason: 'HR conference and talent acquisition',
    status: 'Pending',
    priority: 'Low'
  },
  { 
    id: 6, 
    requestDate: '2024-02-25', 
    employee: 'David Lee', 
    department: 'IT', 
    type: 'Hotel', 
    destination: 'Berlin',
    departureDate: '2024-03-18',
    returnDate: '2024-03-22',
    estimatedCost: 420,
    reason: 'Cloud infrastructure workshop',
    status: 'Pending',
    priority: 'Medium'
  },
];

export const approvedRequestsData = [
  { 
    id: 1, 
    requestDate: '2024-01-10', 
    approvedDate: '2024-01-12',
    approvedBy: 'Manager Smith',
    employee: 'John Doe', 
    department: 'Sales', 
    type: 'Flight', 
    destination: 'New York',
    departureDate: '2024-02-15',
    returnDate: '2024-02-20',
    estimatedCost: 450,
    actualCost: 425,
    reason: 'Client meeting with Tech Corp',
    bookingStatus: 'Booked',
    bookingReference: 'FL123456'
  },
  { 
    id: 2, 
    requestDate: '2024-01-12', 
    approvedDate: '2024-01-14',
    approvedBy: 'Director Johnson',
    employee: 'Jane Smith', 
    department: 'Marketing', 
    type: 'Hotel', 
    destination: 'London',
    departureDate: '2024-02-20',
    returnDate: '2024-02-25',
    estimatedCost: 320,
    actualCost: 310,
    reason: 'Marketing conference attendance',
    bookingStatus: 'Booked',
    bookingReference: 'HT789012'
  },
  { 
    id: 3, 
    requestDate: '2024-01-15', 
    approvedDate: '2024-01-17',
    approvedBy: 'Manager Smith',
    employee: 'Mike Johnson', 
    department: 'IT', 
    type: 'Flight', 
    destination: 'Tokyo',
    departureDate: '2024-03-05',
    returnDate: '2024-03-12',
    estimatedCost: 1200,
    actualCost: 1150,
    reason: 'Technical training and system implementation',
    bookingStatus: 'Booked',
    bookingReference: 'FL345678'
  },
  { 
    id: 4, 
    requestDate: '2024-01-18', 
    approvedDate: '2024-01-20',
    approvedBy: 'CEO Williams',
    employee: 'Sarah Williams', 
    department: 'Sales', 
    type: 'Hotel', 
    destination: 'Paris',
    departureDate: '2024-02-28',
    returnDate: '2024-03-04',
    estimatedCost: 280,
    actualCost: 280,
    reason: 'Partnership negotiation',
    bookingStatus: 'Pending Booking',
    bookingReference: null
  },
  { 
    id: 5, 
    requestDate: '2024-01-20', 
    approvedDate: '2024-01-22',
    approvedBy: 'Director Johnson',
    employee: 'Emily Brown', 
    department: 'HR', 
    type: 'Flight', 
    destination: 'Dubai',
    departureDate: '2024-03-15',
    returnDate: '2024-03-22',
    estimatedCost: 850,
    actualCost: 820,
    reason: 'HR conference and talent acquisition',
    bookingStatus: 'Booked',
    bookingReference: 'FL901234'
  },
  { 
    id: 6, 
    requestDate: '2024-01-25', 
    approvedDate: '2024-01-27',
    approvedBy: 'Manager Smith',
    employee: 'David Lee', 
    department: 'IT', 
    type: 'Hotel', 
    destination: 'Berlin',
    departureDate: '2024-03-08',
    returnDate: '2024-03-13',
    estimatedCost: 420,
    actualCost: 0,
    reason: 'Cloud infrastructure workshop',
    bookingStatus: 'Pending Booking',
    bookingReference: null
  },
  { 
    id: 7, 
    requestDate: '2024-02-01', 
    approvedDate: '2024-02-03',
    approvedBy: 'Director Johnson',
    employee: 'Lisa Anderson', 
    department: 'Finance', 
    type: 'Flight', 
    destination: 'Singapore',
    departureDate: '2024-03-20',
    returnDate: '2024-03-27',
    estimatedCost: 950,
    actualCost: 920,
    reason: 'Financial audit and compliance review',
    bookingStatus: 'Booked',
    bookingReference: 'FL567890'
  },
];

export const rejectedRequestsData = [
  {
    id: 301,
    employee: "Ravi Kumar",
    department: "Sales",
    type: "Flight",
    destination: "Mumbai",
    departureDate: "2024-02-15",
    returnDate: "2024-02-18",
    rejectedDate: "2024-02-05",
    approvedBy: "Manager A",
    estimatedCost: 450,
    status: "Rejected"
  },
  {
    id: 302,
    employee: "Nina Patel",
    department: "HR",
    type: "Hotel",
    destination: "Bengaluru",
    departureDate: "2024-03-10",
    returnDate: "2024-03-12",
    rejectedDate: "2024-03-02",
    approvedBy: "HR Head",
    estimatedCost: 220,
    status: "Cancelled"
  },
  {
    id: 303,
    employee: "Arjun Singh",
    department: "Finance",
    type: "Flight",
    destination: "Delhi",
    departureDate: "2024-04-05",
    returnDate: "2024-04-08",
    rejectedDate: "2024-03-28",
    approvedBy: "Finance Lead",
    estimatedCost: 380,
    status: "Rejected"
  },
  {
    id: 304,
    employee: "Priya Sharma",
    department: "Marketing",
    type: "Hotel",
    destination: "Hyderabad",
    departureDate: "2024-05-12",
    returnDate: "2024-05-15",
    rejectedDate: "2024-05-01",
    approvedBy: "Marketing Manager",
    estimatedCost: 290,
    status: "Cancelled"
  },
  {
    id: 305,
    employee: "Sonal Mehta",
    department: "Sales",
    type: "Flight",
    destination: "Pune",
    departureDate: "2024-06-22",
    returnDate: "2024-06-24",
    rejectedDate: "2024-06-10",
    approvedBy: "Sales Supervisor",
    estimatedCost: 310,
    status: "Rejected"
  },
  {
    id: 306,
    employee: "Manish Verma",
    department: "Operations",
    type: "Hotel",
    destination: "Chennai",
    departureDate: "2024-07-02",
    returnDate: "2024-07-04",
    rejectedDate: "2024-06-25",
    approvedBy: "Ops Manager",
    estimatedCost: 250,
    status: "Rejected"
  },
  {
    id: 307,
    employee: "Aditi Nair",
    department: "Finance",
    type: "Flight",
    destination: "Kolkata",
    departureDate: "2024-08-12",
    returnDate: "2024-08-15",
    rejectedDate: "2024-08-05",
    approvedBy: "Finance Lead",
    estimatedCost: 420,
    status: "Cancelled"
  },
  {
    id: 308,
    employee: "Harsh Gupta",
    department: "Support",
    type: "Hotel",
    destination: "Jaipur",
    departureDate: "2024-09-01",
    returnDate: "2024-09-03",
    rejectedDate: "2024-08-28",
    approvedBy: "Support Lead",
    estimatedCost: 180,
    status: "Rejected"
  },
  {
    id: 309,
    employee: "Divya Khandelwal",
    department: "IT",
    type: "Flight",
    destination: "Goa",
    departureDate: "2024-10-20",
    returnDate: "2024-10-23",
    rejectedDate: "2024-10-10",
    approvedBy: "CTO",
    estimatedCost: 500,
    status: "Cancelled"
  },
  {
    id: 310,
    employee: "Rohit Sharma",
    department: "Admin",
    type: "Hotel",
    destination: "Delhi",
    departureDate: "2024-11-15",
    returnDate: "2024-11-16",
    rejectedDate: "2024-11-05",
    approvedBy: "Admin Head",
    estimatedCost: 150,
    status: "Rejected"
  }
];

export const upcomingTripsData = [
  {
    id: 501,
    employee: "Ravi Kumar",
    department: "Sales",
    type: "Flight",
    destination: "Mumbai",
    departureDate: "2024-03-10",
    returnDate: "2024-03-13"
  },
  {
    id: 502,
    employee: "Nina Patel",
    department: "HR",
    type: "Hotel",
    destination: "Bengaluru",
    departureDate: "2024-04-05",
    returnDate: "2024-04-08"
  },
  {
    id: 503,
    employee: "Arjun Singh",
    department: "Finance",
    type: "Flight",
    destination: "Delhi",
    departureDate: "2024-05-12",
    returnDate: "2024-05-14"
  },
  {
    id: 504,
    employee: "Priya Sharma",
    department: "Marketing",
    type: "Hotel",
    destination: "Goa",
    departureDate: "2024-06-20",
    returnDate: "2024-06-23"
  },
  {
    id: 505,
    employee: "Aditi Nair",
    department: "Finance",
    type: "Flight",
    destination: "Kolkata",
    departureDate: "2024-07-01",
    returnDate: "2024-07-04"
  },
  {
    id: 506,
    employee: "Harsh Gupta",
    department: "Support",
    type: "Hotel",
    destination: "Jaipur",
    departureDate: "2024-08-10",
    returnDate: "2024-08-12"
  },
  {
    id: 507,
    employee: "Rohit Sharma",
    department: "Admin",
    type: "Flight",
    destination: "Hyderabad",
    departureDate: "2024-09-15",
    returnDate: "2024-09-17"
  }
];

export const usersData = [
{ id: 'U-01', name: 'Ravi Kumar', email: 'ravi@example.com', dept: 'Sales' },
{ id: 'U-02', name: 'Nina Patel', email: 'nina@example.com', dept: 'HR' },
{ id: 'U-03', name: 'Arjun Singh', email: 'arjun@example.com', dept: 'Finance' }
];

export const pastTripsData = [
  {
    id: 701,
    employee: "Ravi Kumar",
    department: "Sales",
    type: "Flight",
    destination: "Mumbai",
    departureDate: "2023-02-12",
    returnDate: "2023-02-14",
    rating: 4
  },
  {
    id: 702,
    employee: "Nina Patel",
    department: "HR",
    type: "Hotel",
    destination: "Delhi",
    departureDate: "2023-03-05",
    returnDate: "2023-03-07",
    rating: 5
  },
  {
    id: 703,
    employee: "Arjun Singh",
    department: "Finance",
    type: "Flight",
    destination: "Chennai",
    departureDate: "2023-04-20",
    returnDate: "2023-04-22",
    rating: 3
  },
  {
    id: 704,
    employee: "Priya Sharma",
    department: "Marketing",
    type: "Hotel",
    destination: "Goa",
    departureDate: "2023-05-10",
    returnDate: "2023-05-12",
    rating: 4
  },
  {
    id: 705,
    employee: "Rohit Sharma",
    department: "Admin",
    type: "Flight",
    destination: "Hyderabad",
    departureDate: "2023-06-18",
    returnDate: "2023-06-20",
    rating: 5
  },
  {
    id: 706,
    employee: "Aditi Nair",
    department: "Finance",
    type: "Hotel",
    destination: "Kolkata",
    departureDate: "2023-07-01",
    returnDate: "2023-07-03",
    rating: 3
  },
  {
    id: 707,
    employee: "Harsh Gupta",
    department: "Support",
    type: "Flight",
    destination: "Pune",
    departureDate: "2023-08-15",
    returnDate: "2023-08-17",
    rating: 4
  },
  {
    id: 708,
    employee: "Sonal Mehta",
    department: "Sales",
    type: "Hotel",
    destination: "Jaipur",
    departureDate: "2023-09-22",
    returnDate: "2023-09-24",
    rating: 5
  },
  {
    id: 709,
    employee: "Manish Verma",
    department: "Operations",
    type: "Flight",
    destination: "Nagpur",
    departureDate: "2023-10-08",
    returnDate: "2023-10-10",
    rating: 4
  }
];

export const corporateWalletData = [
  {
    id: 1,
    date: "2024-01-05",
    description: "Initial Wallet Credit",
    amount: 50000,
    type: "Credit",
  },
  {
    id: 2,
    date: "2024-01-10",
    description: "Flight Booking - Ravi",
    amount: 8000,
    type: "Debit",
  },
  {
    id: 3,
    date: "2024-01-22",
    description: "Hotel Booking - Priya",
    amount: 4500,
    type: "Debit",
  },
  {
    id: 4,
    date: "2024-02-02",
    description: "Wallet Top-Up",
    amount: 25000,
    type: "Credit",
  },
  {
    id: 5,
    date: "2024-02-20",
    description: "Flight Booking - Arjun",
    amount: 9000,
    type: "Debit",
  }
];

export const creditUtilizationData = [
  {
    id: 1,
    date: "2024-01-10",
    employee: "Ravi Kumar",
    department: "Sales",
    purpose: "Flight Booking - Mumbai",
    amount: 8500,
  },
  {
    id: 2,
    date: "2024-01-28",
    employee: "Priya Sharma",
    department: "Marketing",
    purpose: "Hotel Stay - Goa",
    amount: 5600,
  },
  {
    id: 3,
    date: "2024-02-12",
    employee: "Arjun Singh",
    department: "Finance",
    purpose: "Flight Booking - Delhi",
    amount: 9200,
  },
  {
    id: 4,
    date: "2024-02-18",
    employee: "Nina Patel",
    department: "HR",
    purpose: "Training Workshop Travel",
    amount: 4300,
  },
  {
    id: 5,
    date: "2024-03-05",
    employee: "Harsh Gupta",
    department: "Support",
    purpose: "Hotel Stay - Jaipur",
    amount: 2800,
  }
];

export const wallet = { prepaid: 155000, currency: 'INR' };

export const credit = { limit: 500000, used: 126000 };