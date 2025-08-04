export default function NoApplicationUI() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>

          {/* Content */}
          <div className="relative z-10">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <FileX className="w-8 h-8 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
              No Application Found
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-8 leading-relaxed">
              You haven't submitted an organizer application yet. Ready to join
              our amazing community?
            </p>

            {/* CTA Button */}
            <a
              href="/organizers/apply"
              className="group inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
              Apply Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>

            {/* Additional Info */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Quick & easy application process
            </div>
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/70 transition-colors duration-300">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-indigo-600 font-bold text-sm">5</span>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Minutes to apply
            </p>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/70 transition-colors duration-300">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-purple-600 font-bold text-sm">24h</span>
            </div>
            <p className="text-xs text-gray-600 font-medium">Review time</p>
          </div>
        </div>
      </div>
    </div>
  );
}
