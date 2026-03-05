import { Link } from 'react-router-dom';

const ComingSoon = ({ feature = 'This Feature', icon = '🚀' }) => {
  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-8xl mb-6">{icon}</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{feature}</h1>
          <p className="text-lg text-gray-600 mb-8">
            We're working hard to bring you this feature. Stay tuned!
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">This feature is coming soon!</p>
            <Link
              to="/vendor/dashboard"
              className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 font-semibold transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
