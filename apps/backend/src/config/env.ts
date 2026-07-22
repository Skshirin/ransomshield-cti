import dotenv from "dotenv";
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  mongoUri: requireEnv("MONGO_URI"),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  jwt: {
    accessSecret: requireEnv("JWT_ACCESS_SECRET"),
    refreshSecret: requireEnv("JWT_REFRESH_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  mlServiceApiKey: requireEnv("ML_SERVICE_API_KEY"),
  blockchain: {
    rpcUrl: requireEnv("POLYGON_AMOY_RPC_URL"),
    privateKey: requireEnv("BLOCKCHAIN_PRIVATE_KEY"),
    contractAddress: requireEnv("CTI_REGISTRY_CONTRACT_ADDRESS"),
  },
};