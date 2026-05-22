const {
  parseMiniFareRules,
  resolveOnlineReissueAllowed,
  resolveOnlineRefundAllowed,
} = require("../utils/miniFareRuleParser");

describe("miniFareRuleParser", () => {
  test("keeps online reissue allowed when only cancellation rules are present", () => {
    const rawMiniFareRules = [
      {
        Type: "Cancellation",
        OnlineRefundAllowed: false,
        Details: "Cancellation fee INR 2,000 applies",
      },
    ];

    expect(resolveOnlineReissueAllowed(rawMiniFareRules)).toBe(true);
  });

  test("keeps online refund allowed when only reissue rules are present", () => {
    const rawMiniFareRules = [
      {
        Type: "Reissue",
        OnlineReissueAllowed: false,
        Details: "Reissue fee INR 1,500 applies",
      },
    ];

    expect(resolveOnlineRefundAllowed(rawMiniFareRules)).toBe(true);
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

    const parsed = parseMiniFareRules(rawMiniFareRules);

    expect(parsed.onlineReissueAllowed).toBe(true);
    expect(parsed.onlineRefundAllowed).toBe(false);
    expect(parsed.reissueRules).toHaveLength(1);
    expect(parsed.reissueRules[0].amount).toBe(3250);
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
    expect(parsed.cancellationRules[0].amount).toBe(0);
  });
});
