const {
  parseMiniFareRules,
  resolveOnlineReissueAllowed,
  resolveOnlineRefundAllowed,
} = require("../utils/miniFareRuleParser");

describe("miniFareRuleParser", () => {
  test("strict eligibility blocks reissue when no explicit online servicing flag is present", () => {
    const rawMiniFareRules = [
      {
        Type: "Cancellation",
        Details: "Cancellation fee INR 2,000 applies",
      },
    ];

    expect(resolveOnlineReissueAllowed(rawMiniFareRules, { strict: true })).toBe(false);
  });

  test("strict eligibility blocks refund when no explicit online refund flag is present", () => {
    const rawMiniFareRules = [
      {
        Type: "Reissue",
        Details: "Reissue fee INR 1,500 applies",
      },
    ];

    expect(resolveOnlineRefundAllowed(rawMiniFareRules, { strict: true })).toBe(false);
  });

  test("parses nested rules and keeps reissue and refund flags separated", () => {
    const rawMiniFareRules = {
      Rules: [
        [
          {
            Type: "Cancellation",
            OnlineRefundAllowed: false,
            Details: "Cancellation charge INR 2,000 applies",
          },
          {
            Type: "Reissue",
            OnlineReissueAllowed: true,
            Details: "Change fee INR 3,250 applies",
          },
        ],
      ],
    };

    const parsed = parseMiniFareRules(rawMiniFareRules, {
      strictEligibility: true,
      acceptRefundAsReissue: true,
    });

    expect(parsed.onlineReissueAllowed).toBe(true);
    expect(parsed.onlineRefundAllowed).toBe(false);
    expect(parsed.reissueRules).toHaveLength(1);
    expect(parsed.reissueRules[0].amount).toBe(3250);
    expect(parsed.journeyRules).toHaveLength(1);
    expect(parsed.cancellationRules).toHaveLength(1);
    expect(parsed.cancellationRules[0].amount).toBe(2000);
  });

  test("treats zero cancellation amount as refundable", () => {
    const parsed = parseMiniFareRules([
      {
        Type: 0,
        Details: "100% refund before departure",
        OnlineRefundAllowed: true,
      },
    ]);

    expect(parsed.refundableType).toBe("REFUNDABLE");
    expect(parsed.cancellationRules[0].percentage).toBe(100);
  });

  test("parses nested journey arrays and percentage reissue rules", () => {
    const parsed = parseMiniFareRules([
      [
        {
          Type: "Reissue",
          Details: "20% of booking fee",
          JourneyPoints: ["DEL", "BOM"],
        },
      ],
      [
        {
          Type: "Reissue",
          Details: "INR 3000",
          JourneyPoints: ["BOM", "DEL"],
        },
      ],
    ]);

    expect(parsed.hasNestedJourneys).toBe(true);
    expect(parsed.journeyRules).toHaveLength(2);
    expect(parsed.journeyRules[0][0].percentage).toBe(20);
    expect(parsed.journeyRules[1][0].amount).toBe(3000);
  });

  test("accepts cancellation servicing flag as reissue fallback in strict mode", () => {
    const parsed = parseMiniFareRules(
      {
        Rules: [
          {
            Type: "Cancellation",
            OnlineRefundAllowed: true,
            Details: "INR 0",
          },
        ],
      },
      {
        strictEligibility: true,
        acceptRefundAsReissue: true,
      },
    );

    expect(parsed.onlineReissueAllowed).toBe(true);
    expect(parsed.onlineRefundAllowed).toBe(true);
  });
});
