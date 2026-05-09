export const normalizeCurrencyText = (text) => {
  if (!text) return text;
  // Preserve original currency code (USD, INR, etc.) and format the number
  return text.replace(/([A-Z]{3})\s*(\d+)(?:\/-|\.00|\b)/gi, (match, currency, amount) => {
    return `${currency.toUpperCase()} ${Number(amount).toLocaleString("en-IN")}`;
  });
};

const expandShorthand = (text) => {
  if (!text) return "";
  let t = text.trim();
  t = t.replace(/\bnil\b/gi, "No Charge");
  t = t.replace(/\bna\b/gi, "Not Applicable");
  return t;
};

const parseFareRuleHtml = (html) => {
  if (!html) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const result = {
    fareHeader: { fareBasisCode: null, fareType: null },
    baggage: { checkIn: "", cabin: "", infant: "" },
    mealAndSeat: {
      meal: "As per airline policy",
      seat: "As per airline policy",
    },
    cancellation: [],
    reissue: [],
    notes: [],
  };

  // 1. FARE HEADER
  const fbcMatch = html.match(/FareBasisCode is:\s*<\/?\w*>?\s*([A-Z0-9]+)/i);
  if (fbcMatch) result.fareHeader.fareBasisCode = fbcMatch[1];

  // 2. TABLES (Baggage & Penalties)
  const tables = doc.querySelectorAll("table");
  tables.forEach(table => {
    const trs = Array.from(table.querySelectorAll("tr"));
    
    rows_loop: for (let i = 0; i < trs.length; i++) {
      const cells = Array.from(trs[i].querySelectorAll("td, th"));
      if (cells.length < 2) continue;

      const tds = cells.map(c => c.innerText.trim());
      const label = tds[0].toLowerCase();
      const value = expandShorthand(tds[tds.length - 1]);

      if (label.includes("cabin") || label.includes("hand")) result.baggage.cabin = value;
      else if (label.includes("check-in") || label.includes("adult")) result.baggage.checkIn = value;
    }
  });

  // 3. NOTES
  const lists = doc.querySelectorAll("ul, ol");
  lists.forEach(list => {
    const items = Array.from(list.querySelectorAll("li"));
    items.forEach(li => {
        const txt = li.innerText.trim();
        if (txt.length > 5 && txt.length < 300) result.notes.push(txt);
    });
  });

  return result;
};

/** Helper to parse ISO 8601 durations like P31DT7H or PT0S */
const parseISODuration = (iso) => {
  if (!iso || iso === "PT0S") return "0";
  const regex = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
  const match = iso.match(regex);
  if (!match) return iso;
  const days = match[1] ? `${match[1]} days` : "";
  const hrs = match[2] ? `${match[2]} hrs` : "";
  const mins = match[3] ? `${match[3]} mins` : "";
  return [days, hrs, mins].filter(Boolean).join(" ");
};

export const processFareRulesData = (rawRulesArray, quoteResults) => {
  if (!rawRulesArray || rawRulesArray.length === 0) return [];

  return rawRulesArray.map((rule) => {
    const rawHtml = rule.FareRuleDetail;
    const parsed = parseFareRuleHtml(rawHtml);

    // 4. INTEGRATE MINI FARE RULES (Dynamic)
    const miniRulesSource = rule.MiniFareRules || rule.MiniFarRules;
    
    if (miniRulesSource) {
      const rules = miniRulesSource.Rules || [];
      const globalCurrency = miniRulesSource.Currency || "INR";

      if (rules.length > 0) {
        const cancelRules = rules.filter((m) => m.Type === 0);
        const reissueRules = rules.filter((m) => m.Type === 1);

        if (cancelRules.length > 0) {
          parsed.cancellation = cancelRules.map((c) => {
            const p = c.PaxPenalties?.[0] || {};
            const curr = p.Currency || globalCurrency;
            const fee = p.AirlineFee || 0;
            const from = parseISODuration(c.FromDuration);
            const to = parseISODuration(c.ToDuration);
            const timeRange = to && to !== "0" ? `${from} to ${to}` : `${from} onwards`;
            
            return {
              timeRange: `${c.DepartureType || "Penalty"}: ${timeRange}`,
              fee: normalizeCurrencyText(`${curr} ${fee}`),
            };
          });
        }

        if (reissueRules.length > 0) {
          parsed.reissue = reissueRules.map((c) => {
            const p = c.PaxPenalties?.[0] || {};
            const curr = p.Currency || globalCurrency;
            const fee = p.AirlineFee || 0;
            const from = parseISODuration(c.FromDuration);
            const to = parseISODuration(c.ToDuration);
            const timeRange = to && to !== "0" ? `${from} to ${to}` : `${from} onwards`;

            return {
              timeRange: `${c.DepartureType || "Penalty"}: ${timeRange}`,
              fee: normalizeCurrencyText(`${curr} ${fee}`),
            };
          });
        }
      }
    }

    // Default Fallbacks if no rules found
    if (!parsed.cancellation || parsed.cancellation.length === 0) {
      parsed.cancellation = [{
        timeRange: "Standard Terms",
        fee: "Subject to airline policy",
      }];
    }
    if (!parsed.reissue || parsed.reissue.length === 0) {
      parsed.reissue = [{
        timeRange: "Standard Terms",
        fee: "Subject to airline policy",
      }];
    }

    return {
      airline: rule.Airline,
      origin: rule.Origin,
      destination: rule.Destination,
      fareBasisCode: parsed?.fareHeader?.fareBasisCode || rule.FareBasisCode,
      ...parsed,
      rawHtml,
    };
  });
};
