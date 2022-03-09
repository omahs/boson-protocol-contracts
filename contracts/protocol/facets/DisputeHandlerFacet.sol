// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../interfaces/IBosonDisputeHandler.sol";
import "../../diamond/DiamondLib.sol";
import "../ProtocolBase.sol";
import "../ProtocolLib.sol";

/**
 * @title DisputeHandlerFacet
 *
 * @notice Handles disputes associated with exchanges within the protocol
 */
contract DisputeHandlerFacet is IBosonDisputeHandler, ProtocolBase {

    /**
     * @dev Modifier to protect initializer function from being invoked twice.
     */
    modifier onlyUnInitialized()
    {
        ProtocolLib.ProtocolInitializers storage pi = ProtocolLib.protocolInitializers();
        require(!pi.disputeHandler, ALREADY_INITIALIZED);
        pi.disputeHandler = true;
        _;
    }

    /**
     * @notice Facet Initializer
     */
    function initialize()
    public
    onlyUnInitialized
    {
        DiamondLib.addSupportedInterface(type(IBosonDisputeHandler).interfaceId);
    }

    /**
     * @notice Raise a dispute
     *
     * Emits an DisputeCreated event if successful.
     *
     * Reverts if:
     * - caller does not hold a voucher for the given offer id
     * - a dispute already exists
     * - the complaint is blank
     *
     * @param _exchangeId - the id of the associated exchange
     * @param _complaint - the buyer's complaint description
     */
    function raiseDispute(
        uint256 _exchangeId,
        string calldata _complaint
    )
    external
    override
    {
        // Get the exchange, revert if it doesn't exist
        Exchange storage exchange = ProtocolLib.getExchange(_exchangeId);
        require (exchange.id == _exchangeId, BosonConstants.NO_SUCH_EXCHANGE);

        Offer storage offer = ProtocolLib.getOffer(exchange.offerId);
        require (offer.id == exchange.offerId, BosonConstants.NO_SUCH_OFFER);

        // TODO implement further checks, create and store dispute

        // Notify watchers of state change
        emit DisputeRaised(_exchangeId, exchange.buyerId, offer.sellerId, _complaint);

    }


}