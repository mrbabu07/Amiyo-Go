import { Link } from "react-router-dom";

const lastUpdated = "June 7, 2026";

const sections = [
  {
    title: "1. Account Rules",
    body: [
      "You must provide accurate account, delivery, and contact information.",
      "You are responsible for activity under your account and for keeping login details secure.",
      "Amiyo-Go may restrict accounts involved in fraud, abusive behavior, repeated failed COD orders, false claims, or policy violations.",
    ],
  },
  {
    title: "2. Orders, Pricing, and Availability",
    body: [
      "Product price, stock, delivery fee, campaign offer, and estimated delivery time may change before checkout is completed.",
      "An order is confirmed only after Amiyo-Go or the seller accepts it and the selected payment method is validated where required.",
      "We may cancel or adjust orders affected by wrong pricing, unavailable stock, payment failure, duplicate orders, suspicious activity, or delivery limitations.",
    ],
  },
  {
    title: "3. Payments and COD",
    body: [
      "Supported payment methods may include Cash on Delivery, bKash, Nagad, Rocket, cards, or other methods enabled in checkout.",
      "For manual or mobile payments, customers may need to submit valid payment proof before processing.",
      "Customers should keep payment receipts until the order is delivered and any return or refund window is closed.",
    ],
  },
  {
    title: "4. Delivery, Returns, and Refunds",
    body: [
      "Delivery timelines are estimates and may change due to location, seller readiness, courier capacity, weather, holidays, or incomplete address data.",
      "Return requests must follow the product return window, product condition requirements, and evidence rules shown in the return flow.",
      "Refund approval depends on payment confirmation, return inspection, vendor response, and platform dispute review when needed.",
    ],
  },
  {
    title: "5. Vendor Rules",
    body: [
      "Vendors must list only products they are authorized to sell and must keep product details, stock, pricing, warranties, delivery notes, and shop policies accurate.",
      "Vendors must not upload fake, counterfeit, unsafe, illegal, adult, weapon, drug, misleading, copied-brand, or prohibited content.",
      "Vendor payouts, commissions, disputes, penalties, suspensions, and KYC checks follow the rules configured by Amiyo-Go administrators.",
    ],
  },
  {
    title: "6. Reviews, Messages, and Content",
    body: [
      "Users must not post spam, hate speech, threats, personal data, fake reviews, abusive language, or misleading product claims.",
      "Amiyo-Go may hide, remove, flag, or review content that violates platform policy or harms customers, sellers, staff, or marketplace integrity.",
      "Messages and support requests may be reviewed for safety, fraud prevention, dispute handling, and service quality.",
    ],
  },
  {
    title: "7. Platform Enforcement",
    body: [
      "We may request additional verification, proof, documents, or explanation before processing orders, returns, payouts, or vendor approvals.",
      "We may warn, restrict, suspend, delist, cancel, refund, or ban accounts, shops, products, orders, or payments when needed to protect the marketplace.",
      "Users and vendors may contact support if they believe an enforcement action was incorrect.",
    ],
  },
  {
    title: "8. Changes to These Terms",
    body: [
      "Amiyo-Go may update these terms when laws, platform features, payment rules, delivery processes, or marketplace policies change.",
      "If a major update requires acceptance, users may need to accept the latest version before continuing to use selected services.",
    ],
  },
];

const sectionId = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link to="/" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
            Back to Amiyo-Go
          </Link>
          <div className="mt-5 max-w-3xl">
            <p className="text-sm font-semibold uppercase text-slate-500">
              Legal rules
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
              Terms and Conditions
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              These terms explain the core rules for using Amiyo-Go as a customer,
              vendor, or platform user. By creating an account, placing an order,
              or registering as a vendor, you agree to follow these conditions.
            </p>
            <p className="mt-3 text-sm text-slate-500">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-950">Quick Links</p>
              <nav className="mt-3 space-y-2 text-sm">
                {sections.map((section) => (
                  <a
                    key={section.title}
                    href={`#${sectionId(section.title)}`}
                    className="block text-slate-600 hover:text-primary-600"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              <p className="font-semibold">Important</p>
              <p className="mt-1">
                This page is a platform policy summary for Amiyo-Go operations. For
                formal legal questions, contact support or a qualified legal adviser.
              </p>
            </section>

            {sections.map((section) => (
              <section
                key={section.title}
                id={sectionId(section.title)}
                className="rounded-lg border border-slate-200 bg-white p-6"
              >
                <h2 className="text-xl font-bold text-slate-950">{section.title}</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  {section.body.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-950">Contact</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                For questions about these terms, contact Amiyo-Go support through the
                <Link to="/contact" className="font-semibold text-primary-600 hover:text-primary-700">
                  {" "}Contact page
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
