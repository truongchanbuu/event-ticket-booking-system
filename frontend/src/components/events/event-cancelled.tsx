import { AlertTriangle, Calendar, Mail, RefreshCw } from "lucide-react";

export function EventCancelledUI({ result }) {
  if (result.kind === "cancelled") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-pink-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            {/* Main card with glass morphism effect */}
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-r from-red-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-72 h-72 bg-gradient-to-r from-orange-400 to-red-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
              </div>

              <div className="relative p-8 md:p-12 text-center">
                {/* Icon with animation */}
                <div className="mb-8 flex justify-center">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <AlertTriangle className="w-12 h-12 text-white" />
                    </div>
                    {/* Ripple effect */}
                    <div className="absolute inset-0 w-24 h-24 bg-red-500/30 rounded-full animate-ping"></div>
                  </div>
                </div>

                {/* Main heading with gradient text */}
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-red-800 to-pink-800 bg-clip-text text-transparent mb-6 leading-tight">
                  Event has been cancelled
                </h1>

                {/* Reason card */}
                {result.reason && (
                  <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-200/50 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                    <div className="flex items-center justify-center mb-3">
                      <Calendar className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-sm font-medium text-red-800 uppercase tracking-wide">
                        Reason
                      </span>
                    </div>
                    <p className="text-lg text-gray-800 font-medium">
                      {result?.reason ?? "No Provided."}
                    </p>
                  </div>
                )}

                {/* Information card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-6 mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <Mail className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                      Important Information
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    If you has purchased ticket, please check your{" "}
                    <strong>email</strong> or <strong>notificaton</strong> to
                    know the details.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="group bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center">
                    <Mail className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                    Check Email
                  </button>

                  <button className="group bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-8 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                    Reload
                  </button>
                </div>

                {/* Footer message */}
                <div className="mt-8 pt-6 border-t border-gray-200/50">
                  <p className="text-sm text-gray-500">
                    We are truly sorry for this case. We really appriciate your
                    kindness.
                  </p>
                </div>
              </div>
            </div>

            {/* Floating decorative elements */}
            <div className="absolute top-8 left-8 w-2 h-2 bg-red-400 rounded-full animate-bounce animation-delay-1000"></div>
            <div className="absolute top-16 right-16 w-3 h-3 bg-pink-400 rounded-full animate-bounce animation-delay-2000"></div>
            <div className="absolute bottom-16 left-16 w-2 h-2 bg-orange-400 rounded-full animate-bounce animation-delay-3000"></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
