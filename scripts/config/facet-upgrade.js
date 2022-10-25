const { getStateModifyingFunctionsHashes } = require("../../scripts/util/diamond-utils.js");

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
async function getFacets() {
  // metaTransactionsHandlerFacet initializer arguments.
  const MetaTransactionsHandlerFacetInitArgs = await getStateModifyingFunctionsHashes(
    [
      "AccountHandlerFacet",
      "SellerHandlerFacet",
      "BuyerHandlerFacet",
      "DisputeResolverHandlerFacet",
      "AgentHandlerFacet",
      "BundleHandlerFacet",
      "DisputeHandlerFacet",
      "ExchangeHandlerFacet",
      "FundsHandlerFacet",
      "GroupHandlerFacet",
      "OfferHandlerFacet",
      "OrchestrationHandlerFacet",
      "TwinHandlerFacet",
      "PauseHandlerFacet",
      "MetaTransactionsHandlerFacet",
    ],
    ["executeMetaTransaction(address,string,bytes,uint256,bytes32,bytes32,uint8)"]
  );

  return {
    addOrUpgrade: ["MetaTransactionsHandlerFacet"],
    remove: [],
    skipSelectors: { SellerHandlerFacet: [] },
    initArgs: {
      MetaTransactionsHandlerFacet: [MetaTransactionsHandlerFacetInitArgs],
    },
    skipInit: [],
  };
}

exports.getFacets = getFacets;
