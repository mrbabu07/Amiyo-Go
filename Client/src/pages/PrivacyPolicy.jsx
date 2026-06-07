import { Link } from "react-router-dom";

const lastUpdated = "June 7, 2026";

const sections = [
  {
    title: "Information We Collect",
    body: [
      "Account details such as name, email, phone number, profile information, and login activity.",
      "Order, payment, delivery, return, review, wishlist, support, and marketplace activity.",
      "Vendor details such as shop profile, KYC status, payout settings, listings, disputes, and policy history.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "To process orders, payments, delivery, returns, refunds, support requests, and vendor operations.",
      "To personalize shopping, improve search, recommend products, send service notices, and protect account security.",
      "To detect fraud, enforce platform rules, review disputes, audit sensitive actions, and meet operational obligations.",
    ],
  },
  {
    title: "Sharing and Service Providers",
    body: [
      "We may share necessary order and delivery information with vendors, couriers, payment providers, and support teams.",
      "We do not sell personal data. Data is shared only when needed to operate, secure, improve, or legally protect the platform.",
    ],
  },
  {
    title: "Your Choices",
    body: [
      "You can update account profile, address, notification, privacy, and app preference settings from your account where available.",
      "You may request account export or deletion through account tools, subject to fraud prevention, dispute, refund, and legal retention needs.",
    ],
  },
  {
    title: "Security and Retention",
    body: [
      "We use account authentication, role permissions, audit logs, and operational safeguards to protect platform data.",
      "We keep information only as long as needed for service delivery, marketplace records, legal needs, fraud prevention, and dispute handling.",
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link to="/" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
            Back to Amiyo-Go
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase text-slate-500">
            Privacy rules
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            This policy explains how Amiyo-Go handles customer, vendor, and
            marketplace data while operating the shopping platform.
          </p>
          <p className="mt-3 text-sm text-slate-500">Last updated: {lastUpdated}</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-slate-200 bg-white p-6">
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
            <h2 className="text-xl font-bold text-slate-950">Questions</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Contact support through the
              <Link to="/contact" className="font-semibold text-primary-600 hover:text-primary-700">
                {" "}Contact page
              </Link>
              {" "}for privacy questions, data requests, or account concerns.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
