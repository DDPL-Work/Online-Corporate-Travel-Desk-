const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const matchesSeat = (oldSeat, newSeat) => {
  if (!oldSeat || !newSeat) return false;
  const oldCode = normalizeText(oldSeat.code || oldSeat.seatNo);
  const newCode = normalizeText(newSeat.code || newSeat.seatNo);
  return oldCode && oldCode === newCode;
};

const matchesMeal = (oldMeal, newMeal) => {
  if (!oldMeal || !newMeal) return false;
  const oldCode = normalizeText(oldMeal.code);
  const newCode = normalizeText(newMeal.code);
  if (oldCode && oldCode === newCode) return true;

  const oldDesc = normalizeText(oldMeal.description);
  const newDesc = normalizeText(newMeal.description);
  return oldDesc && oldDesc === newDesc;
};

const matchesBaggage = (oldBaggage, newBaggage) => {
  if (!oldBaggage || !newBaggage) return false;
  const oldCode = normalizeText(oldBaggage.code);
  const newCode = normalizeText(newBaggage.code);
  if (oldCode && oldCode === newCode) return true;

  // Compare weight (often parsed as number or string)
  const oldWeight = normalizeText(oldBaggage.weight);
  const newWeight = normalizeText(newBaggage.weight);
  if (oldWeight && oldWeight === newWeight) return true;

  const oldDesc = normalizeText(oldBaggage.description);
  const newDesc = normalizeText(newBaggage.description);
  return oldDesc && oldDesc === newDesc;
};

/**
 * Reconciles old SSR snapshot against new selected SSR.
 * @param {object} oldSSR - Old SSR snapshot, e.g. { seats: [], meals: [], baggage: [] }
 * @param {object} newSSRSelection - New SSR selection, e.g. { seats: [], meals: [], baggage: [] }
 * @returns {object} { reusableSSRValue, refundSSRValue, additionalSSRValue, details }
 */
function reconcileSSRs(oldSSR = {}, newSSRSelection = {}) {
  const oldSeats = [...(oldSSR?.seats || [])];
  const oldMeals = [...(oldSSR?.meals || [])];
  const oldBaggage = [...(oldSSR?.baggage || [])];

  const newSeats = [...(newSSRSelection?.seats || [])];
  const newMeals = [...(newSSRSelection?.meals || [])];
  const newBaggage = [...(newSSRSelection?.baggage || [])];

  let reusableSSRValue = 0;
  let refundSSRValue = 0;
  let additionalSSRValue = 0;

  // Seat Reconcile
  const seatReused = [];
  const seatRemoved = [];
  const seatAdded = [];

  newSeats.forEach((newSeat) => {
    const matchIdx = oldSeats.findIndex((oldSeat) => matchesSeat(oldSeat, newSeat));
    if (matchIdx !== -1) {
      const oldSeat = oldSeats[matchIdx];
      seatReused.push({ old: oldSeat, new: newSeat });
      reusableSSRValue += Number(oldSeat.price || 0);
      oldSeats.splice(matchIdx, 1); // remove from pool to avoid double match
    } else {
      seatAdded.push(newSeat);
      additionalSSRValue += Number(newSeat.price || 0);
    }
  });
  oldSeats.forEach((oldSeat) => {
    seatRemoved.push(oldSeat);
    refundSSRValue += Number(oldSeat.price || 0);
  });

  // Meal Reconcile
  const mealReused = [];
  const mealRemoved = [];
  const mealAdded = [];

  newMeals.forEach((newMeal) => {
    const matchIdx = oldMeals.findIndex((oldMeal) => matchesMeal(oldMeal, newMeal));
    if (matchIdx !== -1) {
      const oldMeal = oldMeals[matchIdx];
      mealReused.push({ old: oldMeal, new: newMeal });
      reusableSSRValue += Number(oldMeal.price || 0);
      oldMeals.splice(matchIdx, 1);
    } else {
      mealAdded.push(newMeal);
      additionalSSRValue += Number(newMeal.price || 0);
    }
  });
  oldMeals.forEach((oldMeal) => {
    mealRemoved.push(oldMeal);
    refundSSRValue += Number(oldMeal.price || 0);
  });

  // Baggage Reconcile
  const baggageReused = [];
  const baggageRemoved = [];
  const baggageAdded = [];

  newBaggage.forEach((newBagg) => {
    const matchIdx = oldBaggage.findIndex((oldBagg) => matchesBaggage(oldBagg, newBagg));
    if (matchIdx !== -1) {
      const oldBagg = oldBaggage[matchIdx];
      baggageReused.push({ old: oldBagg, new: newBagg });
      reusableSSRValue += Number(oldBagg.price || 0);
      oldBaggage.splice(matchIdx, 1);
    } else {
      baggageAdded.push(newBagg);
      additionalSSRValue += Number(newBagg.price || 0);
    }
  });
  oldBaggage.forEach((oldBagg) => {
    baggageRemoved.push(oldBagg);
    refundSSRValue += Number(oldBagg.price || 0);
  });

  return {
    reusableSSRValue,
    refundSSRValue,
    additionalSSRValue,
    details: {
      seats: { reused: seatReused, removed: seatRemoved, added: seatAdded },
      meals: { reused: mealReused, removed: mealRemoved, added: mealAdded },
      baggage: { reused: baggageReused, removed: baggageRemoved, added: baggageAdded },
    },
  };
}

module.exports = {
  reconcileSSRs,
};
