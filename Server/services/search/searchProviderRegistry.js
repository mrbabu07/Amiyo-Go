const MongoSearchProvider = require("./MongoSearchProvider");

const normalizeProviderName = (value = "mongo") => String(value || "mongo").trim().toLowerCase();

const createSearchProvider = (dependencies = {}, providerName = process.env.SEARCH_PROVIDER || "mongo") => {
  const normalized = normalizeProviderName(providerName);

  if (normalized === "mongo" || normalized === "mongodb") {
    return new MongoSearchProvider(dependencies);
  }

  throw new Error(`Unsupported search provider: ${providerName}`);
};

module.exports = {
  createSearchProvider,
  normalizeProviderName,
};
