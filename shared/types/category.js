export const CATEGORIES = [
  {
    id: "music",
    name: "Music & Live Show",
    slug: "music-live-show",
    icon: "🎵",
    color: "#FF6F61",
    description: "Concerts, festivals, and live performances.",
  },
  {
    id: "sports",
    name: "Sports & Fitness",
    slug: "sports-fitness",
    icon: "🏅",
    color: "#3498DB",
    description: "Competitive games, fitness classes, and wellness events.",
  },
  {
    id: "arts",
    name: "Arts & Culture",
    slug: "arts-culture",
    icon: "🎨",
    color: "#9B59B6",
    description: "Art exhibitions, museum tours, and cultural gatherings.",
  },
  {
    id: "food",
    name: "Food & Beverage",
    slug: "food-beverage",
    icon: "🍴",
    color: "#E67E22",
    description: "Food festivals, tastings, and culinary workshops.",
  },
  {
    id: "technology",
    name: "Technology & Innovation",
    slug: "technology-innovation",
    icon: "💻",
    color: "#2ECC71",
    description: "Conferences, hackathons, and tech meetups.",
  },
  {
    id: "business",
    name: "Business & Networking",
    slug: "business-networking",
    icon: "💼",
    color: "#34495E",
    description: "Trade shows, networking events, and entrepreneurship panels.",
  },
  {
    id: "education",
    name: "Education & Workshops",
    slug: "education-workshops",
    icon: "🎓",
    color: "#F1C40F",
    description: "Seminars, courses, and hands-on learning sessions.",
  },
  {
    id: "wellness",
    name: "Health & Wellness",
    slug: "health-wellness",
    icon: "🧘",
    color: "#1ABC9C",
    description: "Yoga retreats, meditation sessions, and wellness fairs.",
  },
  {
    id: "family",
    name: "Family & Kids",
    slug: "family-kids",
    icon: "👨‍👩‍👧‍👦",
    color: "#FFCE54",
    description: "Child-friendly activities, fairs, and family gatherings.",
  },
  {
    id: "charity",
    name: "Charity & Fundraiser",
    slug: "charity-fundraiser",
    icon: "🎗️",
    color: "#95A5A6",
    description: "Fundraising events, benefit concerts, and charity galas.",
  },
];

/**
 * Array of category IDs for quick validation or filtering
 */
export const CATEGORY_IDS = CATEGORIES.map((cat) => cat.id);

/**
 * Map of category metadata by ID for O(1) lookups
 */
export const CATEGORY_MAP = CATEGORIES.reduce((map, cat) => {
  map[cat.id] = cat;
  return map;
});
