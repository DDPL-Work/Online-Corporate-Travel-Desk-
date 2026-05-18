const { PROVIDERS } = require("../constants/reissue.constants");
const tboReissueProvider = require("./tbo/reissue.provider");

function getProvider(provider = PROVIDERS.TBO) {
  switch (provider) {
    case PROVIDERS.TBO:
      return tboReissueProvider;
    default:
      throw new Error(`Unsupported reissue provider: ${provider}`);
  }
}

module.exports = { getProvider };
