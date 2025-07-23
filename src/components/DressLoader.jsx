import PropTypes from 'prop-types';

const DressLoader = () => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
      <div className="relative animate-pulse">
        <svg
          className="w-16 h-16 text-purple-600"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2C13.1 2 14 2.9 14 4V6H16C17.1 6 18 6.9 18 8V10C18 11.1 17.1 12 16 12H14V14H16C17.1 14 18 14.9 18 16V18C18 19.1 17.1 20 16 20H14V22H10V20H8C6.9 20 6 19.1 6 18V16C6 14.9 6.9 14 8 14H10V12H8C6.9 12 6 11.1 6 10V8C6 6.9 6.9 6 8 6H10V4C10 2.9 10.9 2 12 2Z"
            fill="currentColor"
          />
          <circle cx="12" cy="4" r="2" fill="currentColor" className="animate-spin-slow" />
        </svg>
        <div className="absolute -inset-4 bg-purple-200 bg-opacity-20 rounded-full animate-ping" />
      </div>
    </div>
  );
};

DressLoader.propTypes = {};

export default DressLoader;