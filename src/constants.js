export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  IS_LOCAL: Number(process.env.IS_LOCAL),
};
