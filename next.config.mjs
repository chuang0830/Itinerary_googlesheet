import { networkInterfaces } from 'node:os';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permit dev scripts and HMR from this computer's actual LAN addresses.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap((addresses) =>
    (addresses || [])
      .filter((address) => address.family === 'IPv4' && !address.internal)
      .map((address) => address.address),
  ),
};

export default nextConfig;
