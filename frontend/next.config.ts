const nextConfig = {
  images: {
    domains: ["res.cloudinary.com"],
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/events",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
