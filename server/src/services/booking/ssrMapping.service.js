const logger = require("../../utils/logger");

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const normalizeJourneyType = (value) => {
  const text = normalizeText(value);
  if (text === "return") return "return";
  return "onward";
};

const wayTypeToJourneyType = (wayType) =>
  Number(wayType) === 2 ? "return" : "onward";

const getSeatOptions = (response = {}, journeyType) => {
  const seatRoots = response?.Response?.SeatDynamic || response?.SeatDynamic || [];

  return seatRoots.flatMap((root) =>
    (root?.SegmentSeat || []).flatMap((segmentSeat) =>
      (segmentSeat?.RowSeats || []).flatMap((row) =>
        (row?.Seats || []).map((seat) => ({
          type: "seat",
          journeyType:
            journeyType ||
            normalizeJourneyType(
              segmentSeat?.WayType
                ? wayTypeToJourneyType(segmentSeat.WayType)
                : "onward",
            ),
          code: seat?.Code || `${seat?.RowNo || row?.RowNo || ""}${seat?.ColumnNo || ""}`,
          description:
            seat?.Code || `${seat?.RowNo || row?.RowNo || ""}${seat?.ColumnNo || ""}`,
          price: toMoney(seat?.Price),
          currency: seat?.Currency || "INR",
          airlineCode: seat?.AirlineCode || segmentSeat?.AirlineCode,
          flightNumber: seat?.FlightNumber || segmentSeat?.FlightNumber,
          origin: seat?.Origin || segmentSeat?.Origin,
          destination: seat?.Destination || segmentSeat?.Destination,
          wayType: segmentSeat?.WayType,
        })),
      ),
    ),
  );
};

const getMealOptions = (response = {}, journeyType) => {
  const meals =
    response?.Response?.MealDynamic?.flat() || response?.MealDynamic?.flat() || [];

  return meals.map((meal) => ({
    type: "meal",
    journeyType:
      journeyType ||
      normalizeJourneyType(meal?.WayType ? wayTypeToJourneyType(meal.WayType) : "onward"),
    code: meal?.Code,
    description: meal?.Description || meal?.AirlineDescription || meal?.Code,
    price: toMoney(meal?.Price),
    currency: meal?.Currency || "INR",
    airlineCode: meal?.AirlineCode,
    flightNumber: meal?.FlightNumber,
    origin: meal?.Origin,
    destination: meal?.Destination,
    wayType: meal?.WayType,
  }));
};

const getBaggageOptions = (response = {}, journeyType) => {
  const baggage = response?.Response?.Baggage?.flat() || response?.Baggage?.flat() || [];

  return baggage.map((bag) => ({
    type: "baggage",
    journeyType:
      journeyType ||
      normalizeJourneyType(bag?.WayType ? wayTypeToJourneyType(bag.WayType) : "onward"),
    code: bag?.Code,
    description: bag?.Description || `${bag?.Weight || ""}`.trim() || bag?.Code,
    weight: bag?.Weight,
    price: toMoney(bag?.Price),
    currency: bag?.Currency || "INR",
    airlineCode: bag?.AirlineCode,
    flightNumber: bag?.FlightNumber,
    origin: bag?.Origin,
    destination: bag?.Destination,
    wayType: bag?.WayType,
  }));
};

const normalizeLiveOptions = (ssrResponses = []) =>
  ssrResponses.flatMap((item) => [
    ...getSeatOptions(item?.response, item?.journeyType),
    ...getMealOptions(item?.response, item?.journeyType),
    ...getBaggageOptions(item?.response, item?.journeyType),
  ]);

const normalizeSnapshotCollection = (items = [], type) =>
  items.map((item) => ({
    ...item,
    type,
    code:
      type === "seat"
        ? item?.code || item?.seatNo || item?.description
        : item?.code || item?.description,
    description: item?.description || item?.code || item?.seatNo,
    price: toMoney(item?.price),
    currency: item?.currency || "INR",
    journeyType: item?.journeyType ? normalizeJourneyType(item.journeyType) : undefined,
  }));

const normalizeSnapshot = (snapshot = {}) => ({
  seats: normalizeSnapshotCollection(snapshot?.seats || [], "seat"),
  meals: normalizeSnapshotCollection(snapshot?.meals || [], "meal"),
  baggage: normalizeSnapshotCollection(snapshot?.baggage || [], "baggage"),
});

const getSelectionJourneyType = (selection, segments = []) =>
  normalizeJourneyType(selection?.journeyType || segments?.[selection?.segmentIndex]?.journeyType);

const matchesSegment = (option, selection, segments = []) => {
  const segment = segments?.[selection?.segmentIndex];

  if (!segment) return true;

  const expectedJourney = getSelectionJourneyType(selection, segments);
  if (option.journeyType && option.journeyType !== expectedJourney) {
    return false;
  }

  if (
    option.airlineCode &&
    normalizeText(option.airlineCode) !== normalizeText(segment.airlineCode)
  ) {
    return false;
  }

  if (
    option.flightNumber &&
    normalizeText(option.flightNumber) !== normalizeText(segment.flightNumber)
  ) {
    return false;
  }

  if (
    option.origin &&
    normalizeText(option.origin) !== normalizeText(segment.origin?.airportCode)
  ) {
    return false;
  }

  if (
    option.destination &&
    normalizeText(option.destination) !== normalizeText(segment.destination?.airportCode)
  ) {
    return false;
  }

  return true;
};

const buildComparableKeys = (selection, type) => {
  if (type === "seat") {
    return {
      exact: [
        normalizeText(selection?.code),
        normalizeText(selection?.seatNo),
      ].filter(Boolean),
      fallback: [normalizeText(selection?.description)].filter(Boolean),
    };
  }

  if (type === "baggage") {
    return {
      exact: [
        normalizeText(selection?.code),
        normalizeText(selection?.weight),
      ].filter(Boolean),
      fallback: [normalizeText(selection?.description)].filter(Boolean),
    };
  }

  return {
    exact: [normalizeText(selection?.code)].filter(Boolean),
    fallback: [normalizeText(selection?.description)].filter(Boolean),
  };
};

const optionComparableKeys = (option, type) => {
  if (type === "seat") {
    return {
      exact: [normalizeText(option?.code)].filter(Boolean),
      fallback: [normalizeText(option?.description)].filter(Boolean),
    };
  }

  if (type === "baggage") {
    return {
      exact: [normalizeText(option?.code), normalizeText(option?.weight)].filter(Boolean),
      fallback: [normalizeText(option?.description)].filter(Boolean),
    };
  }

  return {
    exact: [normalizeText(option?.code)].filter(Boolean),
    fallback: [normalizeText(option?.description)].filter(Boolean),
  };
};

const matchSelection = ({ selection, type, segments, liveOptions }) => {
  const relevantOptions = liveOptions.filter(
    (option) => option.type === type && matchesSegment(option, selection, segments),
  );

  if (!relevantOptions.length) {
    return null;
  }

  const desiredKeys = buildComparableKeys(selection, type);

  const exactMatch = relevantOptions.find((option) =>
    optionComparableKeys(option, type).exact.some((key) => desiredKeys.exact.includes(key)),
  );

  if (exactMatch) {
    return {
      option: exactMatch,
      matchedBy: "CODE",
    };
  }

  const descriptionMatch = relevantOptions.find((option) =>
    optionComparableKeys(option, type).fallback.some((key) =>
      desiredKeys.fallback.includes(key),
    ),
  );

  if (descriptionMatch) {
    return {
      option: descriptionMatch,
      matchedBy: "DESCRIPTION",
    };
  }

  return null;
};

const calculateSnapshotTotals = (snapshot = {}) => {
  const totalSeatAmount = toMoney(
    (snapshot?.seats || []).reduce((sum, item) => sum + Number(item?.price || 0), 0),
  );
  const totalMealAmount = toMoney(
    (snapshot?.meals || []).reduce((sum, item) => sum + Number(item?.price || 0), 0),
  );
  const totalBaggageAmount = toMoney(
    (snapshot?.baggage || []).reduce((sum, item) => sum + Number(item?.price || 0), 0),
  );

  return {
    totalSeatAmount,
    totalMealAmount,
    totalBaggageAmount,
    totalAmount: toMoney(totalSeatAmount + totalMealAmount + totalBaggageAmount),
  };
};

const describeSelection = (selection, type) => {
  if (type === "seat") {
    return selection?.seatNo || selection?.code || selection?.description || "seat";
  }

  if (type === "baggage") {
    return selection?.description || selection?.weight || selection?.code || "baggage";
  }

  return selection?.description || selection?.code || type;
};

const buildNotification = ({ resolution, type, before, after, matchedBy, difference }) => ({
  type,
  resolution,
  matchedBy: matchedBy || null,
  message:
    resolution === "REMOVED"
      ? `${type} "${describeSelection(before, type)}" is no longer available`
      : resolution === "PRICE_CHANGED"
        ? `${type} "${describeSelection(after, type)}" price changed`
        : `${type} "${describeSelection(after, type)}" applied`,
  before,
  after: after || null,
  difference: typeof difference === "number" ? difference : null,
});

const mapCollection = ({ selections = [], type, segments, liveOptions }) => {
  const mapped = [];
  const removed = [];
  const repriced = [];
  const mappedSelections = [];
  const notifications = [];
  const selectionResolutions = [];

  selections.forEach((selection) => {
    const match = matchSelection({
      selection,
      type,
      segments,
      liveOptions,
    });

    if (!match) {
      const removedItem = {
        type,
        selection,
      };

      removed.push(removedItem);
      notifications.push(
        buildNotification({
          resolution: "REMOVED",
          type,
          before: selection,
        }),
      );
      selectionResolutions.push({
        type,
        resolution: "REMOVED",
        matchedBy: null,
        before: selection,
        after: null,
      });
      return;
    }

    const matchedOption = match.option;
    const mappedSelection = {
      ...selection,
      code: matchedOption.code || selection.code,
      description: matchedOption.description || selection.description,
      price: matchedOption.price,
      currency: matchedOption.currency || selection.currency || "INR",
      journeyType: selection.journeyType || matchedOption.journeyType,
    };

    if (type === "seat") {
      mappedSelection.seatNo =
        matchedOption.code || selection.seatNo || selection.code;
    }

    if (type === "baggage") {
      mappedSelection.weight = matchedOption.weight || selection.weight;
    }

    const difference = toMoney(matchedOption.price - Number(selection?.price || 0));
    const resolution = difference === 0 ? "APPLIED" : "PRICE_CHANGED";

    mapped.push(mappedSelection);
    mappedSelections.push({
      type,
      matchedBy: match.matchedBy,
      resolution,
      before: selection,
      after: mappedSelection,
    });
    selectionResolutions.push({
      type,
      matchedBy: match.matchedBy,
      resolution,
      before: selection,
      after: mappedSelection,
    });

    if (resolution === "PRICE_CHANGED") {
      const repricedItem = {
        type,
        matchedBy: match.matchedBy,
        before: selection,
        after: mappedSelection,
        difference,
      };

      repriced.push(repricedItem);
      notifications.push(
        buildNotification({
          resolution,
          type,
          before: selection,
          after: mappedSelection,
          matchedBy: match.matchedBy,
          difference,
        }),
      );
      return;
    }

    notifications.push(
      buildNotification({
        resolution,
        type,
        before: selection,
        after: mappedSelection,
        matchedBy: match.matchedBy,
      }),
    );
  });

  return {
    mapped,
    removed,
    repriced,
    mappedSelections,
    notifications,
    selectionResolutions,
  };
};

const mapSsrSnapshot = ({
  oldSnapshot = {},
  storedSegments = [],
  ssrResponses = [],
}) => {
  const normalizedOldSnapshot = normalizeSnapshot(oldSnapshot);
  const liveOptions = normalizeLiveOptions(ssrResponses);

  logger.info("SSR mapping started", {
    liveOptionCount: liveOptions.length,
    oldSeatCount: normalizedOldSnapshot.seats.length,
    oldMealCount: normalizedOldSnapshot.meals.length,
    oldBaggageCount: normalizedOldSnapshot.baggage.length,
  });

  const seatResult = mapCollection({
    selections: normalizedOldSnapshot.seats,
    type: "seat",
    segments: storedSegments,
    liveOptions,
  });

  const mealResult = mapCollection({
    selections: normalizedOldSnapshot.meals,
    type: "meal",
    segments: storedSegments,
    liveOptions,
  });

  const baggageResult = mapCollection({
    selections: normalizedOldSnapshot.baggage,
    type: "baggage",
    segments: storedSegments,
    liveOptions,
  });

  const mappedSnapshot = {
    seats: seatResult.mapped,
    meals: mealResult.mapped,
    baggage: baggageResult.mapped,
  };

  const totals = calculateSnapshotTotals(mappedSnapshot);

  mappedSnapshot.totalSeatAmount = totals.totalSeatAmount;
  mappedSnapshot.totalMealAmount = totals.totalMealAmount;
  mappedSnapshot.totalBaggageAmount = totals.totalBaggageAmount;
  mappedSnapshot.totalAmount = totals.totalAmount;

  const removedSelections = [
    ...seatResult.removed,
    ...mealResult.removed,
    ...baggageResult.removed,
  ];

  const repricedSelections = [
    ...seatResult.repriced,
    ...mealResult.repriced,
    ...baggageResult.repriced,
  ];

  const mappedSelections = [
    ...seatResult.mappedSelections,
    ...mealResult.mappedSelections,
    ...baggageResult.mappedSelections,
  ];

  const notifications = [
    ...seatResult.notifications,
    ...mealResult.notifications,
    ...baggageResult.notifications,
  ];

  const selectionResolutions = [
    ...seatResult.selectionResolutions,
    ...mealResult.selectionResolutions,
    ...baggageResult.selectionResolutions,
  ];

  return {
    mappedSnapshot,
    audit: {
      removedSelections,
      repricedSelections,
      mappedSelections,
      selectionResolutions,
      notifications,
      selectionCounts: {
        requested: selectionResolutions.length,
        applied: selectionResolutions.filter((item) => item.resolution === "APPLIED").length,
        repriced: repricedSelections.length,
        removed: removedSelections.length,
      },
      hasChanges: removedSelections.length > 0 || repricedSelections.length > 0,
      availabilityChanged: removedSelections.length > 0,
      priceChanged: repricedSelections.length > 0,
      ...totals,
    },
  };
};

module.exports = {
  calculateSnapshotTotals,
  mapSsrSnapshot,
  normalizeLiveOptions,
};
