// ── STEP CONTENTS ─────────────────────────────────────────────────────────────
import {
  MdFlightTakeoff,
  MdClose,
  MdArrowForward,
  MdArrowBack,
  MdCheckCircle,
  MdBusiness,
  MdPerson,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdCreditCard,
  MdPolicy,
  MdAccountBalance,
  MdUploadFile,
  MdLink,
  MdDone,
  MdSecurity,
  MdVerified,
  MdCorporateFare,
  MdAttachMoney,
  MdKeyboardArrowDown,
  MdAutoGraph,
  MdGroups,
  MdShield,
  MdStar,
} from "react-icons/md";
import { BsCheckLg } from "react-icons/bs";
import { HiSparkles } from "react-icons/hi";

import { ToastWithTimer } from "../../../utils/ToastConfirm";
import {
  ContactGroup,
  F,
  GoogleIcon,
  Grid,
  Inp,
  MicrosoftIcon,
  RichSelect,
  Toggle,
  ZohoIcon,
} from "./components";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Country, State, City } from 'country-state-city';


// Step 0 — Access (Email + SSO Icons)
export const Step0 = ({ onNext, onRegister, form, setForm }) => {
  const sso = [
    { key: "google", label: "Google Workspace", icon: <GoogleIcon size={22} /> },
    { key: "microsoft", label: "Microsoft 365 / Azure AD", icon: <MicrosoftIcon size={22} /> },
    { key: "zoho", label: "Zoho One / Directory", icon: <ZohoIcon size={22} /> },
  ];

  const handleEmailContinue = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email)) {
      ToastWithTimer({
        message: "Please enter a valid work email",
        type: "error",
      });
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-7">
      {/* Heading */}
      <div>
        <h3
          className="font-black text-slate-800 text-xl mb-1"
          style={{ fontFamily: "'Outfit',sans-serif" }}
        >
          Access your corporate travel desk
        </h3>
        <p className="text-slate-400 text-sm">
          Enter your work email to continue. We'll detect your company
          automatically.
        </p>
      </div>

      {/* Email Input */}
      {/* <div className="space-y-3">
        <div className="relative">
          <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.com"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <button
          onClick={handleEmailContinue}
          className="w-full py-3 rounded-2xl bg-linear-to-r from-blue-600 to-cyan-500 text-white font-black text-sm shadow-lg shadow-blue-300/40 hover:-translate-y-0.5 transition-all"
        >
          Continue
        </button>
      </div> */}

      {/* Divider */}
      {/* <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Or sign in with
        </span>
        <div className="flex-1 h-px bg-slate-100" />
      </div> */}

      {/* SSO Icon Row */}
      <div className="flex items-center justify-center gap-5">
        {sso.map((s) => (
          <div key={s.key} className="relative group">
            <button
              onClick={() => onNext(s.key)}
              className="w-14 h-14 rounded-2xl border-2 border-slate-100 bg-white flex items-center justify-center hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md"
            >
              {s.icon}
            </button>
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20">
              <div className="bg-slate-900 text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg border border-slate-800/60 whitespace-nowrap">
                {s.label}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-slate-800/60" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Register CTA */}
      <div className="text-center pt-2">
        <p className="text-sm text-slate-500">
          New company?
          <button
            onClick={onRegister}
            className="ml-2 font-bold text-[#C9A240] hover:text-[#C9A240] transition-colors"
          >
            Register your company
          </button>
        </p>
      </div>

      {/* Footer Note */}
      <p className="text-center text-xs text-slate-400 pt-3">
        Secure SSO access powered by your organization’s identity provider.
      </p>
    </div>
  );
};

// Step 1 — Company
export const Step1 = ({ form, setForm, errors }) => (
  <div className="space-y-4">
    <F label="Legal Company Name" required>
      <Inp
        icon={<MdBusiness />}
        value={form.corporateName}
        onChange={(v) => setForm({ ...form, corporateName: v })}
        placeholder="Acme Enterprises Pvt. Ltd."
        error={errors.corporateName}
      />
    </F>

    <F label="Company Type" required>
      <RichSelect
        icon={<MdCorporateFare />}
        value={form.corporateType}
        onChange={(v) => setForm({ ...form, corporateType: v })}
        options={[
          { value: "pvt-ltd", label: "Private Limited", icon: <MdCorporateFare className="text-[#C9A240]" /> },
          { value: "public-ltd", label: "Public Limited / Corp", icon: <MdCorporateFare className="text-orange-500" /> },
          { value: "government", label: "Government Entity", icon: <MdAccountBalance className="text-emerald-500" /> },
          { value: "proprietorship", label: "Sole Proprietorship", icon: <MdPerson className="text-slate-500" /> },
          { value: "partnership", label: "Partnership", icon: <MdGroups className="text-purple-500" /> },
          { value: "independent", label: "Independent Professional", icon: <MdAutoGraph className="text-cyan-500" /> },
        ]}
      />
    </F>

    <Grid>
      {/* <F
        label="Account Type"
        required
        hint="Prepaid = top-up wallet. Postpaid = invoice billing."
      >
        <RichSelect
          icon={<MdCorporateFare />}
          value={form.classification}
          onChange={(v) =>
            setForm({
              ...form,
              classification: v,
              ...(v === "prepaid"
                ? {
                    creditLimit: 0,
                    billingCycle: "30days",
                    customBillingDays: "",
                  }
                : {
                    walletBalance: 0,
                  }),
            })
          }
          options={[
            {
              value: "prepaid",
              label: "Prepaid",
              icon: <MdAccountBalance className="text-blue-500" />,
            },
            {
              value: "postpaid",
              label: "Postpaid",
              icon: <MdCreditCard className="text-orange-500" />,
            },
          ]}
        />
      </F> */}
      {/* <F label="Default Approver" required>
        <RichSelect
          value={form.defaultApprover}
          onChange={(v) => setForm({ ...form, defaultApprover: v })}
          options={[
            { value: "travel-admin", label: "Travel Admin" },
            { value: "manager", label: "Line Manager" },
          ]}
        />
      </F> */}
    </Grid>

    {/* {form.classification === "prepaid" && (
      <F
        label="Starting Wallet Balance (₹)"
        hint="Initial credit loaded into the corporate wallet"
      >
        <Inp
          icon={<MdAccountBalance />}
          value={form.walletBalance}
          onChange={(v) => setForm({ ...form, walletBalance: v })}
          placeholder="0"
          type="number"
        />
      </F>
    )} */}

    {/* Classification info card */}
    {/* <div
      className={`rounded-xl p-4 border text-xs leading-relaxed ${form.classification === "postpaid" ? "bg-orange-50 border-orange-100 text-orange-700" : "bg-blue-50 border-blue-100 text-blue-700"}`}
    >
      {form.classification === "postpaid"
        ? "📋 Postpaid: Book now, pay later. Receive a consolidated GST invoice at the end of each billing cycle. Credit limit required."
        : "💳 Prepaid: Add funds to your wallet. All bookings are deducted in real-time. Great for budget control."}
    </div> */}
  </div>
);

// Step 2 — Contacts
export const Step2 = ({ form, setForm, errors }) => (
  <div className="space-y-4">
    <ContactGroup
      color="bg-gradient-to-r from-[#000D26] to-[#04112F]"
      title="Primary Contact"
      fields={
        <div className="space-y-3">
          <F label="Full Name" required>
            <Inp
              icon={<MdPerson />}
              value={form.primaryName}
              onChange={(v) => setForm({ ...form, primaryName: v })}
              placeholder="Rajesh Kumar"
              error={errors.primaryName}
            />
          </F>
          <Grid>
            <F label="Email" required>
              <Inp
                icon={<MdEmail />}
                value={form.primaryEmail}
                onChange={(v) => {
                  const domain = v.includes("@") ? v.split("@")[1] : "";
                  setForm({ ...form, primaryEmail: v, ssoDomain: domain });
                }}
                placeholder="rajesh@company.com"
                type="email"
                error={errors.primaryEmail}
              />
              <label className="flex items-center gap-1.5 mt-1.5 ml-1 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#C9A240] focus:ring-[#C9A240] cursor-pointer"
                  checked={form.gstEmail === form.primaryEmail && !!form.primaryEmail}
                  onChange={(e) => setForm({ ...form, gstEmail: e.target.checked ? form.primaryEmail : "" })}
                />
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#C9A240] transition-colors uppercase tracking-tight">Set as GST Email</span>
              </label>
            </F>
            <F label="Mobile" required>
              <PhoneInput
                country={'in'}
                value={form.primaryMobile}
                onChange={(phone) => setForm({ ...form, primaryMobile: phone })}
                inputStyle={{width: '100%', border: errors.primaryMobile ? '1px solid #f87171' : '1px solid #e2e8f0', borderRadius: '0.75rem', paddingLeft: '3rem', height: '46px', fontSize: '0.875rem'}}
                buttonStyle={{border: errors.primaryMobile ? '1px solid #f87171' : '1px solid #e2e8f0', borderRadius: '0.75rem 0 0 0.75rem', backgroundColor: errors.primaryMobile ? '#fef2f2' : '#ffffff'}}
                containerStyle={{marginTop: '0.25rem'}}
              />
              {errors.primaryMobile && <p className="text-xs text-red-500 mt-1 font-medium">{errors.primaryMobile}</p>}
            </F>
          </Grid>
        </div>
      }
    />

    {/* <ContactGroup
      color="bg-gradient-to-r from-slate-500 to-slate-600"
      title="Secondary Contact"
      optional
      fields={
        <div className="space-y-3">
          <F label="Full Name">
            <Inp
              icon={<MdPerson />}
              value={form.secondaryName}
              onChange={(v) => setForm({ ...form, secondaryName: v })}
              placeholder="Priya Sharma"
              error={errors.secondaryName}
            />
          </F>
          <Grid>
            <F label="Email">
              <Inp
                icon={<MdEmail />}
                value={form.secondaryEmail}
                onChange={(v) => setForm({ ...form, secondaryEmail: v })}
                placeholder="priya@company.com"
                type="email"
                error={errors.secondaryEmail}
              />
            </F>
            <F label="Mobile">
              <Inp
                icon={<MdPhone />}
                value={form.secondaryMobile}
                onChange={(v) => setForm({ ...form, secondaryMobile: v })}
                placeholder="+91 98765 43211"
                type="tel"
                error={errors.secondaryMobile}
              />
            </F>
          </Grid>
        </div>
      }
    /> */}

    <ContactGroup
      color="bg-gradient-to-r from-orange-500 to-orange-600"
      title="Billing Department (Optional)"
      fields={
        <div className="space-y-3">
          <F label="Contact Name">
            <Inp
              icon={<MdPerson />}
              value={form.billingName}
              onChange={(v) => setForm({ ...form, billingName: v })}
              placeholder="Finance Team / Accounts"
              error={errors.billingName}
            />
          </F>
          <Grid>
            <F label="Billing Email">
              <Inp
                icon={<MdEmail />}
                value={form.billingEmail}
                onChange={(v) => setForm({ ...form, billingEmail: v })}
                placeholder="billing@company.com"
                type="email"
                error={errors.billingEmail}
              />
              <label className="flex items-center gap-1.5 mt-1.5 ml-1 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#C9A240] focus:ring-[#C9A240] cursor-pointer"
                  checked={form.gstEmail === form.billingEmail && !!form.billingEmail}
                  onChange={(e) => setForm({ ...form, gstEmail: e.target.checked ? form.billingEmail : "" })}
                />
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#C9A240] transition-colors uppercase tracking-tight">Set as GST Email</span>
              </label>
            </F>
            <F label="Mobile">
              <PhoneInput
                country={'in'}
                value={form.billingMobile}
                onChange={(phone) => setForm({ ...form, billingMobile: phone })}
                inputStyle={{width: '100%', border: errors.billingMobile ? '1px solid #f87171' : '1px solid #e2e8f0', borderRadius: '0.75rem', paddingLeft: '3rem', height: '46px', fontSize: '0.875rem'}}
                buttonStyle={{border: errors.billingMobile ? '1px solid #f87171' : '1px solid #e2e8f0', borderRadius: '0.75rem 0 0 0.75rem', backgroundColor: errors.billingMobile ? '#fef2f2' : '#ffffff'}}
                containerStyle={{marginTop: '0.25rem'}}
              />
              {errors.billingMobile && <p className="text-xs text-red-500 mt-1 font-medium">{errors.billingMobile}</p>}
            </F>
          </Grid>
        </div>
      }
    />
  </div>
);

export const Step3 = ({ form, setForm, errors }) => {
  const countries = Country.getAllCountries();
  
  // Find selected country details and state details
  const selectedCountry = countries.find(c => c.name === form.country) || countries.find(c => c.isoCode === 'IN');
  const states = selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [];
  const selectedState = states.find(s => s.name === form.state);
  const cities = selectedState ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode) : [];

  return (
  <div className="space-y-4">
    <F label="Street Address / Building">
      <Inp
        icon={<MdLocationOn />}
        value={form.street}
        onChange={(v) => setForm({ ...form, street: v })}
        placeholder="Plot 12, Cyber City, DLF Phase 3"
        error={errors.street}
      />
    </F>
    <Grid>
      <F label="Country">
        <RichSelect
          value={form.country || "India"}
          onChange={(v) => setForm({ ...form, country: v, state: "", city: "" })}
          options={countries.map(c => ({ value: c.name, label: c.name }))}
        />
        {errors.country && <p className="text-xs text-red-500 mt-1 font-medium">{errors.country}</p>}
      </F>
      <F label="State">
        <RichSelect
          value={form.state}
          onChange={(v) => setForm({ ...form, state: v, city: "" })}
          options={states.map(s => ({ value: s.name, label: s.name }))}
        />
        {errors.state && <p className="text-xs text-red-500 mt-1 font-medium">{errors.state}</p>}
      </F>
    </Grid>
    <Grid>
      <F label="City">
        {cities.length > 0 ? (
          <RichSelect
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
            options={cities.map(c => ({ value: c.name, label: c.name }))}
          />
        ) : (
          <Inp
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
            placeholder="Gurugram"
            error={errors.city}
          />
        )}
        {errors.city && <p className="text-xs text-red-500 mt-1 font-medium">{errors.city}</p>}
      </F>
      <F label="Pincode">
        <Inp
          value={form.pincode}
          onChange={(v) => setForm({ ...form, pincode: v })}
          placeholder="122001"
          error={errors.pincode}
        />
      </F>
    </Grid>

    {/* Address preview card */}
    <div className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
      <div
        className="h-28 relative flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#e0f2fe,#bfdbfe)" }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#94a3b8 1px,transparent 1px),linear-gradient(90deg,#94a3b8 1px,transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-[#C9A240] flex items-center justify-center shadow-lg shadow-[#C9A240]/30 mb-1">
            <MdLocationOn className="text-white text-lg" />
          </div>
          <div className="bg-white rounded-xl px-3 py-1.5 shadow-md text-xs font-bold text-slate-700 text-center max-w-[200px]">
            {form.city && form.state
              ? `${form.city}, ${form.state}`
              : "Address preview"}
          </div>
        </div>
      </div>
      {form.street && (
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            {[form.street, form.city, form.state, form.pincode, form.country]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  </div>
);
};

// Step 4 — SSO Config
export const Step4 = ({ form, setForm, errors }) => {
  const providers = [
    {
      value: "google",
      label: "Google Workspace",
      icon: <GoogleIcon size={20} />,
      desc: "G Suite / Google Workspace",
    },
    {
      value: "microsoft",
      label: "Microsoft Azure AD",
      icon: <MicrosoftIcon size={20} />,
      desc: "Microsoft 365 / Azure",
    },
    {
      value: "zoho",
      label: "Zoho Directory",
      icon: <ZohoIcon size={20} />,
      desc: "Zoho One / Zoho People",
    },
    {
      value: "saml",
      label: "Custom SAML 2.0",
      icon: <MdSecurity className="text-lg text-slate-500" />,
      desc: "Enterprise IdP / Okta / PingID",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 leading-relaxed">
        Select the identity provider your company uses. Employees will log in
        automatically without extra passwords.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {providers.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setForm({ ...form, ssoType: p.value })}
            className={`flex flex-col items-start gap-2.5 p-4 rounded-2xl border-2 text-left transition-all ${form.ssoType === p.value ? "border-[#C9A240] bg-amber-50 shadow-lg shadow-amber-100" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                {p.icon}
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.ssoType === p.value ? "border-[#C9A240] bg-[#C9A240]" : "border-slate-200"}`}
              >
                {form.ssoType === p.value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>
            <div>
              <p
                className={`font-black text-xs ${form.ssoType === p.value ? "text-amber-700" : "text-slate-700"}`}
              >
                {p.label}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <F
        label="Corporate Email Domain"
        required
        hint="e.g. yourcompany.com — all employees with this domain can log in automatically"
      >
        <Inp
          icon={<MdBusiness />}
          value={form.ssoDomain}
          onChange={(v) => setForm({ ...form, ssoDomain: v })}
          placeholder="yourcompany.com"
          error={errors.ssoDomain}
        />
      </F>

      {form.ssoType === "saml" && (
        <F
          label="SAML Metadata URL"
          hint="Your IdP metadata XML URL for SAML 2.0 configuration"
        >
          <Inp
            icon={<MdLink />}
            value={form.samlMetadata || ""}
            onChange={(v) => setForm({ ...form, samlMetadata: v })}
            placeholder="https://idp.yourcompany.com/metadata.xml"
          />
        </F>
      )}

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
        <p className="text-xs font-black text-emerald-700 mb-2">
          🔒 SSO Benefits
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {[
            "No extra passwords",
            "Auto employee sync",
            "IT-controlled access",
            "Zero login friction",
          ].map((t) => (
            <div
              key={t}
              className="flex items-center gap-1.5 text-xs text-emerald-700"
            >
              <BsCheckLg className="text-emerald-500 shrink-0" />
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Step 5 — Billing

// const Step5 = ({ form, setForm, errors }) => {
//   // 🟢 PREPAID FLOW
//   if (form.classification === "prepaid") {
//     return (
//       <div className="space-y-4">
//         <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
//           💳 Prepaid Account
//           <br />
//           • Bookings deduct instantly from wallet
//           <br />
//           • No credit limit
//           <br />• No billing cycle
//         </div>

//         <F label="Wallet Balance (₹)">
//           <Inp
//             icon={<MdAccountBalance />}
//             value={form.walletBalance}
//             onChange={(v) => setForm({ ...form, walletBalance: v })}
//             type="number"
//           />
//         </F>
//       </div>
//     );
//   }

//   // 🔵 POSTPAID FLOW
//   return (
//     <div className="space-y-4">
//       <Grid cols={2}>
//         <F label="Billing Cycle" required>
//           <RichSelect
//             icon={<MdCreditCard />}
//             value={form.billingCycle}
//             onChange={(v) => setForm({ ...form, billingCycle: v })}
//             options={[
//               { value: "15days", label: "Every 15 Days" },
//               { value: "30days", label: "Monthly (30d)" },
//               { value: "custom", label: "Custom" },
//             ]}
//           />
//         </F>

//         {form.billingCycle === "custom" && (
//           <F label="Custom Days" required>
//             <Inp
//               value={form.customBillingDays}
//               onChange={(v) => setForm({ ...form, customBillingDays: v })}
//               type="number"
//             />
//           </F>
//         )}
//       </Grid>

//       <F
//         label="Credit Limit (₹)"
//         required
//         hint="Max outstanding before payment is required"
//       >
//         <Inp
//           icon={<MdAttachMoney />}
//           value={form.creditLimit}
//           onChange={(v) => setForm({ ...form, creditLimit: v })}
//           type="number"
//           error={errors.creditLimit}
//         />
//       </F>
//     </div>
//   );
// };

// Step 6 — Travel Policy
// export const Step5 = ({ form, setForm, errors }) => (
//   <div className="space-y-4">
//     <F
//       label="Allowed Cabin Classes"
//       required
//       hint="Employees can only book selected classes"
//     >
//       <div className="grid grid-cols-2 gap-2 mt-0.5">
//         {["Economy", "Premium Economy", "Business", "First"].map((opt) => {
//           const on = form.allowedCabinClass.includes(opt);
//           return (
//             <button
//               key={opt}
//               type="button"
//               onClick={() =>
//                 setForm({
//                   ...form,
//                   allowedCabinClass: on
//                     ? form.allowedCabinClass.filter((v) => v !== opt)
//                     : [...form.allowedCabinClass, opt],
//                 })
//               }
//               className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${on ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"}`}
//             >
//               <div
//                 className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${on ? "border-blue-500 bg-blue-500" : "border-slate-200"}`}
//               >
//                 {on && <BsCheckLg className="text-white text-xs" />}
//               </div>
//               {opt}
//             </button>
//           );
//         })}
//       </div>
//     </F>

//     <Grid>
//       <F label="Max Booking Amount (₹)" hint="0 = unlimited">
//         <Inp
//           icon={<MdAttachMoney />}
//           value={form.maxBookingAmount}
//           onChange={(v) => setForm({ ...form, maxBookingAmount: v })}
//           placeholder="0"
//           type="number"
//         />
//       </F>
//       <F label="Advance Booking (Days)" hint="Min. days before travel">
//         <Inp
//           icon={<MdPolicy />}
//           value={form.advanceBookingDays}
//           onChange={(v) => setForm({ ...form, advanceBookingDays: v })}
//           placeholder="0"
//           type="number"
//         />
//       </F>
//     </Grid>

//     <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
//       <Toggle
//         checked={form.allowAncillaryServices}
//         onChange={(v) => setForm({ ...form, allowAncillaryServices: v })}
//         label="Allow seat selection, extra baggage & in-flight meals"
//       />
//     </div>

//     {/* Live preview */}
//     <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
//       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2.5">
//         📋 Policy Preview
//       </p>
//       <div className="space-y-1.5">
//         {[
//           {
//             l: "Cabins",
//             v: form.allowedCabinClass.join(", ") || "None selected",
//           },
//           {
//             l: "Max amount",
//             v:
//               +form.maxBookingAmount > 0
//                 ? `₹${(+form.maxBookingAmount).toLocaleString()}`
//                 : "Unlimited",
//           },
//           {
//             l: "Advance booking",
//             v:
//               +form.advanceBookingDays > 0
//                 ? `${form.advanceBookingDays} days minimum`
//                 : "No restriction",
//           },
//           {
//             l: "Ancillaries",
//             v: form.allowAncillaryServices ? "Allowed" : "Not allowed",
//           },
//         ].map((row) => (
//           <div
//             key={row.l}
//             className="flex items-center justify-between text-xs"
//           >
//             <span className="text-emerald-600/70">{row.l}</span>
//             <span className="font-bold text-emerald-800">{row.v}</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   </div>
// );



// Step 5 — Documents
export const DocUpload = ({
  title,
  icon,
  mode,
  setMode,
  file,
  setFile,
  url,
  setUrl,
  errors = {},
}) => (
  <div className="rounded-2xl border border-slate-100 overflow-hidden">
    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
        {icon}
      </div>
      <span className="font-black text-slate-700 text-sm">{title}</span>
      <span className="ml-auto text-slate-400 text-xs">PDF or Image</span>
    </div>
    <div className="p-4 bg-white">
      <div className="flex gap-2 mb-3">
        {["file", "url"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition-all border ${mode === m ? "border-blue-500 bg-blue-600 text-white" : "border-slate-100 text-slate-400 hover:border-slate-200"}`}
          >
            {m === "file" ? (
              <MdUploadFile className="text-sm" />
            ) : (
              <MdLink className="text-sm" />
            )}
            {m === "file" ? "Upload" : "URL"}
          </button>
        ))}

        {errors.gstCertificate && (
          <p className="text-xs text-red-500 mt-2 font-medium">
            {errors.gstCertificate}
          </p>
        )}
      </div>
      {mode === "file" ? (
        <label
          className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${file ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200"}`}
        >
          {file ? (
            <>
              <MdCheckCircle className="text-3xl text-emerald-500 mb-1" />
              <span className="text-xs font-bold text-emerald-700">
                {file.name}
              </span>
              <span className="text-[10px] text-emerald-500 mt-0.5">
                Click to replace
              </span>
            </>
          ) : (
            <>
              <MdUploadFile className="text-3xl text-slate-500 mb-1.5" />
              <span className="text-xs font-semibold text-slate-400">
                Click to browse
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                or drag & drop
              </span>
            </>
          )}
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const selectedFile = e.target.files[0];
              setFile(selectedFile);
            }}
          />
        </label>
      ) : (
        <Inp
          icon={<MdLink />}
          value={url}
          onChange={setUrl}
          placeholder="https://drive.google.com/... or direct PDF link"
        />
      )}

      {errors.panCard && (
        <p className="text-xs text-red-500 mt-2 font-medium">
          {errors.panCard}
        </p>
      )}
    </div>
  </div>
);

export const Step5 = ({ form, setForm, errors, gstAutoFilled, ...props }) => (
  <div className="space-y-4">
    <p className="text-sm text-slate-500 leading-relaxed">
      Upload your company documents or share secure links. Our compliance team
      verifies within 2 hours.
    </p>
    <DocUpload
      title="GST Certificate"
      icon={<MdVerified className="text-sm" />}
      mode={props.gstMode}
      setMode={props.setGstMode}
      file={props.gstFile}
      setFile={props.setGstFile}
      url={props.gstUrl}
      setUrl={props.setGstUrl}
      errors={errors}
    />
    {/* <DocUpload
      title="PAN Card"
      icon={<MdCreditCard className="text-sm" />}
      mode={props.panMode}
      setMode={props.setPanMode}
      file={props.panFile}
      setFile={props.setPanFile}
      url={props.panUrl}
      setUrl={props.setPanUrl}
      errors={errors}
    /> */}

    {gstAutoFilled && (
      <p className="text-xs text-emerald-600 font-semibold mb-2">
        ✓ GST details auto-filled from document
      </p>
    )}

    <F label="GSTIN" required>
      <Inp
        value={form.gstin}
        onChange={(v) => setForm({ ...form, gstin: v.toUpperCase() })}
        placeholder="27ABCDE1234F1Z5"
        error={errors.gstin}
      />
    </F>

    <F label="Legal Name (as per GST)" required>
      <Inp
        value={form.gstLegalName}
        onChange={(v) => setForm({ ...form, gstLegalName: v })}
        placeholder="ABC Travels Private Limited"
        error={errors.gstLegalName}
      />
    </F>
    <F label="GST Email" required>
      <Inp
        icon={<MdEmail />}
        value={form.gstEmail}
        onChange={(v) => setForm({ ...form, gstEmail: v })}
        placeholder="finance@company.com"
        error={errors.gstEmail}
      />
    </F>

    <F label="GST Registered Address">
      <Inp
        value={form.gstAddress}
        onChange={(v) => setForm({ ...form, gstAddress: v })}
        placeholder="Full address as per GST certificate"
      />
    </F>
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-xs text-amber-700">
      <span className="text-lg">⏱</span>
      <span>
        <strong>Verification time:</strong> 2–4 business hours. You'll receive
        an email confirmation once your account is activated.
      </span>
    </div>
  </div>
);

// Step 6 — Done
export const Step6 = ({ form }) => (
  <div className="text-center py-2">
    <div className="relative inline-flex mb-6">
      <div className="w-24 h-24 rounded-full bg-linear-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-2xl shadow-emerald-300/40">
        <MdDone className="text-white text-5xl" />
      </div>
      <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
        <HiSparkles className="text-white text-sm" />
      </div>
    </div>

    <h3
      className="font-black text-2xl text-slate-800 mb-2"
      style={{ fontFamily: "'Outfit',sans-serif" }}
    >
      Application Submitted!
    </h3>
    <p className="text-slate-400 text-sm mb-7 max-w-xs mx-auto leading-relaxed">
      Welcome aboard,{" "}
      <strong className="text-slate-700">
        {form.corporateName || "your company"}
      </strong>
      ! Confirmation will be sent to{" "}
      <strong className="text-blue-600">
        {form.primaryEmail || "your email"}
      </strong>
      .
    </p>

    <div className="bg-white border border-slate-100 rounded-2xl p-5 text-left shadow-sm mb-6">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
        What happens next
      </p>
      <div className="space-y-4">
        {[
          {
            num: "1",
            label: "Document Verification",
            desc: "GST & PAN checked by compliance",
            time: "~2 hrs",
            color: "bg-blue-600",
          },
          {
            num: "2",
            label: "Account Activation Email",
            desc: "Login credentials & portal access",
            time: "~3 hrs",
            color: "bg-purple-600",
          },
          {
            num: "3",
            label: "Welcome Aboard",
            desc: "Your account is now active",
            time: "~4 hrs",
            color: "bg-green-600",
          },
          // {
          //   num: "3",
          //   label: "Dedicated Manager Assigned",
          //   desc: "Your travel desk point of contact",
          //   time: "~24 hrs",
          //   color: "bg-emerald-600",
          // },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-4">
            <div
              className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md`}
            >
              {s.num}
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-700 text-sm">{s.label}</p>
              <p className="text-slate-400 text-xs">{s.desc}</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 shrink-0">
              {s.time}
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* <div className="flex gap-3">
      <button className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-600 font-black text-sm hover:bg-slate-50 transition-colors">
        View Dashboard
      </button>
      <button className="flex-1 py-3.5 rounded-2xl bg-linear-to-r from-blue-600 to-cyan-500 text-white font-black text-sm shadow-lg shadow-blue-300/30 hover:-translate-y-0.5 hover:shadow-blue-400/40 transition-all">
        Book First Trip →
      </button>
    </div> */}
  </div>
);
