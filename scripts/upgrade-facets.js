const hre = require("hardhat");
const ethers = hre.ethers;
const network = hre.network.name;
const { Facets } = require("./config/facet-upgrade");
const { readContracts } = require("./util/utils");
const environments = require("../environments");
const confirmations = network == "hardhat" ? 1 : environments.confirmations;
const tipMultiplier = ethers.BigNumber.from(environments.tipMultiplier);
const tipSuggestion = "1500000000"; // ethers.js always returns this constant, it does not vary per block
const maxPriorityFeePerGas = ethers.BigNumber.from(tipSuggestion).mul(tipMultiplier);
const { deployProtocolHandlerFacets } = require("./util/deploy-protocol-handler-facets.js");
const { FacetCutAction, getSelectors, removeSelectors } = require("./util/diamond-utils.js");
const { deploymentComplete, getFees, writeContracts } = require("./util/utils.js");
const Role = require("./domain/Role");
const packageFile = require("../package.json");
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Upgrades or reamoves existing facets, or add new facets.
 *
 * Process:
 *  1.  Edit scripts/config/facet-upgrade.js.
 *  1a. Provide a list of facets that needs to be upgraded (field "addOrUpgrade") or removed completely (field "remove")
 *  1b. Optionally you can specify which selectors should be ignored (filed "skip"). You don't have to specify "initialize()" since it's ignored by default
 *  2. Update protocol version in package.json. If not, script will prompt you to confirm that version remains unchanged.
 *  2. Run the appropriate npm script in package.json to upgrde facets for a given network
 *  3. Save changes to the repo as a record of what was upgraded
 */
async function main() {
  // Bail now if hardhat network
  if (network === "hardhat") process.exit();

  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  const contractsFile = readContracts(chainId, network);
  let contracts = contractsFile.contracts;

  const divider = "-".repeat(80);
  console.log(`${divider}\nBoson Protocol Contract Suite Upgrader\n${divider}`);
  console.log(`⛓  Network: ${hre.network.name}\n📅 ${new Date()}`);

  // Check that package.json version was updated
  if (packageFile.version == contractsFile.protocolVersion) {
    const answer = await new Promise((resolve) => {
      rl.question("Protocol version has not been updated. Proceed anyway? (y/n) ", resolve);
    });
    switch (answer.toLowerCase()) {
      case "y":
      case "yes":
        break;
      case "n":
      case "no":
        process.exit(1);
        break;
      default:
        break;
    }
  }

  // Get the accounts
  const accounts = await ethers.provider.listAccounts();
  const admin = accounts[0];
  console.log("🔱 Admin account: ", admin ? admin : "not found" && process.exit());
  console.log(divider);

  // Get addresses of currently deployed contracts
  const protocolAddress = contracts.find((c) => c.name === "ProtocolDiamond").address;
  const accessControllerAddress = contracts.find((c) => c.name === "AccessController").address;

  if (!protocolAddress) {
    return addressNotFound("ProtocolDiamond");
  }

  if (!accessControllerAddress) {
    return addressNotFound("AccessController");
  }

  // Get AccessController abstraction
  const accessController = await ethers.getContractAt("AccessController", accessControllerAddress);

  // Check that caller has upgrader role.
  const hasRole = await accessController.hasRole(Role.UPGRADER, admin);
  if (!hasRole) {
    console.log("Admin address does not have UPGRADER role");
    process.exit(1);
  }

  // Deploy new facets
  const deployedFacets = await deployProtocolHandlerFacets(
    protocolAddress,
    Facets.addOrUpgrade,
    maxPriorityFeePerGas,
    false
  );

  // Cast Diamond to DiamondCutFacet and DiamondLoupeFacet
  const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", protocolAddress);
  const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", protocolAddress);

  // All handler facets currently have no-arg initializers
  let initFunction = "initialize()";
  let initInterface = new ethers.utils.Interface([`function ${initFunction}`]);
  let callData = initInterface.encodeFunctionData("initialize");

  // manage new or upgraded facets
  for (const newFacet of deployedFacets) {
    console.log(`\n📋 Facet: ${newFacet.name}`);

    // Get currently registered selectors
    const oldFacet = contracts.find((i) => i.name === newFacet.name);
    let registeredSelectors;
    if (oldFacet) {
      // Facet already exists and is only upgraded
      registeredSelectors = await diamondLoupe.facetFunctionSelectors(oldFacet.address);
    } else {
      // Facet is new
      registeredSelectors = [];
    }

    // Remove old entry from contracts
    contracts = contracts.filter((i) => i.name !== newFacet.name);
    deploymentComplete(newFacet.name, newFacet.contract.address, [], contracts);

    // Get new selectors from compiled contract
    const selectors = getSelectors(newFacet.contract, true);
    const newSelectors = selectors.selectors.remove([initFunction]);

    // Determine actions to be made
    let selectorsToReplace = registeredSelectors.filter((value) => newSelectors.includes(value)); // intersection of old and new selectors
    let selectorsToRemove = registeredSelectors.filter((value) => !selectorsToReplace.includes(value)); // unique old selectors
    let selectorsToAdd = newSelectors.filter((value) => !selectorsToReplace.includes(value)); // unique new selectors

    // Skip selectors if set in config
    const selectorsToSkip = Facets.skip[newFacet.name] ? Facets.skip[newFacet.name] : [];
    selectorsToReplace = removeSelectors(selectorsToReplace, selectorsToSkip);
    selectorsToRemove = removeSelectors(selectorsToRemove, selectorsToSkip);
    selectorsToAdd = removeSelectors(selectorsToAdd, selectorsToSkip);

    // Logs
    console.log(`💎 Removed selectors:\n\t${selectorsToRemove.join("\n\t")}`);
    console.log(
      `💎 Replaced selectors:\n\t${selectorsToReplace
        .map((selector) => `${selector}: ${selectors.signatureToNameMapping[selector]}`)
        .join("\n\t")}`
    );
    console.log(
      `💎 Added selectors:\n\t${selectorsToAdd
        .map((selector) => `${selector}: ${selectors.signatureToNameMapping[selector]}`)
        .join("\n\t")}`
    );
    console.log(`❌ Skipped selectors:\n\t${selectorsToSkip.join("\n\t")}`);

    // Adding and replacing are done in one diamond cut
    if (selectorsToAdd.length > 0 || selectorsToReplace.length > 0) {
      const newFacetAddress = newFacet.contract.address;
      let facetCut = [];
      if (selectorsToAdd.length > 0) facetCut.push([newFacetAddress, FacetCutAction.Add, selectorsToAdd]);
      if (selectorsToReplace.length > 0) facetCut.push([newFacetAddress, FacetCutAction.Replace, selectorsToReplace]);

      // Diamond cut
      const transactionResponse = await diamondCutFacet.diamondCut(
        facetCut,
        newFacetAddress,
        callData,
        await getFees(maxPriorityFeePerGas)
      );
      await transactionResponse.wait(confirmations);
    }

    // Removing is done in a separate diamond cut
    if (selectorsToRemove.length > 0) {
      const removeFacetCut = [ethers.constants.AddressZero, FacetCutAction.Remove, selectorsToRemove];

      // Diamond cut
      const transactionResponse = await diamondCutFacet.diamondCut(
        [removeFacetCut],
        ethers.constants.AddressZero,
        "0x",
        await getFees(maxPriorityFeePerGas)
      );
      await transactionResponse.wait(confirmations);
    }
  }

  // manage facets that are being completely removed
  for (const facetToRemove of Facets.remove) {
    // Get currently registered selectors
    const oldFacet = contracts.find((i) => i.name === facetToRemove);

    let registeredSelectors;
    if (oldFacet) {
      // Facet already exists and is only upgraded
      registeredSelectors = await diamondLoupe.facetFunctionSelectors(oldFacet.address);
    } else {
      // Facet does not exist, skip next steps
      continue;
    }
    console.log(`\n📋💀 Facet removal: ${facetToRemove}`);

    // Remove old entry from contracts
    contracts = contracts.filter((i) => i.name !== facetToRemove);

    // All selectors must be removed
    let selectorsToRemove = registeredSelectors; // all selectors must be removed

    // Logs
    console.log(`💎 Removed selectors:\n\t${selectorsToRemove.join("\n\t")}`);

    // Removing the selectors
    const removeFacetCut = [ethers.constants.AddressZero, FacetCutAction.Remove, selectorsToRemove];

    // Diamond cut
    const transactionResponse = await diamondCutFacet.diamondCut(
      [removeFacetCut],
      ethers.constants.AddressZero,
      "0x",
      await getFees(maxPriorityFeePerGas)
    );
    await transactionResponse.wait(confirmations);
  }

  const contractsPath = await writeContracts(contracts);
  console.log(divider);
  console.log(`✅ Contracts written to ${contractsPath}`);
  console.log(divider);

  console.log(`\n📋 Diamond upgraded.`);
  console.log("\n");
}

const addressNotFound = (address) => {
  console.log(`${address} address not found for network ${network}`);
  process.exit(1);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
