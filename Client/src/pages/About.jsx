import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Home"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                About HnilaBazar
              </h1>
              <p className="text-gray-600">
                Learn more about our story and mission
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Your Trusted E-commerce Partner
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            HnilaBazar is Bangladesh's premier online marketplace, connecting
            customers with quality products and exceptional service.
          </p>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h3>
            <p className="text-gray-600 mb-4">
              Founded with a vision to revolutionize online shopping in
              Bangladesh, HnilaBazar started as a small initiative to bridge the
              gap between quality products and customers across the country.
            </p>
            <p className="text-gray-600 mb-4">
              Today, we've grown into a comprehensive e-commerce platform
              serving thousands of customers with a wide range of products from
              fashion to electronics, all while maintaining our commitment to
              quality and customer satisfaction.
            </p>
            <p className="text-gray-600">
              Our name "HnilaBazar" reflects our deep connection to Bangladeshi
              culture and our mission to create a marketplace that truly serves
              our community.
            </p>
          </div>
          <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-8">
            <h4 className="text-xl font-semibold text-gray-900 mb-6">
              Why Choose HnilaBazar?
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">
                    Quality Assurance
                  </h5>
                  <p className="text-sm text-gray-600">
                    Every product is carefully vetted for quality and
                    authenticity
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">Fast Delivery</h5>
                  <p className="text-sm text-gray-600">
                    Quick and reliable delivery across Bangladesh
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">
                    Secure Payments
                  </h5>
                  <p className="text-sm text-gray-600">
                    Multiple payment options including bKash, Nagad, and COD
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">24/7 Support</h5>
                  <p className="text-sm text-gray-600">
                    Round-the-clock customer service in Bengali and English
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Our Mission
            </h3>
            <p className="text-gray-600">
              To provide every Bangladeshi with access to quality products at
              fair prices, delivered with exceptional service and supported by
              cutting-edge technology.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-secondary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Our Vision</h3>
            <p className="text-gray-600">
              To become Bangladesh's most trusted and innovative e-commerce
              platform, empowering local businesses and creating opportunities
              for economic growth.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl p-8 text-white mb-16">
          <h3 className="text-2xl font-bold text-center mb-8">
            HnilaBazar by Numbers
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">10K+</div>
              <div className="text-sm opacity-90">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">5K+</div>
              <div className="text-sm opacity-90">Products</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">64</div>
              <div className="text-sm opacity-90">Districts Covered</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">99%</div>
              <div className="text-sm opacity-90">Customer Satisfaction</div>
            </div>
          </div>
        </div>

        {/* Team Values */}
        <div className="text-center mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Our Values</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-accent-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Customer First
              </h4>
              <p className="text-gray-600">
                Every decision we make puts our customers' needs and
                satisfaction at the center.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-accent-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Quality Excellence
              </h4>
              <p className="text-gray-600">
                We maintain the highest standards in product quality and service
                delivery.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-accent-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Innovation
              </h4>
              <p className="text-gray-600">
                We continuously innovate to provide better shopping experiences
                and solutions.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Start Shopping?
          </h3>
          <p className="text-gray-600 mb-6">
            Join thousands of satisfied customers and discover amazing products
            at great prices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="bg-primary-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              Start Shopping
            </Link>
            <Link
              to="/contact"
              className="border-2 border-primary-500 text-primary-500 px-8 py-3 rounded-lg font-semibold hover:bg-primary-500 hover:text-white transition-all"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
