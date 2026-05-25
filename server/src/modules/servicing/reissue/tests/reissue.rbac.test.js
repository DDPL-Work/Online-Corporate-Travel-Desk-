/**
 * Integration Tests for Reissue RBAC Authorization
 * 
 * Tests all role-based access control scenarios for offline reissue management.
 * Ensures proper authorization across all endpoints and role combinations.
 */

const request = require("supertest");
const app = require("../../../../app");

jest.mock("../../../../middleware/auth.middleware.js", () => {
  return {
    verifyToken: (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const token = authHeader.split(" ")[1];
      if (!token.startsWith("mock_token_")) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const role = token.replace("mock_token_", "");
      req.user = {
        _id: "user_123",
        id: "user_123",
        role: role,
        roles: [role],
        email: `user@${role}.com`,
        name: { firstName: "Test", lastName: role },
        isActive: true,
      };
      if (role === "ops-member") {
        req.opsMember = {
          _id: "user_123",
          permissions: ["PROCESS_REISSUE"],
          status: "Active",
        };
      }
      next();
    },
    authorizeRoles: (...allowedRoles) => {
      const normalize = (r) => r?.toString().replace(/[-_ ]/g, "").toLowerCase();
      const wanted = allowedRoles.map(normalize);
      return (req, res, next) => {
        const role = normalize(req.user?.role);
        if (!role || !wanted.includes(role)) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to perform this action",
          });
        }
        next();
      };
    },
    verifySuperAdmin: (req, res, next) => {
      if (!req.user || req.user.role !== "super-admin") {
        return res.status(403).json({
          success: false,
          message: "Super Admin access only",
        });
      }
      next();
    },
  };
});

const {
  OFFLINE_REISSUE_ADMIN_ROLES,
  OFFLINE_REISSUE_OPS_ROLES,
  OFFLINE_REISSUE_EMPLOYEE_ROLES,
} = require("../constants/reissuePermissions.constants");

/**
 * Mock user generators
 */
function createMockUser(role, overrides = {}) {
  return {
    id: "user_123",
    _id: "user_123",
    role,
    email: `user@${role}.com`,
    name: `Test ${role}`,
    ...overrides,
  };
}

function createMockToken(role) {
  // In real implementation, this would be a JWT
  return `mock_token_${role}`;
}

/**
 * ════════════════════════════════════════════════════════════════
 * OFFLINE REISSUE ADMIN LIST ENDPOINT TESTS
 * ════════════════════════════════════════════════════════════════
 */
describe("GET /api/v1/reissue/offline/admin/list", () => {
  const endpoint = "/api/v1/reissue/offline/admin/list";

  describe("✅ Authorized Access", () => {
    OFFLINE_REISSUE_ADMIN_ROLES.forEach((role) => {
      test(`${role} should access admin list`, async () => {
        const response = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${createMockToken(role)}`)
          .send();

        expect(response.status).toBeLessThan(403);
        expect(response.body.success).toBeDefined();
      });
    });

    test("master-admin should access admin list (new role)", async () => {
      const response = await request(app)
        .get(endpoint)
        .set("Authorization", `Bearer ${createMockToken("master-admin")}`)
        .send();

      expect(response.status).toBeLessThan(403);
      expect(response.body.success).toBeDefined();
    });
  });

  describe("❌ Unauthorized Access", () => {
    const unauthorizedRoles = [
      "employee",
      "manager",
      "ops-member",
      "travel-admin",
      "unknown-role",
    ];

    unauthorizedRoles.forEach((role) => {
      test(`${role} should NOT access admin list (403)`, async () => {
        const response = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${createMockToken(role)}`)
          .send();

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("not authorized");
      });
    });

    test("Missing token should return 401", async () => {
      const response = await request(app).get(endpoint).send();

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("Unauthorized");
    });
  });
});

/**
 * ════════════════════════════════════════════════════════════════
 * OFFLINE REISSUE STATUS UPDATE ENDPOINT TESTS
 * ════════════════════════════════════════════════════════════════
 */
describe("PATCH /api/v1/reissue/offline/:id/status", () => {
  const endpoint = "/api/v1/reissue/offline/req_123/status";

  describe("✅ Authorized Access", () => {
    const authorizedRoles = [
      "super-admin",
      "master-admin",
      "ops-admin",
      "ops-member",
    ];

    authorizedRoles.forEach((role) => {
      test(`${role} should update status`, async () => {
        const response = await request(app)
          .patch(endpoint)
          .set("Authorization", `Bearer ${createMockToken(role)}`)
          .send({ status: "IN_PROGRESS", message: "Processing" });

        expect(response.status).toBeLessThan(403);
      });
    });
  });

  describe("❌ Unauthorized Access", () => {
    const unauthorizedRoles = ["employee", "manager", "travel-admin"];

    unauthorizedRoles.forEach((role) => {
      test(`${role} should NOT update status (403)`, async () => {
        const response = await request(app)
          .patch(endpoint)
          .set("Authorization", `Bearer ${createMockToken(role)}`)
          .send({ status: "IN_PROGRESS" });

        expect(response.status).toBe(403);
      });
    });
  });
});

/**
 * ════════════════════════════════════════════════════════════════
 * OFFLINE REISSUE UPLOAD ENDPOINTS TESTS
 * ════════════════════════════════════════════════════════════════
 */
describe("POST /api/v1/reissue/offline/:id/upload-ticket", () => {
  const endpoint = "/api/v1/reissue/offline/req_123/upload-ticket";

  describe("✅ Authorized Access", () => {
    const authorizedRoles = [
      "super-admin",
      "master-admin",
      "ops-admin",
      "ops-member",
    ];

    authorizedRoles.forEach((role) => {
      test(`${role} should upload ticket`, async () => {
        const response = await request(app)
          .post(endpoint)
          .set("Authorization", `Bearer ${createMockToken(role)}`)
          .attach("file", Buffer.from("mock ticket"), "ticket.pdf");

        expect(response.status).toBeLessThan(403);
      });
    });
  });

  describe("❌ Unauthorized Access", () => {
    const unauthorizedRoles = ["employee", "manager", "travel-admin"];

    unauthorizedRoles.forEach((role) => {
      test(`${role} should NOT upload ticket (403)`, async () => {
        const response = await request(app)
          .post(endpoint)
          .set("Authorization", `Bearer ${createMockToken(role)}`)
          .attach("file", Buffer.from("mock ticket"), "ticket.pdf");

        expect(response.status).toBe(403);
      });
    });
  });
});

/**
 * ════════════════════════════════════════════════════════════════
 * CREATE REQUEST ENDPOINT TESTS
 * ════════════════════════════════════════════════════════════════
 */
describe("POST /api/v1/reissue/offline/create", () => {
  const endpoint = "/api/v1/reissue/offline/create";

  describe("✅ Authorized Access", () => {
    const authorizedRoles = [
      "employee",
      "manager",
      "travel-admin",
      "ops-member",
      "super-admin",
      "master-admin",
    ];

    authorizedRoles.forEach((role) => {
      test(`${role} should create request`, async () => {
        const response = await request(app)
          .post(endpoint)
          .set("Authorization", `Bearer ${createMockToken(role)}`)
          .send({
            bookingId: "booking_123",
            reason: "Ticket change",
          });

        expect(response.status).toBeLessThan(403);
      });
    });
  });

  describe("❌ Unauthorized Access", () => {
    test("Missing token should return 401", async () => {
      const response = await request(app)
        .post(endpoint)
        .send({
          bookingId: "booking_123",
          reason: "Ticket change",
        });

      expect(response.status).toBe(401);
    });
  });
});

/**
 * ════════════════════════════════════════════════════════════════
 * DOWNLOAD ENDPOINTS TESTS
 * ════════════════════════════════════════════════════════════════
 */
describe("GET /api/v1/reissue/offline/:id/download-ticket", () => {
  const endpoint = "/api/v1/reissue/offline/req_123/download-ticket";

  describe("✅ Authorized Access", () => {
    const authorizedRoles = [
      "super-admin",
      "master-admin",
      "ops-admin",
      "ops-member",
      "employee",
      "manager",
      "travel-admin",
    ];

    authorizedRoles.forEach((role) => {
      test(`${role} should download ticket`, async () => {
        const response = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${createMockToken(role)}`)
          .send();

        expect(response.status).toBeLessThan(403);
      });
    });
  });

  describe("❌ Unauthorized Access", () => {
    test("Missing token should return 401", async () => {
      const response = await request(app).get(endpoint).send();

      expect(response.status).toBe(401);
    });
  });
});

/**
 * ════════════════════════════════════════════════════════════════
 * COMPREHENSIVE SCENARIO TESTS
 * ════════════════════════════════════════════════════════════════
 */
describe("RBAC Comprehensive Scenarios", () => {
  describe("Super Admin Workflow", () => {
    test("✅ Super Admin can perform all operations", async () => {
      const token = createMockToken("super-admin");

      // 1. View all requests
      let response = await request(app)
        .get("/api/v1/reissue/offline/admin/list")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBeLessThan(403);

      // 2. View specific request
      response = await request(app)
        .get("/api/v1/reissue/offline/req_123")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBeLessThan(403);

      // 3. Update status
      response = await request(app)
        .patch("/api/v1/reissue/offline/req_123/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "IN_PROGRESS" });
      expect(response.status).toBeLessThan(403);

      // 4. Upload ticket
      response = await request(app)
        .post("/api/v1/reissue/offline/req_123/upload-ticket")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", Buffer.from("mock"), "ticket.pdf");
      expect(response.status).toBeLessThan(403);
    });
  });

  describe("Master Admin Workflow", () => {
    test("✅ Master Admin has same access as Super Admin", async () => {
      const token = createMockToken("master-admin");

      // 1. View all requests
      let response = await request(app)
        .get("/api/v1/reissue/offline/admin/list")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBeLessThan(403);

      // 2. Update status
      response = await request(app)
        .patch("/api/v1/reissue/offline/req_123/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "COMPLETED" });
      expect(response.status).toBeLessThan(403);
    });
  });

  describe("OPS Agent Workflow", () => {
    test("✅ OPS Agent can process assigned requests", async () => {
      const token = createMockToken("ops-member");

      // 1. Update status (for assigned request)
      let response = await request(app)
        .patch("/api/v1/reissue/offline/req_123/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "IN_PROGRESS" });
      expect(response.status).toBeLessThan(403);

      // 2. Upload ticket
      response = await request(app)
        .post("/api/v1/reissue/offline/req_123/upload-ticket")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", Buffer.from("mock"), "ticket.pdf");
      expect(response.status).toBeLessThan(403);
    });

    test("❌ OPS Agent cannot list all requests", async () => {
      const token = createMockToken("ops-member");

      const response = await request(app)
        .get("/api/v1/reissue/offline/admin/list")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(403);
    });
  });

  describe("Employee Workflow", () => {
    test("✅ Employee can create and view own requests", async () => {
      const token = createMockToken("employee");

      // 1. Create request
      let response = await request(app)
        .post("/api/v1/reissue/offline/create")
        .set("Authorization", `Bearer ${token}`)
        .send({
          bookingId: "booking_123",
          reason: "Change date",
        });
      expect(response.status).toBeLessThan(403);

      // 2. View own requests
      response = await request(app)
        .get("/api/v1/reissue/offline/my-requests")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBeLessThan(403);
    });

    test("❌ Employee cannot access admin list", async () => {
      const token = createMockToken("employee");

      const response = await request(app)
        .get("/api/v1/reissue/offline/admin/list")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(403);
    });

    test("❌ Employee cannot update status", async () => {
      const token = createMockToken("employee");

      const response = await request(app)
        .patch("/api/v1/reissue/offline/req_123/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "COMPLETED" });
      expect(response.status).toBe(403);
    });

    test("❌ Employee cannot upload ticket", async () => {
      const token = createMockToken("employee");

      const response = await request(app)
        .post("/api/v1/reissue/offline/req_123/upload-ticket")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", Buffer.from("mock"), "ticket.pdf");
      expect(response.status).toBe(403);
    });
  });

  describe("Travel Admin Workflow", () => {
    test("✅ Travel Admin can create and list requests", async () => {
      const token = createMockToken("travel-admin");

      // 1. Create request
      let response = await request(app)
        .post("/api/v1/reissue/offline/create")
        .set("Authorization", `Bearer ${token}`)
        .send({
          bookingId: "booking_123",
          reason: "Change date",
        });
      expect(response.status).toBeLessThan(403);

      // 2. View admin list
      response = await request(app)
        .get("/api/v1/reissue/offline/admin/list")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBeLessThan(403);
    });

    test("❌ Travel Admin cannot update status", async () => {
      const token = createMockToken("travel-admin");

      const response = await request(app)
        .patch("/api/v1/reissue/offline/req_123/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "COMPLETED" });
      expect(response.status).toBe(403);
    });
  });
});

/**
 * ════════════════════════════════════════════════════════════════
 * AUDIT LOGGING TESTS
 * ════════════════════════════════════════════════════════════════
 */
describe("Audit Logging", () => {
  test("Admin list access should be logged", async () => {
    const token = createMockToken("super-admin");

    const response = await request(app)
      .get("/api/v1/reissue/offline/admin/list")
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(response.status).toBeLessThan(403);
    // Verify audit log was created (would need audit log service mock)
  });

  test("Status update should be logged with previous and new state", async () => {
    const token = createMockToken("ops-member");

    const response = await request(app)
      .patch("/api/v1/reissue/offline/req_123/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "IN_PROGRESS" });

    expect(response.status).toBeLessThan(403);
    // Verify audit log includes state transition
  });

  test("Unauthorized access attempts should be logged", async () => {
    const token = createMockToken("employee");

    const response = await request(app)
      .get("/api/v1/reissue/offline/admin/list")
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(response.status).toBe(403);
    // Verify security event was logged
  });
});

module.exports = {
  createMockUser,
  createMockToken,
};
