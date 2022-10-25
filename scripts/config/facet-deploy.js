const { getStateModifyingFunctionsHashes } = require("../../scripts/util/diamond-utils.js");

/**
 * Config file used to upgrade the facets
 *
 * - noArgFacets: list of facet names that don't expect any argument passed into initializer
 * - argFacets: object that specify facet names and arguments that needs to be passed into initializer in format object {facetName: initializerArguments}
 */

const noArgFacetNames = [
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
];

async function getFacets() {
  // metaTransactionsHandlerFacet initializer arguments.
  const MetaTransactionsHandlerFacetInitArgs = await getStateModifyingFunctionsHashes(
    [...noArgFacetNames, "MetaTransactionsHandlerFacet"],
    ["executeMetaTransaction(address,string,bytes,uint256,bytes32,bytes32,uint8)"]
  );

  return {
    noArgFacets: noArgFacetNames,
    argFacets: { MetaTransactionsHandlerFacet: [MetaTransactionsHandlerFacetInitArgs] },
  };
}

exports.getFacets = getFacets;
