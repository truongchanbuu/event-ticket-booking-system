// import React from "react";

// export const TicketBookingLoader = () => {
//   return (
//     <div className="bg-white absolute inset-0 bg-white flex items-center justify-center z-50">
//       <div className="text-center">
//         {/* Ticket Animation */}
//         <div className="relative mb-6">
//           <div className="w-20 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg animate-pulse">
//             {/* Ticket perforations */}
//             <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2"></div>
//             <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full translate-x-1/2"></div>

//             {/* Ticket details lines */}
//             <div className="p-2 space-y-1">
//               <div className="h-1 bg-white/30 rounded w-3/4"></div>
//               <div className="h-1 bg-white/30 rounded w-1/2"></div>
//             </div>
//           </div>

//           {/* Floating tickets */}
//           <div className="absolute -top-2 -right-2 w-6 h-4 bg-gradient-to-r from-pink-400 to-red-500 rounded opacity-70 animate-bounce"></div>
//           <div
//             className="absolute -bottom-1 -left-3 w-5 h-3 bg-gradient-to-r from-green-400 to-blue-500 rounded opacity-60 animate-bounce"
//             style={{ animationDelay: "0.5s" }}
//           ></div>
//         </div>

//         {/* Loading dots */}
//         <div className="flex justify-center space-x-2 mb-4">
//           <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
//           <div
//             className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
//             style={{ animationDelay: "0.1s" }}
//           ></div>
//           <div
//             className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"
//             style={{ animationDelay: "0.2s" }}
//           ></div>
//         </div>

//         {/* Loading text */}
//         <div className="text-gray-600 font-medium">
//           <p className="text-lg mb-1">Loading...</p>
//           <p className="text-sm text-gray-500">We are processing...</p>
//         </div>

//         {/* Progress bar */}
//         <div className="mt-6 w-48 mx-auto">
//           <div className="w-full bg-gray-200 rounded-full h-1">
//             <div
//               className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 rounded-full animate-pulse"
//               style={{ width: "70%" }}
//             ></div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
