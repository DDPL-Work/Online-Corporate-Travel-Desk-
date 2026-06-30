//\src\Pages\Booking-Flow\Hotel-Booking\HotelReviewBooking.jsx

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  MdArrowBack,
  MdVerifiedUser,
} from "react-icons/md";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiShield,
  FiMapPin,
  FiGlobe,
  FiInfo,
  FiBookOpen,
  FiShield as FiShieldIcon,
} from "react-icons/fi";
import LandingHeader from "../../../layout/LandingHeader";
import {
  createHotelBookingRequest,
  fetchHotelRequestById,
  executeHotelBooking,
  preBookHotel,
  instantHotelBooking,
} from "../../../Redux/Actions/hotelBooking.thunks";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import Swal from "sweetalert2";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Country } from "country-state-city";
import api from "../../../API/axios";
import { ProjectApproverBlock } from "./components/ProjectApproverBlock";
import { selectManager } from "../../../Redux/Actions/manager.thunk";
import { fetchMySSRPolicy } from "../../../Redux/Actions/ssrPolicy.thunks";
import CustomDatePicker from "../../../components/Shared/CustomDatePicker";
import { fetchMyProfile } from "../../../Redux/Slice/employeeActionSlice";
import {
  handleHotelPreBookSessionExpiry,
  isHotelPreBookSessionExpired,
} from "./hotelPreBookSession";

import {
  calculateNights,
  Required,
  Divider,
  SectionHeading,
  HotelHeroBanner,
  SelectedRoomDetailsCard,
  InfoCell,
} from "./components/ReviewPageComps";
import { GuestDetailsForm } from "./components/GuestDetailsForm";



const HotelReviewBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const dispatch = useDispatch();

  const [projectApproverData, setProjectApproverData] = useState({
    project: null,
    approver: null,
  });

  const { user } = useSelector((state) => state.auth);
  const { myProfile } = useSelector((state) => state.employeeAction || {});
  const { loading: actionLoading } = useSelector(
    (state) => state.hotelBookings,
  );
  const { hotels: searchedHotels } = useSelector((state) => state.hotel);
  const {
    selectedRequest,
    loading,
    error,
    preBookData,
    preBookLoading,
    preBookError,
  } = useSelector((state) => state.hotelBookings);

  const [formErrors, setFormErrors] = useState({});

  const { myPolicy } = useSelector((state) => state.ssrPolicy);
  const isTravelAdmin = user?.role === "travel-admin";

  const { hotel, rooms, searchParams } = location.state || {};

  const [travelers, setTravelers] = useState([]);
  const [purposeOfTravel, setPurposeOfTravel] = useState("");
  const [applyLeadPan, setApplyLeadPan] = useState(false);
  const [bookingRequest, setBookingRequest] = useState(null);
  const [flightRulesStatus, setFlightRulesStatus] = useState("loading"); // "loading", "ready", "error"
  const [isCorporateBooking, setIsCorporateBooking] = useState(false);
  const [gstDetails, setGstDetails] = useState({
    gstin: "",
    legalName: "",
    address: "",
    gstEmail: "",
  });

  const queryParams = new URLSearchParams(location.search);
  const bookingId = id || queryParams.get("id");
  const isBookNowMode = !!bookingId;

  const safeHotel =
    hotel ||
    bookingRequest?.hotelRequest?.selectedHotel ||
    bookingRequest?.hotelRequest?.rawHotelData ||
    {};

  const totalAdultsFromSearch =
    (searchParams?.rooms || searchParams?.PaxRooms || []).reduce(
      (sum, r) => sum + (r.Adults || r.adults || 0),
      0,
    ) || 1;
  const totalChildrenFromSearch =
    (searchParams?.rooms || searchParams?.PaxRooms || []).reduce(
      (sum, r) => sum + (r.Children || r.children || 0),
      0,
    ) || 0;
  const totalGuestsFromSearch = totalAdultsFromSearch + totalChildrenFromSearch;

  // ── Fetch booking by id ──
  useEffect(() => {
    if (id) dispatch(fetchHotelRequestById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (
      user?.role === "employee" ||
      user?.role === "manager" ||
      user?.role === "travel-admin" ||
      user?.role === "finance_team"
    ) {
      dispatch(fetchMySSRPolicy());
      dispatch(fetchMyProfile());
    }
  }, [dispatch, user]);

  // ── Fetch GST details ──
  useEffect(() => {
    const fetchGst = async () => {
      try {
        const { data } = await api.get("/employees/gst");
        if (data?.data) {
          setGstDetails((prev) => ({
            ...prev,
            gstin: data.data.gstin || "",
            legalName: data.data.legalName || "",
            address: data.data.address || "",
            gstEmail: data.data.gstEmail || "",
          }));
        }
      } catch (err) {
        console.warn("GST fetch failed", err?.message);
      }
    };
    fetchGst();
  }, []);

  // ── Populate from selectedRequest (BookNow mode) ──
  useEffect(() => {
    if (selectedRequest) {
      setBookingRequest(selectedRequest);
      setTravelers(selectedRequest.travellers || []);
      setPurposeOfTravel(selectedRequest.purposeOfTravel || "");
    }
  }, [selectedRequest]);

  // ── Generate traveler list from search params (non-BookNow mode) ──
  useEffect(() => {
    if (!isBookNowMode && travelers.length === 0 && user) {
      const generatedTravelers = [];
      const roomsFromSearch =
        searchParams?.rooms || searchParams?.PaxRooms || [];

      roomsFromSearch.forEach((room, roomIdx) => {
        const adults = room.Adults || room.adults || 0;
        const children = room.Children || room.children || 0;
        const childAges =
          room.childrenAges ||
          room.ChildrenAges ||
          room.ChildAge ||
          room.childAges ||
          [];

        for (let a = 0; a < adults; a++) {
          const isLead = generatedTravelers.length === 0;
          let fName = "";
          let lName = "";
          let email = "";
          let phone = "";
          let dob = "";
          let age = "";

          if (isLead) {
            if (myProfile) {
              if (typeof myProfile.name === "object") {
                fName = myProfile.name.firstName || "";
                lName = myProfile.name.lastName || "";
              } else {
                const rawName = myProfile.name || myProfile.displayName || "";
                const names = (typeof rawName === "string" ? rawName : "")
                  .trim()
                  .split(/\s+/);
                fName = names[0] || "";
                lName = names.slice(1).join(" ") || "";
              }
            }

            const sourceProfile = myProfile || user;
            if (sourceProfile) {
              email = sourceProfile.email || "";
              phone =
                sourceProfile.phone ||
                sourceProfile.mobile ||
                sourceProfile.phoneWithCode ||
                "";
              const rawDob =
                sourceProfile.dob || sourceProfile.dateOfBirth || "";
              dob = rawDob ? rawDob.split("T")[0] : "";
              if (dob) {
                const today = new Date();
                const birth = new Date(dob);
                if (!isNaN(birth.getTime())) {
                  age = today.getFullYear() - birth.getFullYear();
                  const m = today.getMonth() - birth.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                    age--;
                  }
                }
              }
            }
          }

          generatedTravelers.push({
            id: generatedTravelers.length + 1,
            title: "Mr",
            firstName: fName,
            lastName: lName,
            paxType: 1,
            age: age,
            dob: dob,
            gender: "Male",
            leadPassenger: isLead,
            email: email,
            phoneWithCode: phone,
            countryCode: searchParams?.guestNationality,
            nationality: searchParams?.guestNationality,
            panCard: "",
            roomIndex: roomIdx,
          });
        }

        for (let c = 0; c < children; c++) {
          generatedTravelers.push({
            id: generatedTravelers.length + 1,
            title: "Mr", // UI shows Mr. for children too
            firstName: "",
            lastName: "",
            paxType: 2,
            age: childAges[c] || "",
            originalAge: childAges[c] || "",
            dob: "",
            gender: "Male",
            leadPassenger: false,
            email: "",
            phoneWithCode: "",
            countryCode: searchParams?.guestNationality,
            nationality: searchParams?.guestNationality,
            panCard: "",
            roomIndex: roomIdx,
          });
        }
      });

      if (generatedTravelers.length === 0) {
        let fName = "";
        let lName = "";
        let email = "";
        let phone = "";
        let dob = "";
        let age = "";

        if (myProfile) {
          if (typeof myProfile.name === "object") {
            fName = myProfile.name.firstName || "";
            lName = myProfile.name.lastName || "";
          } else {
            const rawName = myProfile.name || myProfile.displayName || "";
            const names = (typeof rawName === "string" ? rawName : "")
              .trim()
              .split(/\s+/);
            fName = names[0] || "";
            lName = names.slice(1).join(" ") || "";
          }
        }

        const sourceProfile = myProfile || user;
        if (sourceProfile) {
          email = sourceProfile.email || "";
          phone =
            sourceProfile.phone ||
            sourceProfile.mobile ||
            sourceProfile.phoneWithCode ||
            "";
          const rawDob = sourceProfile.dob || sourceProfile.dateOfBirth || "";
          dob = rawDob ? rawDob.split("T")[0] : "";
          if (dob) {
            const today = new Date();
            const birth = new Date(dob);
            if (!isNaN(birth.getTime())) {
              age = today.getFullYear() - birth.getFullYear();
              const m = today.getMonth() - birth.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
              }
            }
          }
        }

        generatedTravelers.push({
          id: 1,
          title: "Mr",
          firstName: fName,
          lastName: lName,
          paxType: 1,
          age: age,
          dob: dob,
          gender: "Male",
          leadPassenger: true,
          email: email,
          phoneWithCode: phone,
          countryCode: searchParams?.guestNationality,
          nationality: searchParams?.guestNationality,
          panCard: "",
        });
      }

      setTravelers(generatedTravelers);
    }
  }, [
    user,
    myProfile,
    isBookNowMode,
    totalAdultsFromSearch,
    totalChildrenFromSearch,
    searchParams,
  ]);

  // ── Sync profile to lead passenger if myProfile loads later ──
  useEffect(() => {
    if (!isBookNowMode && travelers.length > 0 && myProfile) {
      setTravelers((prev) => {
        const newTravelers = [...prev];
        const leadIndex = newTravelers.findIndex((t) => t.leadPassenger);
        if (leadIndex !== -1) {
          let updated = false;
          const lead = { ...newTravelers[leadIndex] };

          if (myProfile) {
            let pFName = "";
            let pLName = "";
            if (typeof myProfile.name === "object") {
              pFName = myProfile.name.firstName || "";
              pLName = myProfile.name.lastName || "";
            } else {
              const rawName = myProfile.name || myProfile.displayName || "";
              const names = (typeof rawName === "string" ? rawName : "")
                .trim()
                .split(/\s+/);
              pFName = names[0] || "";
              pLName = names.slice(1).join(" ") || "";
            }

            if (pFName || pLName) {
              if (
                !lead.firstName ||
                lead.firstName !== pFName ||
                !lead.lastName ||
                lead.lastName !== pLName
              ) {
                lead.firstName = pFName;
                lead.lastName = pLName;
                updated = true;
              }
            }
          }

          if (!lead.phoneWithCode) {
            lead.phoneWithCode =
              myProfile.phone ||
              myProfile.mobile ||
              myProfile.phoneWithCode ||
              "";
            updated = true;
          }
          if (!lead.dob) {
            const rawDob = myProfile.dob || myProfile.dateOfBirth || "";
            lead.dob = rawDob ? rawDob.split("T")[0] : "";
            if (lead.dob) {
              const today = new Date();
              const birth = new Date(lead.dob);
              if (!isNaN(birth.getTime())) {
                let calcAge = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                  calcAge--;
                }
                lead.age = calcAge;
              }
            }
            updated = true;
          }
          if (updated) {
            newTravelers[leadIndex] = lead;
            return newTravelers;
          }
        }
        return prev;
      });
    }
  }, [myProfile, isBookNowMode]);

  // ── Autofill Corporate PAN Card when Corporate Booking is selected ──
  useEffect(() => {
    if (isCorporateBooking && myProfile?.corporate?.corporatePanCard?.number) {
      const corporatePan = myProfile.corporate.corporatePanCard.number;
      setTravelers((prev) =>
        prev.map((t) => ({ ...t, panCard: corporatePan })),
      );
    } else if (
      !isCorporateBooking &&
      myProfile?.corporate?.corporatePanCard?.number
    ) {
      const corporatePan = myProfile.corporate.corporatePanCard.number;
      setTravelers((prev) =>
        prev.map((t) => ({
          ...t,
          panCard: t.panCard === corporatePan ? "" : t.panCard,
        })),
      );
    }
  }, [isCorporateBooking, myProfile]);

  // ── Guest management ──
  const handleAddGuest = (paxType = 1) => {
    const limit = totalGuestsFromSearch || totalAdultsFromSearch;
    if (travelers.length >= limit) {
      ToastWithTimer({
        type: "error",
        message: "Guest count cannot exceed selected guests",
      });
      return;
    }
    setTravelers((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        title: "Mr",
        firstName: "",
        lastName: "",
        paxType,
        age: "",
        dob: "",
        gender: "Male",
        leadPassenger: false,
        email: "",
        phoneWithCode: "",
        countryCode: searchParams?.guestNationality,
        nationality: searchParams?.guestNationality,
        PassportNo: "",
        PassportIssueDate: "",
        PassportExpDate: "",
        panCard: "",
      },
    ]);
  };

  const handleRemoveGuest = (id) => {
    const limit = totalGuestsFromSearch || totalAdultsFromSearch;
    if (travelers.length <= limit) {
      ToastWithTimer({
        type: "error",
        message: "Cannot have less guests than selected",
      });
      return;
    }
    setTravelers((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (!updated.some((t) => t.leadPassenger) && updated.length > 0)
        updated[0].leadPassenger = true;
      return updated;
    });
  };

  const updateTraveler = (id, field, value) =>
    setTravelers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );

  // ── Derived state ──
  const isApproved = bookingRequest?.requestStatus === "approved";
  const approvedBy = bookingRequest?.approvedBy;

  const hotelFromSearch = searchedHotels?.find(
    (h) =>
      h.HotelCode ===
      (hotel?.hotelCode || bookingRequest?.hotelRequest?.hotelCode),
  );

  const displayHotel = isBookNowMode
    ? {
        name:
          bookingRequest?.bookingSnapshot?.hotelName ||
          bookingRequest?.hotelRequest?.selectedHotel?.hotelName,
        rating: 4,
        address:
          bookingRequest?.hotelRequest?.selectedHotel?.address ||
          bookingRequest?.bookingSnapshot?.city,
        city:
          bookingRequest?.bookingSnapshot?.city ||
          bookingRequest?.hotelRequest?.selectedHotel?.city,
        country:
          bookingRequest?.bookingSnapshot?.country ||
          bookingRequest?.hotelRequest?.selectedHotel?.country,
        images: [
          bookingRequest?.bookingSnapshot?.hotelImage ||
            "/placeholder-hotel.jpg",
        ],
        resultIndex:
          bookingRequest?.hotelRequest?.resultIndex ||
          hotelFromSearch?.ResultIndex,
      }
    : {
        ...hotel,
        resultIndex: hotel?.resultIndex || hotelFromSearch?.ResultIndex,
        city: hotel?.city || hotel?.cityName || hotel?.CityName,
        country: hotel?.country || hotel?.countryName || hotel?.CountryName,
      };

  const selectedRoom = rooms || [];

  const hotelCountry =
    displayHotel?.country ||
    displayHotel?.CountryName ||
    displayHotel?.address?.split(",")?.slice(-1)[0]?.trim() ||
    "";

  // ── PreBook data ──
  const activePreBookData = preBookData || preBookError?.data;
  const preBookRooms = activePreBookData?.HotelResult?.[0]?.Rooms || [];
  const preBookRateConditions =
    activePreBookData?.HotelResult?.[0]?.RateConditions || []; // ← NEW
  const validation =
    activePreBookData?.HotelResult?.[0]?.ValidationInfo ||
    activePreBookData?.ValidationInfo ||
    {};

  const requiredFlags = {
    isPANRequired: validation?.PanMandatory,
    isPassportRequired: validation?.PassportMandatory,
    isEmailRequired: true,
    isPhoneRequired: true,
  };

  const getCountryCode = (countryNameOrCode) => {
    if (!countryNameOrCode) return "";
    if (countryNameOrCode.length === 2) return countryNameOrCode;
    const found = Country.getAllCountries().find(
      (c) => c.name.toLowerCase() === countryNameOrCode.toLowerCase(),
    );
    return found?.isoCode || "";
  };

  const hotelCountryCode =
    preBookData?.HotelResult?.[0]?.CountryCode ||
    displayHotel?.CountryCode ||
    displayHotel?.countryCode ||
    getCountryCode(hotelCountry);

  const isInternationalBooking = travelers.some((t) => {
    const travelerCountryCode = getCountryCode(t.nationality || t.countryCode);
    if (!travelerCountryCode || !hotelCountryCode) return false;
    return travelerCountryCode !== hotelCountryCode;
  });

  const displayRoom = {
    RoomTypeName:
      selectedRoom?.Name?.[0] || selectedRoom?.roomTypeName || "Room",
    MealType: selectedRoom?.MealType || selectedRoom?.mealType || "—",
    IsRefundable:
      selectedRoom?.IsRefundable ?? selectedRoom?.isRefundable ?? false,
    Inclusion: selectedRoom?.Inclusion || "",
    CancelPolicies: selectedRoom?.CancelPolicies || [],
    TotalFare:
      selectedRoom?.TotalFare || bookingRequest?.pricingSnapshot?.totalAmount,
    Currency: bookingRequest?.pricingSnapshot?.currency || "INR",
    DayRates: selectedRoom?.DayRates || [[{}]],
    Price: selectedRoom?.Price || {},
    BookingCode: selectedRoom?.BookingCode || "",
  };

  const bookingCode = selectedRoom?.[0]?.BookingCode;
  useEffect(() => {
    if (!bookingCode) return;
    console.log("🔥 PreBook Triggered:", bookingCode);
    let isMounted = true;

    const runPreBook = async () => {
      try {
        await dispatch(preBookHotel({ BookingCode: bookingCode })).unwrap();
      } catch (err) {
        if (!isMounted) return;

        console.error("PreBook Error:", err);

        if (isHotelPreBookSessionExpired(err)) {
          handleHotelPreBookSessionExpiry({ navigate });
        }
      }
    };

    runPreBook();

    return () => {
      isMounted = false;
    };
  }, [bookingCode, dispatch, navigate]);

  const displaySearchParams = isBookNowMode
    ? {
        checkIn: bookingRequest?.bookingSnapshot?.checkInDate,
        checkOut: bookingRequest?.bookingSnapshot?.checkOutDate,
        rooms:
          bookingRequest?.hotelRequest?.rooms ||
          bookingRequest?.hotelRequest?.PaxRooms ||
          [],
      }
    : searchParams;

  const totalAdults = (
    displaySearchParams?.rooms ||
    displaySearchParams?.PaxRooms ||
    []
  ).reduce((sum, r) => sum + (r.Adults || r.adults || 0), 0);
  const totalChildren = (
    displaySearchParams?.rooms ||
    displaySearchParams?.PaxRooms ||
    []
  ).reduce((sum, r) => sum + (r.Children || r.children || 0), 0);
  const countries = Country.getAllCountries();
  const selectedRooms = rooms || [];

  const preBookBaseFare = preBookRooms.reduce(
    (sum, r) => sum + (r.TotalFare || r.NetAmount || r.Price?.TotalFare || 0),
    0,
  );
  const preBookTax = preBookRooms.reduce(
    (sum, r) => sum + (r.TotalTax || r.NetTax || r.Price?.Tax || 0),
    0,
  );

  let totalFare =
    preBookBaseFare > 0
      ? preBookBaseFare
      : selectedRooms.reduce(
          (sum, r) =>
            sum + (r.TotalFare || r.NetAmount || r.Price?.TotalFare || 0),
          0,
        );

  const isAutoApprove = myPolicy?.approvalRequired === false;

  let applicableLimit = 0;
  let isUnlimitedLimit = true;
  if (myPolicy?.hotelLimits?.length) {
    const loc =
      hotelCountryCode?.toUpperCase() === "IN" ? "Domestic" : "International";
    const starNum = Number(displayHotel?.rating) || 3;
    const limitObj = myPolicy.hotelLimits.find(
      (l) => l.location === loc && l.starRating === starNum,
    );
    if (limitObj) {
      applicableLimit = limitObj.limit;
      isUnlimitedLimit = limitObj.isUnlimited !== false;
    }
  }

  const isOverLimit =
    isAutoApprove &&
    !isUnlimitedLimit &&
    applicableLimit > 0 &&
    totalFare > applicableLimit;
  const approvalRequired = !isTravelAdmin && (!isAutoApprove || isOverLimit);

  let tax =
    preBookBaseFare > 0
      ? preBookTax
      : selectedRooms.reduce(
          (sum, r) => sum + (r.TotalTax || r.NetTax || r.Price?.Tax || 0),
          0,
        );

  const baseFare = totalFare - tax;
  const price = displayRoom?.Price || displayRoom || {};
  const search = searchParams;

  const validateTravellers = (travellers) => {
    const errors = {}; // { travelerId: { field: "message" } }

    const minLen = validation?.PaxNameMinLength || 2;
    const maxLen = validation?.PaxNameMaxLength || 50;
    const allowSpace = validation?.SpaceAllowed ?? true;
    const allowSpecial = validation?.SpecialCharAllowed ?? false;
    const allowSameName = validation?.SamePaxNameAllowed ?? true;

    let namePattern = "^[A-Za-z";
    if (allowSpace) namePattern += "\\s";
    if (allowSpecial) namePattern += ".,'-";
    namePattern += `]{${minLen},${maxLen}}$`;
    const nameRegex = new RegExp(namePattern);

    const emailRegex = /^[a-zA-Z0-9.]+@[a-zA-Z0-9.]+\.[a-zA-Z]{2,}$/;
    const allowedTitles = ["Mr", "Ms", "Mrs", "Miss", "Master"];

    const fullNameSet = new Set();
    const firstNameSet = new Set();

    travellers.forEach((t, index) => {
      const tErrors = {};
      const fName = t.firstName?.trim();
      const lName = t.lastName?.trim();

      // TITLE
      if (!allowedTitles.includes(t.title)) {
        tErrors.title = "Invalid title";
      }

      // FIRST NAME
      if (!fName || !nameRegex.test(fName)) {
        tErrors.firstName = `First name must be ${minLen}-${maxLen} characters${!allowSpace ? " (no spaces)" : ""}`;
      } else if (!allowSameName && firstNameSet.has(fName.toLowerCase())) {
        tErrors.firstName = "First name must be unique";
      } else {
        firstNameSet.add(fName.toLowerCase());
      }

      // LAST NAME
      if (!lName || !nameRegex.test(lName)) {
        tErrors.lastName = `Last name must be ${minLen}-${maxLen} characters${!allowSpace ? " (no spaces)" : ""}`;
      }

      // SAME NAME CHECK
      if (
        !allowSameName &&
        fName &&
        lName &&
        fName.toLowerCase() === lName.toLowerCase()
      ) {
        tErrors.lastName = "First and Last name cannot be identical";
      }

      // DUPLICATE FULL NAME CHECK
      const mName = t.middleName?.trim() || "";
      const fullName = `${fName}-${mName}-${lName}`.toLowerCase();
      if (fName && lName) {
        if (!allowSameName && fullNameSet.has(fullName)) {
          tErrors.lastName = "Duplicate full name detected";
        } else {
          fullNameSet.add(fullName);
        }
      }

      // EMAIL
      if (t.paxType === 1) {
        if (!t.email) {
          tErrors.email = "Email is required";
        } else if (!emailRegex.test(t.email)) {
          tErrors.email = "Invalid email format";
        }
      }

      // AGE VALIDATION
      const ageNum = Number(t.age);
      if (t.paxType === 2) {
        // DOB is required for children
        if (!t.dob) {
          tErrors.dob = "Date of Birth is required for child";
        } else {
          // Calculate age from DOB and check if it matches the searched age
          const today = new Date();
          const birth = new Date(t.dob);
          if (isNaN(birth.getTime())) {
            tErrors.dob = "Invalid Date of Birth";
          } else {
            let calcAge = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate()))
              calcAge--;
            if (t.originalAge && String(calcAge) !== String(t.originalAge)) {
              tErrors.dob = `Age from DOB (${calcAge} yrs) does not match searched age (${t.originalAge} yrs). Please enter a valid Date of Birth.`;
            }
          }
        }
        if (!tErrors.dob && (isNaN(ageNum) || ageNum < 0 || ageNum > 18)) {
          tErrors.age = "Child age must be 0-18";
        }
      } else {
        if (t.dob || t.age) {
          if (isNaN(ageNum) || ageNum <= 18) {
            tErrors.age = "Adult age must be above 18";
          }
        }
      }

      // PAN CARD
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      const isAdult = t.paxType === 1 && Number(t.age) > 18;
      const panRequiredCount = validation?.PanCountRequired || 0;

      let isPanMandatoryForThisTraveller = false;
      if (validation?.PanMandatory) {
        if (panRequiredCount > 0) {
          isPanMandatoryForThisTraveller = index < panRequiredCount;
        } else {
          isPanMandatoryForThisTraveller = isAdult;
        }
      }

      if (isPanMandatoryForThisTraveller) {
        if (!t.panCard) {
          tErrors.panCard = "PAN Card is mandatory";
        } else if (!panRegex.test(t.panCard)) {
          tErrors.panCard = "Invalid PAN format (ABCDE1234F)";
        }
      } else if (t.panCard && !panRegex.test(t.panCard)) {
        tErrors.panCard = "Invalid PAN format";
      }

      // PASSPORT
      if (isInternationalBooking && requiredFlags.isPassportRequired) {
        if (!t.PassportNo) tErrors.PassportNo = "Passport number is required";
        if (!t.PassportIssueDate)
          tErrors.PassportIssueDate = "Issue date is required";
        if (!t.PassportExpDate)
          tErrors.PassportExpDate = "Expiry date is required";
      }

      // PHONE (Lead only)
      if (t.leadPassenger && !t.phoneWithCode) {
        tErrors.phoneWithCode = "Phone number is required";
      }

      // EMAIL (Lead only - ensuring it's always checked for lead)
      if (t.leadPassenger && !t.email) {
        tErrors.email = "Email is required for lead traveler";
      }

      if (Object.keys(tErrors).length > 0) {
        errors[t.id] = tErrors;
      }
    });

    return errors;
  };

  // ── Submit: Request for Approval ──
  const handleRequestApproval = async () => {
    if (travelers.length !== totalGuestsFromSearch) {
      ToastWithTimer({
        type: "error",
        message: `Please add exactly ${totalGuestsFromSearch} guests`,
      });
      return;
    }

    let hasGlobalErrors = false;
    const newGlobalErrors = {};

    if (!purposeOfTravel) {
      newGlobalErrors.purposeOfTravel = "Please enter purpose of travel";
      hasGlobalErrors = true;
    }

    if (!projectApproverData.project || !projectApproverData.project.id) {
      newGlobalErrors.project = "Project ID is required";
      hasGlobalErrors = true;
    }

    if (approvalRequired && !isTravelAdmin) {
      if (!projectApproverData.approver) {
        newGlobalErrors.approver = "Please select an approver";
        hasGlobalErrors = true;
      }
    }

    const errors = validateTravellers(travelers);
    setFormErrors({ ...errors, ...newGlobalErrors });

    if (Object.keys(errors).length > 0 || hasGlobalErrors) {
      return;
    }
    if (!selectedRoom.length) {
      ToastWithTimer({
        type: "error",
        message: "Please select at least one room",
      });
      return;
    }

    const totalAdultsPax = travelers.length;
    const totalRooms = selectedRoom.length;
    const adultsPerRoom = Math.floor(totalAdultsPax / totalRooms);
    const extra = totalAdultsPax % totalRooms;

    const roomGuests = selectedRoom.map((_, i) => ({
      noOfAdults: adultsPerRoom + (i < extra ? 1 : 0),
      noOfChild: 0,
      childAge: [],
    }));

    const buildPaxRooms = (rooms) =>
      rooms.map((room) => ({
        Adults: Number(room.Adults || room.adults || 0),
        Children: Number(room.Children || room.children || 0),
        ChildrenAges:
          room.childrenAges ||
          room.ChildrenAges ||
          room.childAges ||
          room.ChildAge ||
          [],
      }));

    const payload = {
      bookingType: "hotel",
      ...(isCorporateBooking && { IsCorporate: true }),
      projectName: projectApproverData.project?.name,
      projectId: projectApproverData.project?.id,
      projectClient: projectApproverData.project?.client,
      approverId: projectApproverData.approver?.id,
      approverEmail: projectApproverData.approver?.email,
      approverName: projectApproverData.approver?.name,
      approverRole: projectApproverData.approver?.role,
      hotelRequest: {
        ...(isCorporateBooking && { IsCorporate: true }),
        hotelCode:
          safeHotel?.HotelCode ||
          safeHotel?.hotelCode ||
          bookingRequest?.hotelRequest?.selectedHotel?.hotelCode,
        bookingCode:
          (preBookRooms.length > 0 ? preBookRooms : selectedRoom)[0]
            ?.BookingCode ||
          (preBookRooms.length > 0 ? preBookRooms : selectedRoom)[0]
            ?.RoomTypeCode,
        traceId:
          preBookData?.TraceId ||
          searchParams?.traceId ||
          searchParams?.TraceId,
        preBookResponse: preBookData,
        roomIndex: selectedRoom?.RoomIndex,
        checkIn: search?.checkIn,
        checkOut: search?.checkOut,
        guestNationality: searchParams?.guestNationality,
        roomGuests:
          displaySearchParams?.rooms?.map((r) => ({
            noOfAdults: r.Adults || r.adults || 0,
            noOfChild: r.Children || r.children || 0,
            childAge:
              r.childrenAges ||
              r.ChildrenAges ||
              r.ChildAge ||
              r.childAges ||
              [],
          })) || roomGuests,
        PaxRooms: buildPaxRooms(searchParams.rooms),
        NoOfRooms: searchParams.rooms.length,
      },
      travellers: travelers.map((t) => ({
        title: t.paxType === 2 ? "Master" : t.title.replace(".", ""), // Strip dot for adults if needed, or send as is
        firstName: t.firstName,
        lastName: t.lastName,
        gender: t.gender || "Male",
        dob: t.dob,
        age: t.age,
        email: t.email,
        phoneWithCode: t.phoneWithCode,
        nationality: t.nationality,
        isLeadPassenger: t.leadPassenger,
        panCard: t.panCard || "",
        PassportExpDate: t.PassportExpDate || "",
        PassportIssueDate: t.PassportIssueDate || "",
        PassportNo: t.PassportNo || "",
      })),
      requesterDetails: {
        name: `${user?.name?.firstName} ${user?.name?.lastName}`,
        email: user?.email,
        role: user?.role,
        userId: user?._id || user?.id || user?.userId,
      },
      purposeOfTravel,
      gstDetails,
      pricingSnapshot: {
        totalAmount: totalFare,
        currency: displayRoom?.Currency || "INR",
      },
      bookingSnapshot: {
        hotelName: displayHotel?.name || displayHotel?.HotelName,
        hotelImage: displayHotel?.images?.[0] || "/placeholder-hotel.jpg",
        city:
          displayHotel?.city ||
          displayHotel?.cityName ||
          displaySearchParams?.city,
        country:
          displayHotel?.country || displayHotel?.countryName || hotelCountry,
        checkInDate: displaySearchParams?.checkIn,
        checkOutDate: displaySearchParams?.checkOut,
        roomCount: displaySearchParams?.rooms?.length || 1,
        nights: calculateNights(
          displaySearchParams?.checkIn,
          displaySearchParams?.checkOut,
        ),
        amount: totalFare,
        currency: displayRoom?.Currency || "INR",
      },
    };

    try {
      // --- Handle Manual Project Creation ---
      if (projectApproverData.project && !projectApproverData.project._id) {
        try {
          const projectRes = await api.post("/corporate-projects/create", {
            projectCodeId: projectApproverData.project.id,
            projectName: projectApproverData.project.name,
            clientName: projectApproverData.project.client,
          });
          // Update the local project data with the created _id so further processes use it if needed
          if (projectRes.data?.data?._id) {
             projectApproverData.project._id = projectRes.data.data._id;
          }
        } catch (projErr) {
           console.error("Failed to save manual project:", projErr);
        }
      }

      // --- Handle Manager Request Creation / Selection ---
      const isApproverTravelAdmin =
        projectApproverData.approver?.role === "travel-admin";
      if (approvalRequired && !isTravelAdmin && !isApproverTravelAdmin) {
        if (projectApproverData.approver && projectApproverData.project) {
          await dispatch(
            selectManager({
              approverId: projectApproverData.approver?.id,
              approverEmail: projectApproverData.approver?.email,
              projectCodeId: projectApproverData.project?.id,
              projectName: projectApproverData.project?.name,
              projectClient: projectApproverData.project?.client,
            }),
          ).unwrap();
        }
      }

      if (!approvalRequired) {
        const result = await dispatch(instantHotelBooking(payload)).unwrap();

        if (result.status === "booked") {
          ToastWithTimer({
            type: "success",
            message: "Hotel booked instantly successfully!",
          });
          navigate("/my-bookings");
        } else {
          ToastWithTimer({
            type: "success",
            message: "Booking request submitted successfully",
          });
          navigate("/my-pending-approvals");
        }
        return;
      }

      const result = await dispatch(
        createHotelBookingRequest(payload),
      ).unwrap();

      ToastWithTimer({
        type: "success",
        message: "Booking request submitted successfully",
      });
      navigate("/my-pending-approvals");
    } catch (err) {
      let rawErr = err;
      if (err && typeof err === "object") {
        rawErr = err.error || err.message || err.data?.message || err;
      }
      
      const errorMsg =
        typeof rawErr === "string" ? rawErr : "Failed to submit request";

      const isSupplierError = 
        errorMsg.toLowerCase().includes("price has changed") ||
        errorMsg.toLowerCase().includes("tolerance") ||
        errorMsg.toLowerCase().includes("supplier response") ||
        errorMsg.toLowerCase().includes("interaction failed");

      if (isSupplierError) {
        // Price has changed, tolerance exceeded, or generic supplier failure
        return Swal.fire({
          icon: "warning",
          title: "Availability or Price Changed",
          text: "The price or availability for this hotel has changed since you searched. Please search again to get the latest options.",
          confirmButtonText: "Search Again",
          showCancelButton: true,
          cancelButtonText: "Cancel",
          confirmButtonColor: "#C9A84C",
        }).then((res) => {
          if (res.isConfirmed) {
            navigate("/travel", {
              state: {
                activeTab: "hotel",
                prefillHotelSearch: {
                  city: displayHotel?.city || displaySearchParams?.city,
                  checkIn: displaySearchParams?.checkIn,
                  checkOut: displaySearchParams?.checkOut,
                  rooms: displaySearchParams?.rooms,
                  nationality: displaySearchParams?.nationality,
                  roomConfigs: displaySearchParams?.roomConfigs,
                  guestNationality: displaySearchParams?.guestNationality,
                },
              },
            });
          }
        });
      }

      Swal.fire({
        icon: "error",
        title: "Booking Failed",
        text: errorMsg,
        confirmButtonColor: "#C9A84C",
      });
    }
  };

  // ── Submit: Book Now (approved mode) ──
  const handleBookNow = async () => {
    try {
      const result = await Swal.fire({
        title: "Confirm Your Booking",
        text: `Are you sure you want to book ${displayHotel?.name}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#C9A84C",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, Confirm & Book",
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            return await dispatch(executeHotelBooking(bookingId)).unwrap();
          } catch (error) {
            Swal.showValidationMessage(error);
          }
        },
        allowOutsideClick: () => !Swal.isLoading(),
      });

      if (result.isConfirmed) {
        ToastWithTimer({
          type: "success",
          message: "Hotel booked successfully!",
        });
        navigate("/my-bookings");
      }
    } catch (err) {
      console.error("Booking error:", err);
    }
  };

  const handleAction = () =>
    isBookNowMode ? handleBookNow() : handleRequestApproval();

  // ── Guards ──
  if (!isBookNowMode && (!hotel || !rooms || !searchParams)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Session expired. Please go back and select hotel again.</p>
      </div>
    );
  }

  if (isBookNowMode && !bookingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading booking details…</p>
        </div>
      </div>
    );
  }

  if (loading && !hotel && !isBookNowMode) return <div>Loading...</div>;
  // Removed global error return to prevent blank page on API error

  /* ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <LandingHeader />

      {/* ── Sticky back bar ── */}
      <div className="bg-[#0A203E] border-b border-slate-200 sticky top-[64px] z-40">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#C9A84C] tracking-tight">
            Review your Booking
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-100 hover:text-[#C9A84C] transition font-medium"
          >
            <MdArrowBack size={18} />
            Back to Details
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── FULL-WIDTH HOTEL HERO ── */}
        <HotelHeroBanner
          displayHotel={displayHotel}
          displaySearchParams={displaySearchParams}
          displayRoom={displayRoom}
          selectedRoom={selectedRoom}
          totalAdults={totalAdults}
          totalChildren={totalChildren}
        />

        {/* ── FULL-WIDTH ROOM DETAILS (with all PreBook fields) ── */}
        {(preBookRooms.length ? preBookRooms : selectedRoom).map(
          (room, index) => {
            const baseRoom = selectedRoom[index] || {};
            // Merge properties from baseRoom into room to prevent losing amenities/images
            const mergedRoom = {
              ...baseRoom,
              ...room,
              CancelPolicies: room?.CancelPolicies?.length
                ? room.CancelPolicies
                : baseRoom.CancelPolicies,
              Amenities: room?.Amenities?.length
                ? room.Amenities
                : baseRoom.Amenities,
            };
            return (
              <SelectedRoomDetailsCard
                key={index}
                selectedRoom={baseRoom}
                displayRoom={mergedRoom}
                displaySearchParams={displaySearchParams}
                rateConditions={index === 0 ? preBookRateConditions : []}
              />
            );
          },
        )}

        {/* ── BOTTOM: Guest details (left 2/3) + Price summary (right 1/3) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT: Guest Details ── */}
            <GuestDetailsForm 
              isBookNowMode={isBookNowMode}
              approvedBy={approvedBy}
              travelers={travelers}
              updateTraveler={updateTraveler}
              countries={countries}
              totalAdultsFromSearch={totalAdultsFromSearch}
              totalChildrenFromSearch={totalChildrenFromSearch}
              formErrors={formErrors}
              requiredFlags={requiredFlags}
              isCorporateBooking={isCorporateBooking}
              setIsCorporateBooking={setIsCorporateBooking}
              applyLeadPan={applyLeadPan}
              setApplyLeadPan={setApplyLeadPan}
              setTravelers={setTravelers}
              isInternationalBooking={isInternationalBooking}
              validation={validation}
              purposeOfTravel={purposeOfTravel}
              setPurposeOfTravel={setPurposeOfTravel}
            />

          {/* ── RIGHT: Price Summary ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <ProjectApproverBlock
                onChange={setProjectApproverData}
                errors={formErrors}
                approvalRequired={approvalRequired}
                isOverLimit={isOverLimit}
                applicableLimit={applicableLimit}
              />

              <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-black/20 overflow-hidden">
                <div className="bg-linear-to-r from-[#C9A84C] to-[#C9A84C] px-5 py-4">
                  <h3 className="text-sm font-bold text-[#0A203E] mb-0.5">
                    Price Summary
                  </h3>
                  <p className="text-[11px] text-[#0A203E]/70 font-medium">
                    Transparent pricing, no hidden fees
                  </p>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                    <span>Total Fare</span>
                    <span>₹{baseFare.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                    <span>Total Tax</span>
                    <span>₹{tax.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-600">
                      Total
                    </span>
                    <span className="text-2xl font-black text-[#C9A84C]">
                      ₹{totalFare.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 text-right">
                    {displayRoom?.Currency || "INR"} · Incl. all taxes
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleAction}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-[#000D26] uppercase tracking-wider bg-linear-to-r from-[#C9A84C] to-[#C9A84C] hover:bg-[#B39340] hover:from-[#B39340] hover:to-[#B39340] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#C9A84C]/20"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                      Submitting Request...
                    </>
                  ) : isBookNowMode ? (
                    "Confirm & Book Now"
                  ) : approvalRequired ? (
                    "Request for Approval"
                  ) : (
                    "Confirm & Book"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelReviewBooking;