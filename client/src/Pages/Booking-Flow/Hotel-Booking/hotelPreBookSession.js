export const HOTEL_PREBOOK_SESSION_EXPIRED_KEY =
  "hotelPreBookSessionExpiredNotice";

export const DEFAULT_HOTEL_PREBOOK_SESSION_MESSAGE =
  "Your hotel search session has expired. Please search again to get updated rates and availability.";

export const getHotelPreBookErrorMessage = (
  error,
  fallback = "PreBook failed",
) => {
  if (typeof error === "string") return error || fallback;

  return (
    error?.message ||
    error?.data?.Status?.Description ||
    error?.data?.Error?.ErrorMessage ||
    error?.Status?.Description ||
    error?.Error?.ErrorMessage ||
    error?.error ||
    fallback
  );
};

const getHotelPreBookErrorCode = (error) =>
  error?.code ||
  error?.data?.Status?.Code ||
  error?.Status?.Code ||
  error?.response?.data?.data?.Status?.Code;

export const isHotelPreBookSessionExpired = (error) => {
  const code = Number(getHotelPreBookErrorCode(error));
  const message = getHotelPreBookErrorMessage(error, "").toLowerCase();

  return (
    code === 315 ||
    message.includes("session expired") ||
    message.includes("doesn't exist") ||
    message.includes("does not exist")
  );
};

export const persistHotelPreBookSessionExpiredNotice = (
  message = DEFAULT_HOTEL_PREBOOK_SESSION_MESSAGE,
) => {
  const notice = {
    message: message || DEFAULT_HOTEL_PREBOOK_SESSION_MESSAGE,
    createdAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(
      HOTEL_PREBOOK_SESSION_EXPIRED_KEY,
      JSON.stringify(notice),
    );
  }

  return notice;
};

export const consumeHotelPreBookSessionExpiredNotice = () => {
  if (typeof window === "undefined") return null;

  const rawNotice = localStorage.getItem(HOTEL_PREBOOK_SESSION_EXPIRED_KEY);
  if (!rawNotice) return null;

  localStorage.removeItem(HOTEL_PREBOOK_SESSION_EXPIRED_KEY);

  try {
    return JSON.parse(rawNotice);
  } catch {
    return { message: DEFAULT_HOTEL_PREBOOK_SESSION_MESSAGE };
  }
};

export const handleHotelPreBookSessionExpiry = ({
  navigate,
  message = DEFAULT_HOTEL_PREBOOK_SESSION_MESSAGE,
  searchData = null,
} = {}) => {
  const finalMessage = message || DEFAULT_HOTEL_PREBOOK_SESSION_MESSAGE;
  const travelPath = "/travel?activeTab=hotel&hotelSessionExpired=1";
  const travelState = {
    activeTab: "hotel",
    hotelSessionExpired: true,
    hotelSessionExpiredMessage: finalMessage,
    prefillHotelSearch: searchData,
  };

  persistHotelPreBookSessionExpiredNotice(finalMessage);

  if (typeof window === "undefined") return;

  try {
    if (window.opener && !window.opener.closed) {
      window.opener.location.assign(`${window.location.origin}${travelPath}`);
      window.opener.focus();
      window.close();

      setTimeout(() => {
        if (!window.closed) {
          if (navigate) {
            navigate(travelPath, { replace: true, state: travelState });
          } else {
            window.location.assign(travelPath);
          }
        }
      }, 150);

      return;
    }
  } catch {
    // Fall back to navigating this tab below.
  }

  if (navigate) {
    navigate(travelPath, { replace: true, state: travelState });
    return;
  }

  window.location.assign(travelPath);
};
