import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lltsqnyujydqusbzgael.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Usamos un type cast a 'any' solo en el bloque experimental 
  // para que TypeScript no se queje de la propiedad nueva
  experimental: {
    allowedDevOrigins: ["192.168.0.104:3005", "localhost:3005"],
    serverActions: {
      allowedOrigins: ["192.168.0.104:3005", "localhost:3005"]
    }
  } as any, 
};



export default nextConfig;