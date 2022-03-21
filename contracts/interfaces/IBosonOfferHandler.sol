// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../domain/BosonTypes.sol";

/**
 * @title IBosonOfferHandler
 *
 * @notice Manages creation, voiding, and querying of offers within the protocol.
 *
 * The ERC-165 identifier for this interface is: 0xaf7dd438
 */
interface IBosonOfferHandler {

    /// Events
    event OfferCreated(uint256 indexed offerId, uint256 indexed sellerId, BosonTypes.Offer offer);
    event OfferUpdated(uint256 indexed offerId, uint256 indexed sellerId, BosonTypes.Offer offer);
    event OfferVoided(uint256 indexed offerId, uint256 indexed sellerId);

    /**
     * @notice Creates an offer
     *
     * Emits an OfferCreated event if successful.
     *
     * Reverts if:
     * - Valid from date is greater than valid until date
     * - Valid until date is not in the future
     *
     * @param _offer - the fully populated struct with offer id set to 0x0
     */
    function createOffer(BosonTypes.Offer memory _offer)
    external;

    /**
     * @notice Updates an existing offer.
     *
     * Emits an OfferCreated event if successful.
     *
     * Reverts if:
     * - Offer is not updateable, i.e. is voided or some exchanges are active
     * - Any other validation for offer creation fails
     *
     * @param _offer - the fully populated struct with offer id set to offer to be updated, active exchanges set to 0 and voided set to false
     */
    function updateOffer(
        BosonTypes.Offer memory _offer
    ) external;

    /**
     * @notice Voids a given offer
     *
     * Emits an OfferVoided event if successful.
     *
     * Note:
     * Existing exchanges are not affected.
     * No further vouchers can be issued against a voided offer.
     *
     * Reverts if:
     * - Offer ID is invalid
     * - Offer is not owned by caller
     *
     * @param _offerId - the id of the offer to check
     */
    function voidOffer(uint256 _offerId)
    external;

    /**
     * @notice Sets new valid until date
     *
     * Emits an OfferUpdated event if successful.
     *
     * Reverts if:
     * - Offer does not exist
     * - Caller is not the seller (TODO)
     * - New valid until date is before existing valid until dates
     *
     *  @param _offerId - the id of the offer to check
     *  @param _validUntilDate - new valid until date
     */
    function extendOffer(
        uint256 _offerId, uint _validUntilDate
    ) external;

    /**
     * @notice Gets the details about a given offer.
     *
     * @param _offerId - the id of the offer to check
     * @return success - the offer was found
     * @return offer - the offer details. See {BosonTypes.Offer}
     */
    function getOffer(uint256 _offerId)
    external
    view
    returns(bool success, BosonTypes.Offer memory offer);

    /**
     * @notice Gets the next offer id.
     *
     * Does not increment the counter.
     *
     * @return nextOfferId - the next offer id
     */
    function getNextOfferId()
    external
    view
    returns(uint256 nextOfferId);

    /**
     * @notice Tells if offer is voided or not
     *
     * @param _offerId - the id of the offer to check
     * @return success - the offer was found
     * @return offerVoided - true if voided, false otherwise
     */
    function isOfferVoided(uint256 _offerId)
    external
    view
    returns(bool success, bool offerVoided);
    
    /**
     * @notice Tells if offer is can be updated or not
     *
     * Offer is updateable if:
     * - is not voided
     * - has no unfinalized exchanges
     * - has no unfinalized disputes
     *
     * @param _offerId - the id of the offer to check
     * @return success - the offer was found
     * @return offerUpdateable - true if updateable, false otherwise
     */
    function isOfferUpdateable(uint256 _offerId)
    external
    view
    returns(bool success, bool offerUpdateable);
}