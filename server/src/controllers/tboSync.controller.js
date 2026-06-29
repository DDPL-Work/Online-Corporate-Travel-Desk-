const TBOCity = require("../models/TBOCity");
const TBOHotel = require("../models/TBOHotel");
const TBOHotelDetails = require("../models/TBOHotelDetails");
const TBOSyncProgress = require("../models/TBOSyncProgress");
const TBOSyncLog = require("../models/TBOSyncLog");
const Airline = require("../models/Airline");
const Airport = require("../models/Airport");
const Country = require("../models/CountryList");
const hotelService = require("../services/tektravels/hotel.service");
const logger = require("../utils/logger");
const asyncHandler = require("../utils/asyncHandler");
const path = require("path");
const fs = require("fs");

// Global sync states
const getActiveSyncs = () => {
    const active = [];
    if (typeof countrySyncState !== 'undefined' && countrySyncState.isSyncing) active.push('Country Sync');
    if (typeof citySyncState !== 'undefined' && citySyncState.isSyncing) active.push('City Sync');
    if (typeof hotelSyncState !== 'undefined' && hotelSyncState.isSyncing) active.push('Hotel Sync');
    if (typeof hotelDetailsSyncState !== 'undefined' && hotelDetailsSyncState.isSyncing) active.push('Hotel Details Sync');
    return active;
};

const addLog = async (type, message, affectedSyncs = []) => {
    try {
        await TBOSyncLog.create({
            type,
            message,
            affectedSyncs,
        });
    } catch (err) {
        logger.error("Failed to insert TBOSyncLog:", err.message);
    }
};

let countrySyncState = {
    isSyncing: false,
    isPaused: false,
    isCancelled: false,
    totalCountries: 0,
    processedCountries: 0,
    totalSaved: 0,
    errors: [],
    startTime: null,
    endTime: null,
};

let citySyncState = {
    isSyncing: false,
    isPaused: false,
    isCancelled: false,
    totalCountries: 0,
    processedCountries: 0,
    totalCitiesSaved: 0,
    lastCountry: "",
    errors: [],
    startTime: null,
    endTime: null,
};

let hotelSyncState = {
    isSyncing: false,
    isPaused: false,
    isCancelled: false,
    totalCities: 0,
    processedCities: 0,
    totalHotelsSaved: 0,
    lastCity: "",
    currentPage: 1, // Added to show page progress
    errors: [],
    startTime: null,
    endTime: null,
};

/**
 * Background processor for country synchronization
 */
exports.processCountrySync = async () => {
    if (countrySyncState.isSyncing) return;
    countrySyncState.isSyncing = true;
    countrySyncState.isPaused = false;
    countrySyncState.isCancelled = false;
    countrySyncState.startTime = new Date();
    countrySyncState.errors = [];
    countrySyncState.totalCountries = 0;
    addLog('START', 'Country Sync process started.', ['Country Sync']);
    countrySyncState.processedCountries = 0;
    countrySyncState.totalSaved = 0;

    try {
        const countryRes = await hotelService.getCountryList();
        if (!countryRes || !countryRes.CountryList) {
            throw new Error("Failed to fetch country list from TBO");
        }

        const countries = countryRes.CountryList;
        countrySyncState.totalCountries = countries.length;

        const existingDocs = await Country.find({}).lean();
        const existingMap = new Map(existingDocs.map(c => [c.Code, c.Name]));

        const bulkOps = [];
        let insertedCount = 0;
        let modifiedCount = 0;
        let skippedCount = 0;

        for (const country of countries) {
            const existingName = existingMap.get(country.Code);
            if (!existingName) {
                logger.info(`[COUNTRY SYNC] 🆕 Saving new country: ${country.Name} (${country.Code})`);
                insertedCount++;
                bulkOps.push({
                    updateOne: {
                        filter: { Code: country.Code },
                        update: { $set: { Code: country.Code, Name: country.Name } },
                        upsert: true
                    }
                });
            } else if (existingName !== country.Name) {
                logger.info(`[COUNTRY SYNC] 🔄 Updating country: ${country.Code} from '${existingName}' to '${country.Name}'`);
                modifiedCount++;
                bulkOps.push({
                    updateOne: {
                        filter: { Code: country.Code },
                        update: { $set: { Code: country.Code, Name: country.Name } },
                        upsert: true
                    }
                });
            } else {
                logger.info(`[COUNTRY SYNC] ⏭️ Skipping country: ${country.Name} (${country.Code}) - No changes.`);
                skippedCount++;
            }
        }

        if (bulkOps.length > 0) {
            await Country.bulkWrite(bulkOps, { ordered: false });
            logger.info(`[COUNTRY SYNC] Completed. Matched/Skipped: ${skippedCount}, Modified: ${modifiedCount}, Inserted: ${insertedCount}`);
            countrySyncState.totalSaved = modifiedCount + insertedCount;
        } else {
            logger.info(`[COUNTRY SYNC] No countries found to sync.`);
        }
        
        countrySyncState.processedCountries = countries.length;
        countrySyncState.endTime = new Date();
        addLog('COMPLETE', `Country Sync completed successfully. Total processed: ${countrySyncState.processedCountries}. Total saved/modified: ${countrySyncState.totalSaved}.`, ['Country Sync']);
        return true;
    } catch (error) {
        logger.error("[COUNTRY SYNC] Critical failure:", error.message);
        countrySyncState.errors.push(error.message);
        return false;
    } finally {
        countrySyncState.isSyncing = false;
    }
};

/**
 * Background processor for city synchronization
 */
exports.processCitySync = async () => {
    if (citySyncState.isSyncing) return;
    citySyncState.isSyncing = true;
    citySyncState.isPaused = false;
    citySyncState.isCancelled = false;
    try {
        const countryRes = await hotelService.getCountryList();
        if (!countryRes || !countryRes.CountryList) {
            throw new Error("Failed to fetch country list from TBO");
        }

        const countries = countryRes.CountryList;
        citySyncState.totalCountries = countries.length;
        citySyncState.processedCountries = 0;
        citySyncState.totalCitiesSaved = 0;
        citySyncState.errors = [];
        citySyncState.startTime = new Date();

        for (const country of countries) {
            if (citySyncState.isCancelled) {
                logger.warn("[CITY SYNC] Cancelled by user.");
                break;
            }
            while (citySyncState.isPaused && !citySyncState.isCancelled) {
                await new Promise((r) => setTimeout(r, 2000));
            }
            try {
                const countryCode = country.Code;
                const countryName = country.Name;
                citySyncState.lastCountry = countryName;

                // OPTIMIZATION: Skip country if cities are already present
                const existingCityCount = await TBOCity.countDocuments({ countryCode });
                if (existingCityCount > 0) {
                    logger.info(`[CITY SYNC] ⏭️ Skipping ${countryName} - Already have ${existingCityCount} cities.`);
                    citySyncState.totalCitiesSaved += existingCityCount;
                    citySyncState.processedCountries++;
                    continue;
                }

                const cityRes = await hotelService.getCityList(countryCode);

                if (cityRes && cityRes.CityList && Array.isArray(cityRes.CityList)) {
                    const existingCities = await TBOCity.find({ countryCode }).lean();
                    const existingMap = new Map(existingCities.map(c => [c.cityCode, c.cityName]));

                    const cityOperations = [];
                    for (const city of cityRes.CityList) {
                        const existingName = existingMap.get(city.Code);
                        if (!existingName) {
                            logger.info(`[CITY SYNC] 🆕 Saving new city: ${city.Name} (${city.Code}) in ${countryName}`);
                            cityOperations.push({
                                updateOne: {
                                    filter: { cityCode: city.Code, countryCode: countryCode },
                                    update: {
                                        $set: {
                                            cityCode: city.Code,
                                            cityName: city.Name,
                                            countryCode: countryCode,
                                            countryName: countryName,
                                        },
                                    },
                                    upsert: true,
                                },
                            });
                        } else if (existingName !== city.Name) {
                            logger.info(`[CITY SYNC] 🔄 Updating city: ${city.Code} from '${existingName}' to '${city.Name}'`);
                            cityOperations.push({
                                updateOne: {
                                    filter: { cityCode: city.Code, countryCode: countryCode },
                                    update: {
                                        $set: {
                                            cityCode: city.Code,
                                            cityName: city.Name,
                                            countryCode: countryCode,
                                            countryName: countryName,
                                        },
                                    },
                                    upsert: true,
                                },
                            });
                        } else {
                            logger.info(`[CITY SYNC] ⏭️ Skipping city: ${city.Name} (${city.Code}) - No changes.`);
                        }
                    }

                    if (cityOperations.length > 0) {
                        const result = await TBOCity.bulkWrite(cityOperations);
                        citySyncState.totalCitiesSaved +=
                            result.upsertedCount + result.modifiedCount;
                    }
                }
                citySyncState.processedCountries++;
            } catch (error) {
                logger.error(
                    `[CITY SYNC] Error syncing ${country.Name}:`,
                    error.message,
                );
                citySyncState.errors.push({
                    country: country.Name,
                    error: error.message,
                });
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        citySyncState.endTime = new Date();
        addLog('COMPLETE', `City Sync completed successfully. Total countries processed: ${citySyncState.processedCountries}. Total cities saved: ${citySyncState.totalCitiesSaved}.`, ['City Sync']);
        return true; // Finished successfully
    } catch (error) {
        logger.error("[CITY SYNC] Critical failure:", error.message);
        addLog('ERROR', 'City Sync failed: ' + error.message, ['City Sync']);
        return false;
    } finally {
        citySyncState.isSyncing = false;
    }
};

/**
 * Background processor for hotel synchronization
 */
exports.processHotelSync = async (forceRestart = false) => {
    if (hotelSyncState.isSyncing) return;
    hotelSyncState.isSyncing = true;
    hotelSyncState.isPaused = false;
    hotelSyncState.isCancelled = false;
    try {
        if (forceRestart) {
            await TBOSyncProgress.findOneAndUpdate({ syncType: "hotels" }, { lastProcessedId: null, processedCount: 0 });
            logger.info("[HOTEL SYNC] Force restarted from index 0");
        }

        // Resume from checkpoint if exists
        const progress = await TBOSyncProgress.findOne({ syncType: "hotels" });
        let startFromId = progress?.lastProcessedId || null;

        const query = startFromId ? { _id: { $gt: startFromId } } : {};
        const cities = await TBOCity.find(query).sort({ _id: 1 });

        hotelSyncState.totalCities = await TBOCity.estimatedDocumentCount();
        hotelSyncState.processedCities = progress?.processedCount || 0;
        hotelSyncState.totalHotelsSaved = await TBOHotel.estimatedDocumentCount();
        hotelSyncState.errors = [];
        hotelSyncState.startTime = new Date();
        addLog('START', 'Hotel Sync process started.', ['Hotel Sync']);

        logger.info(`[HOTEL SYNC] Started. Resume index: ${hotelSyncState.processedCities}/${hotelSyncState.totalCities}`);

        for (const city of cities) {
            try {
                if (hotelSyncState.isCancelled) {
                    logger.info("[HOTEL SYNC] Process cancelled by user.");
                    break;
                }
                while (hotelSyncState.isPaused) {
                    if (hotelSyncState.isCancelled) break;
                    await new Promise(r => setTimeout(r, 2000));
                }
                if (hotelSyncState.isCancelled) break;

                hotelSyncState.lastCity = `${city.cityName}, ${city.countryName}`;

                // OPTIMIZATION removed to check every city for missing or updated hotels
                // It will now hit the TBO API for every city and verify hotels individually.

                let pageIndex = 1;
                let hasMore = true;
                let previousBatchSignature = "";

                while (hasMore) {
                    if (hotelSyncState.isCancelled) {
                        hasMore = false;
                        break;
                    }
                    while (hotelSyncState.isPaused) {
                        if (hotelSyncState.isCancelled) break;
                        await new Promise(r => setTimeout(r, 2000));
                    }
                    if (hotelSyncState.isCancelled) {
                        hasMore = false;
                        break;
                    }

                    hotelSyncState.currentPage = pageIndex;
                    const res = await hotelService.getTBOHotelCodeList(city.cityCode, pageIndex);
                    const hotelList = res?.Hotels || res?.HotelList;

                    if (res && hotelList && Array.isArray(hotelList)) {
                        const rawCount = hotelList.length;

                        // Detect duplicate data (infinite loop protection)
                        const currentSignature = rawCount > 0 ? `${hotelList[0].HotelCode}_${rawCount}` : "empty";
                        if (currentSignature === previousBatchSignature && rawCount > 0) {
                            logger.warn(`[HOTEL SYNC] 🛑 Infinite loop detected for ${city.cityName}. Same data returned for page ${pageIndex}. Stopping city.`);
                            hasMore = false;
                            break;
                        }
                        previousBatchSignature = currentSignature;

                        if (rawCount > 0) {
                            const validHotels = hotelList.filter(h => h.HotelCode);
                            const hotelCodes = validHotels.map(h => String(h.HotelCode));
                            const existingDocs = await TBOHotel.find({ cityCode: city.cityCode, hotelCode: { $in: hotelCodes } }).lean();
                            const existingMap = new Map(existingDocs.map(h => [String(h.hotelCode), h]));

                            const hotelOps = [];
                            for (const h of validHotels) {
                                const existing = existingMap.get(String(h.HotelCode));
                                const hotelName = h.HotelName || "";
                                
                                if (!existing) {
                                    logger.info(`[HOTEL SYNC] 🆕 Saving new hotel: ${hotelName} (${h.HotelCode}) in ${city.cityName}`);
                                    hotelOps.push({
                                        updateOne: {
                                            filter: { hotelCode: h.HotelCode, cityCode: city.cityCode },
                                            update: {
                                                $set: {
                                                    hotelCode: h.HotelCode,
                                                    hotelName: hotelName,
                                                    hotelAddress: h.HotelAddress || "",
                                                    starRating: h.StarRating || "",
                                                    cityCode: city.cityCode,
                                                    cityName: city.cityName,
                                                    countryCode: city.countryCode,
                                                    thumbnail: h.HotelThumbnail || "",
                                                    location: h.HotelLocation || "",
                                                },
                                            },
                                            upsert: true,
                                        },
                                    });
                                } else {
                                    // Basic equality check for essential fields to determine update vs skip
                                    const hasChanges = existing.hotelName !== hotelName || 
                                                       existing.starRating !== (h.StarRating || "") ||
                                                       existing.hotelAddress !== (h.HotelAddress || "");
                                    
                                    if (hasChanges) {
                                        logger.info(`[HOTEL SYNC] 🔄 Updating hotel: ${hotelName} (${h.HotelCode}) in ${city.cityName}`);
                                        hotelOps.push({
                                            updateOne: {
                                                filter: { hotelCode: h.HotelCode, cityCode: city.cityCode },
                                                update: {
                                                    $set: {
                                                        hotelCode: h.HotelCode,
                                                        hotelName: hotelName,
                                                        hotelAddress: h.HotelAddress || "",
                                                        starRating: h.StarRating || "",
                                                        cityCode: city.cityCode,
                                                        cityName: city.cityName,
                                                        countryCode: city.countryCode,
                                                        thumbnail: h.HotelThumbnail || "",
                                                        location: h.HotelLocation || "",
                                                    },
                                                },
                                                upsert: true,
                                            },
                                        });
                                    } else {
                                        logger.info(`[HOTEL SYNC] ⏭️ Skipping hotel: ${hotelName} (${h.HotelCode}) - No changes.`);
                                    }
                                }
                            }

                            if (hotelOps.length > 0) {
                                const result = await TBOHotel.bulkWrite(hotelOps, { ordered: false });

                                // Only count actual changes/new records to avoid misleading totals
                                const newOrModified = (result.upsertedCount || 0) + (result.insertedCount || 0);

                                // Update the real count from DB periodically instead of just adding
                                if (pageIndex % 5 === 0 || newOrModified > 0) {
                                    hotelSyncState.totalHotelsSaved = await TBOHotel.estimatedDocumentCount();
                                }

                                logger.info(`[HOTEL SYNC] ✅ ${city.cityName} (Page ${pageIndex}): Processed ${rawCount} | New: ${newOrModified} | DB Total: ${hotelSyncState.totalHotelsSaved}`);
                            }
                        }

                        // TBO TBOHotelCodeList often returns ALL hotels at once. 
                        // If rawCount is not exactly 100 (default page size), it's likely the last/only page.
                        if (rawCount < 100 || pageIndex > 500) {
                            hasMore = false;
                        } else {
                            pageIndex++;
                            await new Promise((r) => setTimeout(r, 500)); // Slightly longer delay for safety
                        }
                    } else {
                        logger.warn(`[HOTEL SYNC] ⚠️ Empty/No HotelList for ${city.cityName}`);
                        hasMore = false;
                    }
                }

                hotelSyncState.processedCities++;

                // Save Checkpoint
                await TBOSyncProgress.findOneAndUpdate({ syncType: "hotels" }, {
                    lastProcessedId: city._id,
                    processedCount: hotelSyncState.processedCities,
                    totalToProcess: hotelSyncState.totalCities,
                    status: "running",
                    lastUpdateTime: new Date()
                }, { upsert: true });
            } catch (error) {
                logger.error(
                    `[HOTEL SYNC] Error for city ${city.cityName}:`,
                    error.message,
                );
                hotelSyncState.errors.push({
                    city: city.cityName,
                    error: error.message,
                });
            }

            await new Promise((r) => setTimeout(r, 1000));
        }
        hotelSyncState.endTime = new Date();
        addLog('COMPLETE', `Hotel Code Sync completed successfully. Total cities processed: ${hotelSyncState.processedCities}. Total hotels saved: ${hotelSyncState.totalHotelsSaved}.`, ['Hotel Sync']);
    } catch (error) {
        logger.error("[HOTEL SYNC] Critical failure:", error.message);
        addLog('ERROR', 'Hotel Sync failed: ' + error.message, ['Hotel Sync']);
    } finally {
        hotelSyncState.isSyncing = false;
    }
};

/**
 * Trigger country sync
 */
exports.syncAllTboCountries = asyncHandler(async (req, res) => {
    addLog('START', `Initiated Master Country Sync to fetch the global country list from TBO API.`, ['Country Sync']);
    this.processCountrySync(); // Run in background
    res.status(202).json({ success: true, message: "Country sync started" });
});

/**
 * Trigger city sync
 */
exports.syncAllTboCities = asyncHandler(async (req, res) => {
    addLog('START', `Initiated Master City Sync to fetch all cities for all available countries.`, ['City Sync']);
    this.processCitySync(); // Run in background
    res.status(202).json({ success: true, message: "City sync started" });
});

/**
 * Trigger hotel sync
 */
exports.syncAllTboHotels = asyncHandler(async (req, res) => {
    const forceRestart = req.query.reset === 'true';
    addLog('START', `Initiated Hotel Code Sync to fetch hotel codes across all cities. Force Restart: ${forceRestart}`, ['Hotel Sync']);
    this.processHotelSync(forceRestart); // Run in background
    res.status(202).json({ success: true, message: "Hotel sync started", forceRestart });
});

exports.pauseHotelSync = asyncHandler(async (req, res) => {
    hotelSyncState.isPaused = true;
    addLog('PAUSE', `Paused Hotel Sync process.`, ['Hotel Sync']);
    res.json({ success: true, message: "Hotel sync paused successfully." });
});

exports.resumeHotelSync = asyncHandler(async (req, res) => {
    hotelSyncState.isPaused = false;
    addLog('RESUME', `Resumed Hotel Sync process.`, ['Hotel Sync']);
    res.json({ success: true, message: "Hotel sync resumed successfully." });
});

exports.cancelHotelSync = asyncHandler(async (req, res) => {
    hotelSyncState.isCancelled = true;
    hotelSyncState.isPaused = false; // Unpause to unblock loops
    addLog('CANCEL', `Cancelled Hotel Sync process by user request.`, ['Hotel Sync']);
    res.json({ success: true, message: "Hotel sync cancellation requested." });
});

exports.getSyncLogs = asyncHandler(async (req, res) => {
    const logs = await TBOSyncLog.find().sort({ createdAt: -1 }).limit(100);
    // map _id to id, createdAt to timestamp to match frontend expectation
    const formattedLogs = logs.map(log => ({
        id: log._id.toString(),
        type: log.type,
        message: log.message,
        affectedSyncs: log.affectedSyncs,
        timestamp: log.createdAt
    }));
    res.json({ success: true, logs: formattedLogs });
});

exports.getSyncStatus = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        countrySync: countrySyncState,
        citySync: citySyncState,
        hotelSync: hotelSyncState,
        hotelDetailsSync: hotelDetailsSyncState,
    });
});

/**
 * Search cities
 */
exports.searchCities = asyncHandler(async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json({ success: true, cities: [] });
    const cities = await TBOCity.find({
        cityName: { $regex: `^${query}`, $options: "i" },
    })
        .limit(20)
        .sort({ cityName: 1 });
    res.json({ success: true, cities });
});

/**
 * Search hotels locally
 */
exports.searchHotelsLocally = asyncHandler(async (req, res) => {
    const { query, cityCode } = req.query;
    const filter = {};
    if (query) filter.hotelName = { $regex: query, $options: "i" };
    if (cityCode) filter.cityCode = cityCode;

    const hotels = await TBOHotel.find(filter).limit(20).sort({ hotelName: 1 });
    res.json({ success: true, hotels });
});

/* =====================================================
   HOTEL DETAILS SYNC
====================================================== */
let hotelDetailsSyncState = {
    isSyncing: false,
    isPaused: false,
    isCancelled: false,
    totalCities: 0,
    processedCities: 0,
    totalHotelsInCity: 0,
    processedHotelsInCity: 0,
    totalDetailsSaved: 0,
    lastCity: "",
    lastHotel: "",
    errors: [],
    startTime: null,
    endTime: null,
};

/**
 * Background processor: fetch & save hotel details for every hotel in TBOHotel
 * Saves each hotel detail IMMEDIATELY as it arrives from TBO
 */
/**
 * Hierarchical Background Processor: Country > City > Hotel > Details
 * This refactored version processes details city-by-city to ensure hierarchy and better tracking.
 */
exports.processHotelDetailsSync = async (targetCityCode = null) => {
    if (hotelDetailsSyncState.isSyncing) return;
    hotelDetailsSyncState.isSyncing = true;
    hotelDetailsSyncState.isPaused = false;
    hotelDetailsSyncState.isCancelled = false;

    try {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const chunkArray = (arr, size) =>
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );

        const sortCitiesAlphabetically = (cities = []) =>
            [...cities].sort((left, right) => {
                const countryCompare = (left.countryName || "").localeCompare(
                    right.countryName || "",
                );
                if (countryCompare !== 0) return countryCompare;

                return (left.cityName || "").localeCompare(right.cityName || "");
            });

        const buildHotelDetailsPayload = (detail = {}) => ({
            hotelCode: detail.HotelCode || "",
            hotelName: detail.HotelName || "",
            description: detail.Description || "",
            address: detail.Address || "",
            pinCode: detail.PinCode || "",
            cityId: detail.CityId || "",
            cityName: detail.CityName || "",
            countryName: detail.CountryName || "",
            countryCode: detail.CountryCode || "",
            phoneNumber: detail.PhoneNumber || "",
            email: detail.Email || "",
            faxNumber: detail.FaxNumber || "",
            hotelWebsiteUrl: detail.HotelWebsiteUrl || "",
            map: detail.Map || "",
            hotelRating: detail.HotelRating || 0,
            checkInTime: detail.CheckInTime || "",
            checkOutTime: detail.CheckOutTime || "",
            image: detail.Image || "",
            images: Array.isArray(detail.Images) ? detail.Images : [],
            hotelFacilities: Array.isArray(detail.HotelFacilities)
                ? detail.HotelFacilities
                : [],
            attractions: detail.Attractions
                ? JSON.stringify(detail.Attractions)
                : "",
            hotelFees: {
                optional: detail.HotelFees?.Optional || [],
                mandatory: detail.HotelFees?.Mandatory || [],
            },
            roomDetails: Array.isArray(detail.RoomDetails)
                ? detail.RoomDetails.map((room) => ({
                    roomId: room.RoomId || 0,
                    roomName: room.RoomName || "",
                    roomSize: room.RoomSize || "",
                    roomDescription: room.RoomDescription || "",
                    imageURL: Array.isArray(room.imageURL) ? room.imageURL : [],
                }))
                : [],
        });

        const buildHotelEnrichmentPayload = (detail = {}) => ({
            hotelAddress: detail.Address || "",
            starRating: detail.HotelRating ? detail.HotelRating.toString() : "",
            thumbnail: detail.Image || "",
        });

        const mergeHotelDetails = (existing, incoming) => {
            if (!existing) return incoming;
            if (!incoming) return existing;

            const merged = { ...existing };

            for (const key in incoming) {
                const val = incoming[key];
                
                if (val === undefined || val === null || val === "") continue;
                if (Array.isArray(val) && val.length === 0) continue;
                if (key === 'hotelRating' && val === 0 && existing[key] > 0) continue;

                if (Array.isArray(val)) {
                    const existingArr = Array.isArray(existing[key]) ? existing[key] : [];

                    if (key === 'roomDetails') {
                        const roomsMap = new Map();
                        existingArr.forEach(r => {
                            if (r && r.roomId) roomsMap.set(String(r.roomId), r);
                        });
                        val.forEach(newRoom => {
                            if (!newRoom || !newRoom.roomId) return;
                            const rid = String(newRoom.roomId);
                            if (roomsMap.has(rid)) {
                                roomsMap.set(rid, mergeHotelDetails(roomsMap.get(rid), newRoom));
                            } else {
                                roomsMap.set(rid, newRoom);
                            }
                        });
                        merged[key] = Array.from(roomsMap.values());
                    } else if (key === 'hotelFacilities' || key === 'images' || key === 'optional' || key === 'mandatory' || key === 'imageURL') {
                        merged[key] = Array.from(new Set([...existingArr, ...val]));
                    } else {
                        const set = new Set();
                        const result = [];
                        [...existingArr, ...val].forEach(item => {
                            const str = typeof item === 'object' ? JSON.stringify(item) : String(item);
                            if (!set.has(str)) {
                                set.add(str);
                                result.push(item);
                            }
                        });
                        merged[key] = result;
                    }
                } else if (typeof val === 'object' && val !== null) {
                    merged[key] = mergeHotelDetails(existing[key] || {}, val);
                } else {
                    merged[key] = val;
                }
            }
            return merged;
        };

        const saveCityProgress = async (cityId, status = "running") => {
            await TBOSyncProgress.findOneAndUpdate(
                { syncType: "hotelDetails" },
                {
                    lastProcessedId: cityId ? cityId.toString() : null,
                    processedCount: hotelDetailsSyncState.processedCities,
                    totalToProcess: hotelDetailsSyncState.totalCities,
                    status,
                    lastUpdateTime: new Date(),
                },
                { upsert: true },
            );
        };

        const saveSingleHotelDetails = async (hotel) => {
            hotelDetailsSyncState.lastHotel = hotel.hotelName || hotel.hotelCode || "";

            const res = await hotelService.getStaticHotelDetails(hotel.hotelCode);
            let details = [];
            if (res?.HotelDetails) {
                details = Array.isArray(res.HotelDetails) ? res.HotelDetails : [res.HotelDetails];
            }
            const matchedDetail =
                details.find(
                    (detail) => String(detail?.HotelCode || "") === String(hotel.hotelCode),
                ) || details[0];

            if (!matchedDetail?.HotelCode) {
                logger.warn(
                    `[HOTEL DETAILS SYNC] No details returned for ${hotel.hotelCode}.`,
                );
                return false;
            }

            const incomingPayload = buildHotelDetailsPayload(matchedDetail);
            const existingDoc = await TBOHotelDetails.findOne({ hotelCode: matchedDetail.HotelCode }).lean();
            const mergedPayload = mergeHotelDetails(existingDoc || {}, incomingPayload);
            delete mergedPayload._id;
            delete mergedPayload.__v;

            await Promise.all([
                TBOHotelDetails.findOneAndUpdate(
                    { hotelCode: matchedDetail.HotelCode },
                    { $set: mergedPayload },
                    { upsert: true },
                ),
                TBOHotel.updateOne(
                    { hotelCode: matchedDetail.HotelCode },
                    { $set: buildHotelEnrichmentPayload(matchedDetail) },
                )
            ]);

            hotelDetailsSyncState.totalDetailsSaved += 1;
            logger.info(
                `[HOTEL DETAILS SYNC] Individual save success: ${matchedDetail.HotelCode}`,
            );

            return true;
        };

        let cities;
        if (targetCityCode) {
            cities = await TBOCity.find({ cityCode: targetCityCode }).lean();
        } else {
            const allCities = await TBOCity.find({}).lean();
            cities = sortCitiesAlphabetically(allCities);
        }

        hotelDetailsSyncState.totalCities = cities.length;
        hotelDetailsSyncState.processedCities = 0;
        hotelDetailsSyncState.totalHotelsInCity = 0;
        hotelDetailsSyncState.processedHotelsInCity = 0;
        hotelDetailsSyncState.totalDetailsSaved =
            await TBOHotelDetails.estimatedDocumentCount();
        hotelDetailsSyncState.errors = [];
        hotelDetailsSyncState.startTime = new Date();
        hotelDetailsSyncState.endTime = null;
        addLog('START', 'Hotel Details Sync process started.', ['Hotel Details Sync']);

        await saveCityProgress(null, "running");

        logger.info(
            `[HOTEL DETAILS SYNC] Started sync for ${cities.length} cities processing in alphabetical order.`,
        );

        let lastProgressSaveTime = 0;

        for (const city of cities) {
            if (hotelDetailsSyncState.isCancelled) {
                logger.warn("[HOTEL DETAILS SYNC] Cancelled by user.");
                break;
            }
            while (hotelDetailsSyncState.isPaused && !hotelDetailsSyncState.isCancelled) {
                await new Promise((r) => setTimeout(r, 2000));
            }
            hotelDetailsSyncState.lastCity = `${city.cityName}, ${city.countryName}`;
            hotelDetailsSyncState.lastHotel = "";

            // Use .select() to vastly reduce memory footprint and db read time
            const hotels = await TBOHotel.find({ cityCode: city.cityCode })
                .select("hotelCode hotelName")
                .lean();

            hotelDetailsSyncState.totalHotelsInCity = hotels.length;
            hotelDetailsSyncState.processedHotelsInCity = 0;

            if (hotels.length === 0) {
                logger.info(
                    `[HOTEL DETAILS SYNC] Skipping ${city.cityName} - No hotels found in TBOHotel.`,
                );
                hotelDetailsSyncState.processedCities++;
                const now = Date.now();
                if (now - lastProgressSaveTime > 1000) {
                    await saveCityProgress(city._id);
                    lastProgressSaveTime = now;
                }
                continue;
            }

            const hotelCodesInCity = hotels
                .map((hotel) => String(hotel.hotelCode || ""))
                .filter(Boolean);

            // Use distinct directly for optimal DB performance
            const existingDetailsCodes = await TBOHotelDetails.distinct("hotelCode", {
                hotelCode: { $in: hotelCodesInCity },
            });
            const existingDetailsCodeSet = new Set(
                existingDetailsCodes.map((code) => String(code)),
            );

            const hotelsToSync = hotels.filter(
                (hotel) =>
                    hotel.hotelCode &&
                    !existingDetailsCodeSet.has(String(hotel.hotelCode)),
            );

            hotelDetailsSyncState.processedHotelsInCity =
                hotels.length - hotelsToSync.length;

            if (hotelsToSync.length === 0) {
                logger.info(
                    `[HOTEL DETAILS SYNC] Skipping ${city.cityName} - All ${hotels.length} hotels already have details.`,
                );
                hotelDetailsSyncState.processedCities++;
                const now = Date.now();
                if (now - lastProgressSaveTime > 1000) {
                    await saveCityProgress(city._id);
                    lastProgressSaveTime = now;
                }
                continue;
            }

            // Record progress before processing an actual active city
            await saveCityProgress(city._id);
            lastProgressSaveTime = Date.now();

            logger.info(
                `[HOTEL DETAILS SYNC] Processing ${city.cityName}: ${hotelsToSync.length} missing out of ${hotels.length} total.`,
            );

            const batchSize = 20; // Increased batch size for faster processing
            const batches = chunkArray(hotelsToSync, batchSize);
            const CONCURRENCY_LIMIT = 5; // Process up to 5 batches concurrently
            const batchChunks = chunkArray(batches, CONCURRENCY_LIMIT);

            for (let i = 0; i < batchChunks.length; i++) {
                const chunk = batchChunks[i];
                await Promise.all(chunk.map(async (batch) => {
                    const hotelCodes = batch
                        .map((hotel) => hotel.hotelCode)
                        .filter(Boolean)
                        .join(",");

                    if (!hotelCodes) {
                        hotelDetailsSyncState.processedHotelsInCity += batch.length;
                        return;
                    }

                    try {
                        hotelDetailsSyncState.lastHotel =
                            batch[0].hotelName || batch[0].hotelCode || "";

                        const res = await hotelService.getStaticHotelDetails(hotelCodes);
                        let returnedDetailsRaw = [];
                        if (res?.HotelDetails) {
                            returnedDetailsRaw = Array.isArray(res.HotelDetails) ? res.HotelDetails : [res.HotelDetails];
                        }
                        const returnedDetails = returnedDetailsRaw.filter((detail) => detail?.HotelCode);
                        const batchHotelCodes = new Set(
                            batch.map((hotel) => String(hotel.hotelCode)),
                        );

                        const matchedDetails = returnedDetails.filter((detail) =>
                            batchHotelCodes.has(String(detail.HotelCode)),
                        );

                        const returnedHotelCodeSet = new Set(
                            matchedDetails.map((detail) => String(detail.HotelCode)),
                        );

                        const existingDocs = await TBOHotelDetails.find({ hotelCode: { $in: Array.from(returnedHotelCodeSet) } }).lean();
                        const existingMap = new Map(existingDocs.map(doc => [String(doc.hotelCode), doc]));

                        const detailOps = matchedDetails.map((detail) => {
                            const incomingPayload = buildHotelDetailsPayload(detail);
                            const existingDoc = existingMap.get(String(detail.HotelCode)) || {};
                            const mergedPayload = mergeHotelDetails(existingDoc, incomingPayload);
                            delete mergedPayload._id;
                            delete mergedPayload.__v;

                            return {
                                updateOne: {
                                    filter: { hotelCode: detail.HotelCode },
                                    update: { $set: mergedPayload },
                                    upsert: true,
                                },
                            };
                        });

                        const enrichmentOps = matchedDetails.map((detail) => ({
                            updateOne: {
                                filter: { hotelCode: detail.HotelCode },
                                update: { $set: buildHotelEnrichmentPayload(detail) },
                            },
                        }));

                        const dbPromises = [];
                        if (detailOps.length > 0) {
                            dbPromises.push(TBOHotelDetails.bulkWrite(detailOps, { ordered: false }));
                        }
                        if (enrichmentOps.length > 0) {
                            dbPromises.push(TBOHotel.bulkWrite(enrichmentOps, { ordered: false }));
                        }
                        await Promise.all(dbPromises);

                        hotelDetailsSyncState.totalDetailsSaved += detailOps.length;

                        const missingHotels = batch.filter(
                            (hotel) => !returnedHotelCodeSet.has(String(hotel.hotelCode)),
                        );

                        if (missingHotels.length > 0) {
                            logger.warn(
                                `[HOTEL DETAILS SYNC] Batch returned ${matchedDetails.length}/${batch.length} details for ${city.cityName}. Retrying ${missingHotels.length} missing hotels individually.`,
                            );

                            const missingChunks = chunkArray(missingHotels, 5);
                            for (const mChunk of missingChunks) {
                                await Promise.all(mChunk.map(async (hotel) => {
                                    try {
                                        await saveSingleHotelDetails(hotel);
                                    } catch (retryError) {
                                        logger.error(
                                            `[HOTEL DETAILS SYNC] Individual retry failed for ${hotel.hotelCode}: ${retryError.message}`,
                                        );
                                        hotelDetailsSyncState.errors.push({
                                            city: city.cityName,
                                            hotelCode: hotel.hotelCode,
                                            error: retryError.message,
                                        });
                                    }
                                }));
                                await wait(50);
                            }
                        }

                        hotelDetailsSyncState.processedHotelsInCity += batch.length;

                        logger.info(
                            `[HOTEL DETAILS SYNC] ${city.cityName} (Batch processed): processed ${batch.length}, total saved ${hotelDetailsSyncState.totalDetailsSaved}.`,
                        );
                    } catch (error) {
                        logger.warn(
                            `[HOTEL DETAILS SYNC] Batch failed for ${city.cityName} starting with ${batch[0].hotelCode} (${error.message}). Retrying individually.`,
                        );

                        const missingChunks = chunkArray(batch, 5);
                        for (const mChunk of missingChunks) {
                            await Promise.all(mChunk.map(async (hotel) => {
                                try {
                                    await saveSingleHotelDetails(hotel);
                                } catch (retryError) {
                                    logger.error(
                                        `[HOTEL DETAILS SYNC] Individual retry failed for ${hotel.hotelCode}: ${retryError.message}`,
                                    );
                                    hotelDetailsSyncState.errors.push({
                                        city: city.cityName,
                                        hotelCode: hotel.hotelCode,
                                        error: retryError.message,
                                    });
                                }
                            }));
                            await wait(50);
                        }

                        hotelDetailsSyncState.processedHotelsInCity += batch.length;
                    }
                }));

                await wait(200); // Small delay between concurrent chunks to respect rate limits
            }

            hotelDetailsSyncState.processedCities++;
            const endNow = Date.now();
            if (endNow - lastProgressSaveTime > 1000) {
                await saveCityProgress(city._id);
                lastProgressSaveTime = endNow;
            }
        }

        hotelDetailsSyncState.endTime = new Date();
        hotelDetailsSyncState.totalDetailsSaved =
            await TBOHotelDetails.estimatedDocumentCount();
        await saveCityProgress(null, "completed");
        addLog('COMPLETE', `Hotel Details Sync completed successfully. Total hotel details saved: ${hotelDetailsSyncState.totalDetailsSaved}.`, ['Hotel Details Sync']);
        logger.info(
            `[HOTEL DETAILS SYNC] Complete. Total hotel details in DB: ${hotelDetailsSyncState.totalDetailsSaved}.`,
        );
    } catch (error) {
        logger.error("[HOTEL DETAILS SYNC] Critical failure:", error.message);
        await TBOSyncProgress.findOneAndUpdate(
            { syncType: "hotelDetails" },
            {
                processedCount: hotelDetailsSyncState.processedCities,
                totalToProcess: hotelDetailsSyncState.totalCities,
                status: "failed",
                lastUpdateTime: new Date(),
            },
            { upsert: true },
        );
    } finally {
        hotelDetailsSyncState.isSyncing = false;
    }
};

/**
 * Trigger hotel details sync
 * Can optionally take a cityCode to sync only that city
 */
exports.syncAllTboHotelDetails = asyncHandler(async (req, res) => {
    const { cityCode } = req.query;
    if (hotelDetailsSyncState.isSyncing) {
        return res.status(409).json({ success: false, message: "Hotel details sync is already running" });
    }
    addLog('START', `Initiated Detailed Hotel Data Sync for ${cityCode ? 'city ' + cityCode : 'all global cities'}.`, ['Hotel Details Sync']);
    this.processHotelDetailsSync(cityCode);
    res.status(202).json({ success: true, message: cityCode ? `Sync started for city ${cityCode}` : "Hierarchical details sync started" });
});

/**
 * MASTER SYNC: Country > City > Hotel Code > Hotel Details
 * Triggers the entire chain in sequence for the whole world.
 */
exports.processMasterSync = async () => {
    logger.info("[MASTER SYNC] 🚀 Starting Full Chain Sync...");

    // 1. Sync Cities
    await this.processCitySync();

    // 2. Sync Hotel Codes
    await this.processHotelSync();

    // 3. Sync Hotel Details
    await this.processHotelDetailsSync();

    logger.info("[MASTER SYNC] 🎉 FULL CHAIN COMPLETE!");
};

exports.triggerMasterSync = asyncHandler(async (req, res) => {
    this.processMasterSync();
    res.status(202).json({ success: true, message: "Master sync chain started" });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIRLINE SEED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/tbo-sync/seed-airlines
 * Reads airlines_iata_only.json from the convert folder and bulk-upserts
 * every record into the Airline collection. Safe to run multiple times
 * (uses iata + icao as the unique key via upsert).
 */
exports.seedAirlines = asyncHandler(async (req, res) => {
    const jsonPath = path.resolve(
        __dirname,
        "../../convert/airlines_iata_only.json"
    );

    if (!fs.existsSync(jsonPath)) {
        return res.status(404).json({
            success: false,
            message: `airlines_iata_only.json not found at ${jsonPath}`,
        });
    }

    const raw = fs.readFileSync(jsonPath, "utf-8");
    const airlines = JSON.parse(raw);

    if (!Array.isArray(airlines) || airlines.length === 0) {
        return res.status(400).json({
            success: false,
            message: "JSON file is empty or not a valid array",
        });
    }

    logger.info(`[AIRLINE SEED] Starting seed for ${airlines.length} airlines...`);

    // Build bulk operations — upsert on iata + icao
    const ops = airlines.map((a) => ({
        updateOne: {
            filter: { iata: (a.iata || "").trim().toUpperCase(), icao: a.icao ? a.icao.trim().toUpperCase() : null },
            update: {
                $set: {
                    sourceId: a.id ? String(a.id) : null,
                    name: (a.name || "").trim(),
                    alias: a.alias ? String(a.alias).trim() : null,
                    iata: (a.iata || "").trim().toUpperCase(),
                    icao: a.icao ? a.icao.trim().toUpperCase() : null,
                    callsign: a.callsign ? String(a.callsign).trim() : null,
                    country: a.country ? String(a.country).trim() : null,
                },
            },
            upsert: true,
        },
    }));

    const BATCH_SIZE = 500;
    let inserted = 0;
    let updated = 0;
    let errors = [];

    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
        const batch = ops.slice(i, i + BATCH_SIZE);
        try {
            const result = await Airline.bulkWrite(batch, { ordered: false });
            inserted += result.upsertedCount || 0;
            updated += result.modifiedCount || 0;
        } catch (err) {
            logger.error(`[AIRLINE SEED] Batch error at offset ${i}: ${err.message}`);
            errors.push({ offset: i, message: err.message });
        }
    }

    logger.info(`[AIRLINE SEED] Done — inserted: ${inserted}, updated: ${updated}, errors: ${errors.length}`);

    return res.status(200).json({
        success: true,
        message: "Airline seed complete",
        stats: {
            total: airlines.length,
            inserted,
            updated,
            errorBatches: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
    });
});

/**
 * GET /api/tbo-sync/seed-airlines/status
 * Returns the current count of airlines stored in the DB.
 */
exports.getSeedAirlinesStatus = asyncHandler(async (req, res) => {
    const total = await Airline.countDocuments();
    const active = await Airline.countDocuments({ active: true });
    return res.status(200).json({
        success: true,
        data: {
            totalAirlines: total,
            activeAirlines: active,
            inactiveAirlines: total - active,
        },
    });
});

/**
 * POST /api/tbo-sync/seed-airports
 * Seeds the airportDatabase.js file into the Airport collection.
 * Skips existing airports by matching their iata_code.
 */
exports.seedAirports = asyncHandler(async (req, res) => {
    logger.info("[AIRPORT SEED] Starting seed for airports from local file...");

    const filePath = path.join(__dirname, "../../convert/airportDatabase.js");
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            message: "Airport database file not found.",
        });
    }

    try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        // Strip the export declaration
        const arrayString = fileContent.replace("export const airportDatabase =", "").trim().replace(/;$/, "");
        
        // Parse the JS array safely
        const airportData = eval(`(${arrayString})`);

        if (!Array.isArray(airportData) || airportData.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Airport data is empty or invalid.",
            });
        }

        const BATCH_SIZE = 500;
        let inserted = 0;
        let skipped = 0;
        let errors = [];

        logger.info(`[AIRPORT SEED] Found ${airportData.length} airports in file. Processing in batches of ${BATCH_SIZE}...`);

        for (let i = 0; i < airportData.length; i += BATCH_SIZE) {
            const batch = airportData.slice(i, i + BATCH_SIZE);
            const operations = batch.map((airport) => ({
                updateOne: {
                    filter: { iata_code: airport.iata_code },
                    update: {
                        $setOnInsert: {
                            name: airport.name,
                            city: airport.city,
                            country: airport.country,
                            iata_code: airport.iata_code,
                        },
                    },
                    upsert: true,
                },
            }));

            try {
                const result = await Airport.bulkWrite(operations, { ordered: false });
                inserted += result.upsertedCount;
                // Since we only use $setOnInsert, any existing document won't be modified.
                skipped += batch.length - result.upsertedCount; 
            } catch (error) {
                logger.error(`[AIRPORT SEED] Batch error at index ${i}:`, error.message);
                errors.push({ batchStart: i, message: error.message });
            }
        }

        logger.info(`[AIRPORT SEED] Done — inserted: ${inserted}, skipped: ${skipped}, errors: ${errors.length}`);

        return res.status(200).json({
            success: true,
            message: "Airport seeding completed",
            stats: {
                totalInFile: airportData.length,
                inserted,
                skipped,
                errorBatches: errors.length,
            },
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        logger.error("[AIRPORT SEED] Error reading or parsing airport database:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to parse airport database.",
            error: error.message,
        });
    }
});