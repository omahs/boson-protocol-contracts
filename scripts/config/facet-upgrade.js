/**
 * Config file used to upgrade the facets
 *
 * - addOrUpgrade: list of facets that will be upgraded or added
 * - remove: list of facets that will be completely removed
 * - skipSelectors:  mapping "facetName":"listOfFunctionsToBeSkipped". With this you can specify functions that will be ignored during the update.
 *          You don't have to specify "initialize()" since it's ignored by default.
 *          Skip does not apply to facets that are completely removed.
 * - initArgs: if facet initializer expects arguments, provide it here. For no-arg initializers you don't have to specify anything.
 * - skipInit": list of facets for which you want to skip initialization call.
 */
exports.Facets = {
  addOrUpgrade: ["MetaTransactionsHandlerFacet"],
  remove: [],
  skipSelectors: { SellerHandlerFacet: [] },
  initArgs: {
    MetaTransactionsHandlerFacet: [
      [
        "0x1227dbbba1af7882df0c2f368ac78fb2c624a77dcfa783b3512a331d08541945",
        "0x1843b3a936e72dc3423a7820b79df54578eb2321480ad2f0c6191b7a2c500174",
        "0x4e534c9650f9ac7d5c03f8c48b0522522a613d6214bf7ba579412924ab0f9295",
      ],
    ],
  },
  skipInit: [],
};
