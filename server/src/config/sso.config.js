// server/src/config/sso.config.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { OIDCStrategy } = require("passport-azure-ad");
const User = require("../models/User");
const Corporate = require("../models/Corporate");
const Employee = require("../models/Employee");
const logger = require("../utils/logger");
const OAuth2Strategy = require("passport-oauth2");
const axios = require("axios");

console.log("✅ SSO CONFIG loaded");

const ensureEmployeeForUser = async (user, corporateId) => {
  if (!user) return;
  try {
    // Prefer linking by userId (if present) otherwise fallback to email + corporate
    const query = user._id
      ? { userId: user._id }
      : { email: user.email, corporateId };
    const update = {
      $setOnInsert: {
        userId: user._id,
        corporateId: corporateId || user.corporateId || null,
        name:
          `${user.name?.firstName || ""} ${user.name?.lastName || ""}`.trim() ||
          user.email.split("@")[0],
        email: user.email,
        mobile: "",
        department: "",
        designation: "",
        employeeCode: "",
        status: "active",
      },
    };
    await Employee.findOneAndUpdate(query, update, { upsert: true, new: true });
    logger.info(`Employee profile ensured for user ${user.email}`);
  } catch (err) {
    logger.error("Error ensuring Employee profile:", err);
  }
};

/**
 * Helper: upsert or update a user safely
 * - Keys on corporateId + email (to avoid cross-tenant collisions)
 * - Sets ssoProvider/ssoId on insert or if missing
 * - Updates lastLogin, profilePicture and name when changed
 */
const upsertSSOUser = async ({
  email,
  corporateId,
  ssoProvider,
  ssoId,
  nameObj,
  profilePicture,
}) => {
  const filter = { email: (email || "").toLowerCase(), corporateId };
  const setOnInsert = {
    email: (email || "").toLowerCase(),
    corporateId,
    role: "employee", // default; caller may override if this is corporate admin email
    ssoProvider,
    ssoId,
    profilePicture: profilePicture || "",
    isActive: true,
    name: nameObj || {},
  };

  const set = {
    lastLogin: new Date(),
  };

  // Perform upsert: setOnInsert fields when creating; set lastLogin always.
  const options = { new: true, upsert: true, setDefaultsOnInsert: true };

  let user = await User.findOneAndUpdate(
    filter,
    { $setOnInsert: setOnInsert, $set: set },
    options,
  ).lean();

  // If user existed already (not just created), update missing provider/id/picture/name if safe
  // Re-fetch as mongoose doc to allow save, only if we need to mutate more.
  let needSave = false;
  const userDoc = await User.findById(user._id);

  // If existing user has no ssoProvider, set it (safe)
  if (!userDoc.ssoProvider && ssoProvider) {
    userDoc.ssoProvider = ssoProvider;
    needSave = true;
  }
  // If existing user has no ssoId, set it
  if (!userDoc.ssoId && ssoId) {
    userDoc.ssoId = ssoId;
    needSave = true;
  }
  // if profile picture changed or missing, update
  if (profilePicture && userDoc.profilePicture !== profilePicture) {
    userDoc.profilePicture = profilePicture;
    needSave = true;
  }
  // update name if changed and incoming has values
  if (
    nameObj &&
    ((nameObj.firstName && nameObj.firstName !== userDoc.name?.firstName) ||
      (nameObj.lastName && nameObj.lastName !== userDoc.name?.lastName))
  ) {
    userDoc.name = {
      firstName: nameObj.firstName || userDoc.name.firstName || "",
      lastName: nameObj.lastName || userDoc.name.lastName || "",
    };
    needSave = true;
  }

  if (needSave) {
    await userDoc.save();
    logger.info(`User ${userDoc.email} updated (sso/link sync)`);
  }

  return userDoc;
};

/* ------------------------------
   GOOGLE STRATEGY
   ------------------------------ */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  logger.info("Enabling Google SSO strategy");
  /* ------------------------------
   GOOGLE STRATEGY (STRICT STATUS ENFORCED)
-------------------------------- */
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const emailVerified =
            profile.emails?.[0]?.verified || profile._json?.email_verified;

          if (!email || !emailVerified)
            return done(null, false, { message: "Email not verified" });

          const domain = email.split("@")[1];

          const corporate = await Corporate.findOne({
            "ssoConfig.domain": domain,
            "ssoConfig.type": "google",
            "ssoConfig.verified": true,
          });

          // ✅ BLOCK IF CORPORATE INACTIVE/SUSPENDED/DISABLED
          if (
            !corporate ||
            corporate.isActive !== true ||
            corporate.status !== "active"
          ) {
            return done(null, false, {
              message: "Corporate account inactive or suspended",
            });
          }

          // Check if user already exists
          // let existingUser = await User.findOne({
          //   email,
          //   corporateId: corporate._id
          // });

          // Preserve role if exists, otherwise default employee
          // const role = existingUser ? existingUser.role : 'employee';

          // let user = await User.findOneAndUpdate(
          //   { email, corporateId: corporate._id },
          //   {
          //     $setOnInsert: {
          //       email,
          //       corporateId: corporate._id,
          //       role: "employee", // default only on first creation
          //       ssoProvider: "google",
          //       ssoId: profile.id,
          //       profilePicture: profile.photos?.[0]?.value || "",
          //       isActive: true,
          //       name: {
          //         firstName: profile.name?.givenName || "",
          //         lastName: profile.name?.familyName || "",
          //       },
          //     },
          //     $set: { lastLogin: new Date() },
          //   },
          //   { new: true, upsert: true },
          // );

          // 🔥 Determine correct role
          let role = "employee";

          if (corporate.primaryContact?.email?.toLowerCase() === email) {
            role = "corporate-super-admin";
          } else if (
            corporate.secondaryContact?.email?.toLowerCase() === email
          ) {
            role = "travel-admin";
          }

          let user = await User.findOneAndUpdate(
            { email, corporateId: corporate._id },
            {
              $setOnInsert: {
                email,
                corporateId: corporate._id,
                role,
                ssoProvider: "google",
                ssoId: profile.id,
                profilePicture: profile.photos?.[0]?.value || "",
                isActive: true,
                name: {
                  firstName: profile.name?.givenName || "",
                  lastName: profile.name?.familyName || "",
                },
              },
              $set: { lastLogin: new Date() },
            },
            { new: true, upsert: true },
          );

          // 🔥 Ensure role stays correct even if user existed before
          let expectedRole = "employee";
          if (corporate.primaryContact?.email?.toLowerCase() === email) {
            expectedRole = "corporate-super-admin";
          } else if (
            corporate.secondaryContact?.email?.toLowerCase() === email
          ) {
            expectedRole = "travel-admin";
          }

          if (user.role !== expectedRole) {
            user.role = expectedRole;
            await user.save();
          }

          // ✅ BLOCK USER LEVEL
          if (!user.isActive) {
            return done(null, false, { message: "User account disabled" });
          }

          // ✅ BLOCK EMPLOYEE IF EMPLOYEE PROFILE INACTIVE
          if (user.role === "employee") {
            const emp = await Employee.findOneAndUpdate(
              { userId: user._id },
              {
                $setOnInsert: {
                  userId: user._id,
                  corporateId: corporate._id,
                  name: `${user.name.firstName} ${user.name.lastName}`.trim(),
                  email: user.email,
                  status: "active",
                },
              },
              { upsert: true, new: true },
            );

            if (emp.status === "inactive") {
              return done(null, false, {
                message: "Employee account inactive",
              });
            }
          }

          return done(null, user);
        } catch (err) {
          logger.error("Google SSO Error:", err);
          return done(err);
        }
      },
    ),
  );
}

/* ------------------------------
   MICROSOFT (AZURE AD) STRATEGY
-------------------------------- */
if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
  logger.info("Enabling Microsoft (Azure) SSO strategy");

  passport.use(
    new OIDCStrategy(
      {
        identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
        clientID: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        responseType: "code id_token",
        responseMode: "form_post",
        redirectUrl: process.env.AZURE_CALLBACK_URL,
        allowHttpForRedirectUrl: true,
        validateIssuer: true,
        passReqToCallback: true,
        scope: ["profile", "email", "openid"],
      },
      async (req, iss, sub, profile, accessToken, refreshToken, done) => {
        try {
          const email = profile._json?.email?.toLowerCase();
          if (!email) return done(null, false, { message: "Email missing" });

          const domain = email.split("@")[1];

          const corporate = await Corporate.findOne({
            "ssoConfig.domain": domain,
            "ssoConfig.type": "microsoft",
            "ssoConfig.verified": true,
          });

          if (
            !corporate ||
            corporate.isActive !== true ||
            corporate.status !== "active"
          ) {
            return done(null, false, {
              message: "Corporate account inactive or suspended",
            });
          }

          // 🔥 Resolve correct role
          let role = "employee";
          if (corporate.primaryContact?.email?.toLowerCase() === email) {
            role = "corporate-super-admin";
          } else if (
            corporate.secondaryContact?.email?.toLowerCase() === email
          ) {
            role = "travel-admin";
          }

          let user = await User.findOneAndUpdate(
            { email, corporateId: corporate._id },
            {
              $setOnInsert: {
                email,
                corporateId: corporate._id,
                role,
                ssoProvider: "microsoft",
                ssoId: profile._json?.oid || sub,
                isActive: true,
                name: {
                  firstName: profile._json?.given_name || "",
                  lastName: profile._json?.family_name || "",
                },
              },
              $set: { lastLogin: new Date() },
            },
            { new: true, upsert: true },
          );

          // 🔥 Ensure role stays correct
          let expectedRole = "employee";
          if (corporate.primaryContact?.email?.toLowerCase() === email) {
            expectedRole = "corporate-super-admin";
          } else if (
            corporate.secondaryContact?.email?.toLowerCase() === email
          ) {
            expectedRole = "travel-admin";
          }

          if (user.role !== expectedRole) {
            user.role = expectedRole;
            await user.save();
          }

          if (!user.isActive) {
            return done(null, false, { message: "User account disabled" });
          }

          if (user.role === "employee") {
            const emp = await Employee.findOne({ userId: user._id });
            if (emp && emp.status === "inactive") {
              return done(null, false, {
                message: "Employee account inactive",
              });
            }
          }

          return done(null, user);
        } catch (err) {
          logger.error("Microsoft SSO Error:", err);
          return done(err);
        }
      },
    ),
  );
}

/* ------------------------------
   ZOHO STRATEGY
------------------------------ */
if (process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET) {
  logger.info("Enabling Zoho SSO strategy");

  passport.use(
    "zoho",
    new OAuth2Strategy(
      {
        authorizationURL: "https://accounts.zoho.com/oauth/v2/auth",
        tokenURL: "https://accounts.zoho.com/oauth/v2/token",
        clientID: process.env.ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET,
        callbackURL: process.env.ZOHO_CALLBACK_URL,
        scope: ["aaaserver.profile.READ"],
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, params, profile, done) => {
        try {
          const userInfo = await axios.get(
            "https://accounts.zoho.com/oauth/user/info",
            {
              headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            },
          );

          const email = userInfo.data.Email?.toLowerCase();
          const firstName = userInfo.data.First_Name || "";
          const lastName = userInfo.data.Last_Name || "";

          if (!email)
            return done(null, false, { message: "Email missing from Zoho" });

          const domain = email.split("@")[1].toLowerCase();

          const corporate = await Corporate.findOne({
            "ssoConfig.type": "zoho",
            "ssoConfig.verified": true,
            "ssoConfig.domain": domain,
          });

          if (
            !corporate ||
            corporate.isActive !== true ||
            corporate.status !== "active"
          ) {
            return done(null, false, {
              message: "Corporate account inactive or suspended",
            });
          }

          // 🔥 Resolve correct role
          let role = "employee";
          if (corporate.primaryContact?.email?.toLowerCase() === email) {
            role = "corporate-super-admin";
          } else if (
            corporate.secondaryContact?.email?.toLowerCase() === email
          ) {
            role = "travel-admin";
          }

          let user = await User.findOneAndUpdate(
            { email, corporateId: corporate._id },
            {
              $setOnInsert: {
                email,
                corporateId: corporate._id,
                role,
                ssoProvider: "zoho",
                ssoId: userInfo.data.ZUID || "",
                isActive: true,
                name: { firstName, lastName },
              },
              $set: { lastLogin: new Date() },
            },
            { new: true, upsert: true },
          );

          // 🔥 Ensure role stays correct
          let expectedRole = "employee";
          if (corporate.primaryContact?.email?.toLowerCase() === email) {
            expectedRole = "corporate-super-admin";
          } else if (
            corporate.secondaryContact?.email?.toLowerCase() === email
          ) {
            expectedRole = "travel-admin";
          }

          if (user.role !== expectedRole) {
            user.role = expectedRole;
            await user.save();
          }

          if (!user.isActive) {
            return done(null, false, { message: "User account disabled" });
          }

          if (user.role === "employee") {
            const emp = await Employee.findOneAndUpdate(
              { userId: user._id },
              {
                $setOnInsert: {
                  userId: user._id,
                  corporateId: corporate._id,
                  name: `${firstName} ${lastName}`.trim(),
                  email: user.email,
                  status: "active",
                },
              },
              { upsert: true, new: true },
            );

            if (emp.status === "inactive") {
              return done(null, false, {
                message: "Employee account inactive",
              });
            }
          }

          return done(null, user);
        } catch (err) {
          logger.error("Zoho SSO Error:", {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data,
          });
          return done(err);
        }
      },
    ),
  );
}

module.exports = passport;
