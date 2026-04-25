const TBOCity = require("../models/TBOCity");
const TBOHotel = require("../models/TBOHotel");
const TBOHotelDetails = require("../models/TBOHotelDetails");
const TBOSyncProgress = require("../models/TBOSyncProgress");
const hotelService = require("../services/tektravels/hotel.service");
const logger = require("../utils/logger");
const asyncHandler = require("../utils/asyncHandler");

// Global sync states
let citySyncState = {
  isSyncing: false,
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
 * Background processor for city synchronization
 */
exports.processCitySync = async () => {
  if (citySyncState.isSyncing) return;
  citySyncState.isSyncing = true;
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
          const cityOperations = cityRes.CityList.map((city) => ({
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
          }));

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
    return true; // Finished successfully
  } catch (error) {
    logger.error("[CITY SYNC] Critical failure:", error.message);
    return false;
  } finally {
    citySyncState.isSyncing = false;
  }
};

/**
 * Background processor for hotel synchronization
 */
exports.processHotelSync = async () => {
  if (hotelSyncState.isSyncing) return;
  hotelSyncState.isSyncing = true;
  try {
    // Resume from checkpoint if exists
    const progress = await TBOSyncProgress.findOne({ syncType: "hotels" });
    let startFromId = progress?.lastProcessedId || null;
    
    const query = startFromId ? { _id: { $gt: startFromId } } : {};
    const cities = await TBOCity.find(query).sort({ _id: 1 });
    
    hotelSyncState.totalCities = await TBOCity.countDocuments({});
    hotelSyncState.processedCities = progress?.processedCount || 0;
    hotelSyncState.totalHotelsSaved = await TBOHotel.countDocuments({});
    hotelSyncState.errors = [];
    hotelSyncState.startTime = new Date();

    logger.info(`[HOTEL SYNC] Started. Resume index: ${hotelSyncState.processedCities}/${hotelSyncState.totalCities}`);

    for (const city of cities) {
      try {
        hotelSyncState.lastCity = `${city.cityName}, ${city.countryName}`;
        
        // OPTIMIZATION: Check if this city already has hotels in our DB
        // If it does, we skip the API call for this city to save time and API quota.
        const existingHotelCount = await TBOHotel.countDocuments({ cityCode: city.cityCode });
        if (existingHotelCount > 0) {
          logger.info(`[HOTEL SYNC] ⏭️ Skipping ${city.cityName} - Already have ${existingHotelCount} hotels.`);
          hotelSyncState.processedCities++;
          hotelSyncState.totalHotelsSaved += existingHotelCount;
          continue;
        }

        let pageIndex = 1;
        let hasMore = true;
        let previousBatchSignature = "";

        while (hasMore) {
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
              const hotelOps = hotelList
                .filter(h => h.HotelCode)
                .map((h) => ({
                updateOne: {
                  filter: { hotelCode: h.HotelCode, cityCode: city.cityCode },
                  update: {
                    $set: {
                      hotelCode: h.HotelCode,
                      hotelName: h.HotelName || "",
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
              }));

              if (hotelOps.length > 0) {
                const result = await TBOHotel.bulkWrite(hotelOps, { ordered: false });
                
                // Only count actual changes/new records to avoid misleading totals
                const newOrModified = (result.upsertedCount || 0) + (result.insertedCount || 0);
                
                // Update the real count from DB periodically instead of just adding
                if (pageIndex % 5 === 0 || newOrModified > 0) {
                  hotelSyncState.totalHotelsSaved = await TBOHotel.countDocuments({});
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
        await TBOSyncProgress.findOneAndUpdate(
          { syncType: "hotels" },
          { 
            lastProcessedId: city._id,
            processedCount: hotelSyncState.processedCities,
            totalToProcess: hotelSyncState.totalCities,
            status: "running",
            lastUpdateTime: new Date()
          },
          { upsert: true }
        );
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
  } catch (error) {
    logger.error("[HOTEL SYNC] Critical failure:", error.message);
  } finally {
    hotelSyncState.isSyncing = false;
  }
};

/**
 * Trigger city sync
 */
exports.syncAllTboCities = asyncHandler(async (req, res) => {
  this.processCitySync(); // Run in background
  res.status(202).json({ success: true, message: "City sync started" });
});

/**
 * Trigger hotel sync
 */
exports.syncAllTboHotels = asyncHandler(async (req, res) => {
  this.processHotelSync(); // Run in background
  res.status(202).json({ success: true, message: "Hotel sync started" });
});

exports.getSyncStatus = asyncHandler(async (req, res) => {
  res.json({
    success: true,
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

  try {
    // 1. Get cities to process - PRIORITIZE INDIA
    let cities;
    if (targetCityCode) {
      cities = await TBOCity.find({ cityCode: targetCityCode });
    } else {
      logger.info("[HOTEL DETAILS SYNC] Fetching India cities first...");
      const indiaCities = await TBOCity.find({ countryCode: "IN" }).sort({ cityName: 1 });
      const otherCities = await TBOCity.find({ countryCode: { $ne: "IN" } }).sort({ countryName: 1, cityName: 1 });
      cities = [...indiaCities, ...otherCities];
    }
    
    hotelDetailsSyncState.totalCities = cities.length;
    hotelDetailsSyncState.processedCities = 0;
    hotelDetailsSyncState.totalDetailsSaved = await TBOHotelDetails.countDocuments({});
    hotelDetailsSyncState.errors = [];
    hotelDetailsSyncState.startTime = new Date();

    logger.info(`[HOTEL DETAILS SYNC] Started optimized sync for ${cities.length} cities (India prioritized).`);

    for (const city of cities) {
      hotelDetailsSyncState.lastCity = `${city.cityName}, ${city.countryName}`;
      
      // 2. Get all hotels for this city from our local DB
      const hotels = await TBOHotel.find({ cityCode: city.cityCode }).lean();
      if (hotels.length > 0) {
        // Find hotel codes in this city that already have details
        const hotelCodesInCity = hotels.map(h => h.hotelCode);
        const existingDetailsCodes = await TBOHotelDetails.find({ 
          hotelCode: { $in: hotelCodesInCity } 
        }).distinct("hotelCode");

        // Filter out hotels that already have details
        const hotelsToSync = hotels.filter(h => !existingDetailsCodes.includes(h.hotelCode));

        if (hotelsToSync.length === 0) {
          logger.info(`[HOTEL DETAILS SYNC] ⏭️ Skipping ${city.cityName} - All ${hotels.length} hotels already have details.`);
          hotelDetailsSyncState.processedCities++;
          hotelDetailsSyncState.processedHotelsInCity = hotels.length;
          continue;
        }

        logger.info(`[HOTEL DETAILS SYNC] 🔄 Processing ${city.cityName}: ${hotelsToSync.length} new/missing out of ${hotels.length} total.`);
        hotelDetailsSyncState.totalHotelsInCity = hotels.length;
        hotelDetailsSyncState.processedHotelsInCity = hotels.length - hotelsToSync.length;

        // OPTIMIZATION: Process hotels in batches of 10 (TBO Static API can struggle with larger batches)
        const batchSize = 10;
        for (let i = 0; i < hotelsToSync.length; i += batchSize) {
          const batch = hotelsToSync.slice(i, i + batchSize);
          const hotelCodes = batch.map(h => h.hotelCode).join(",");

          try {
            hotelDetailsSyncState.lastHotel = `Batch: ${batch[0].hotelName || batch[0].hotelCode} (+${batch.length - 1} more)`;

            const res = await hotelService.getStaticHotelDetails(hotelCodes);

            if (res && res.HotelDetails && Array.isArray(res.HotelDetails)) {
// ... (rest of the logic remains same)
              if (detailOps.length > 0) {
                await TBOHotelDetails.bulkWrite(detailOps, { ordered: false });
                await TBOHotel.bulkWrite(enrichmentOps, { ordered: false });
                hotelDetailsSyncState.totalDetailsSaved += detailOps.length;
              }
            }

            hotelDetailsSyncState.processedHotelsInCity += batch.length;
            
            logger.info(`[HOTEL DETAILS SYNC] ✅ ${city.cityName} (Batch ${Math.floor(i / batchSize) + 1}): Processed ${batch.length} | DB Total: ${hotelDetailsSyncState.totalDetailsSaved}`);

            // Respect TBO rate limits - with batching we can afford a smaller delay
            await new Promise(r => setTimeout(r, 500));
          } catch (error) {
            logger.warn(`[HOTEL DETAILS SYNC] ⚠️ Batch failed starting ${batch[0].hotelCode} (${error.message}). Retrying individually...`);
            
            for (const hotel of batch) {
              try {
                const res = await hotelService.getStaticHotelDetails(hotel.hotelCode);
                
                if (res && res.HotelDetails && Array.isArray(res.HotelDetails) && res.HotelDetails.length > 0) {
                  const d = res.HotelDetails[0];
                  
                  // Save individual record
                  await TBOHotelDetails.findOneAndUpdate(
                    { hotelCode: d.HotelCode },
                    {
                      $set: {
                        hotelCode:       d.HotelCode,
                        hotelName:       d.HotelName        || "",
                        description:     d.Description      || "",
                        address:         d.Address          || "",
                        pinCode:         d.PinCode          || "",
                        cityId:          d.CityId           || "",
                        cityName:        d.CityName         || "",
                        countryName:     d.CountryName      || "",
                        countryCode:     d.CountryCode      || "",
                        phoneNumber:     d.PhoneNumber      || "",
                        email:           d.Email            || "",
                        faxNumber:       d.FaxNumber        || "",
                        hotelWebsiteUrl: d.HotelWebsiteUrl  || "",
                        map:             d.Map              || "",
                        hotelRating:     d.HotelRating      || 0,
                        checkInTime:     d.CheckInTime      || "",
                        checkOutTime:    d.CheckOutTime     || "",
                        image:           d.Image            || "",
                        images:          Array.isArray(d.Images) ? d.Images : [],
                        hotelFacilities: Array.isArray(d.HotelFacilities) ? d.HotelFacilities : [],
                        attractions:     d.Attractions ? JSON.stringify(d.Attractions) : "",
                        hotelFees: {
                          optional:  d.HotelFees?.Optional  || [],
                          mandatory: d.HotelFees?.Mandatory || [],
                        },
                        roomDetails: Array.isArray(d.RoomDetails)
                          ? d.RoomDetails.map(r => ({
                              roomId:          r.RoomId          || 0,
                              roomName:        r.RoomName        || "",
                              roomSize:        r.RoomSize        || "",
                              roomDescription: r.RoomDescription || "",
                              imageURL:        Array.isArray(r.imageURL) ? r.imageURL : [],
                            }))
                          : [],
                      },
                    },
                    { upsert: true }
                  );

                  // Individual Enrichment
                  await TBOHotel.updateOne(
                    { hotelCode: d.HotelCode },
                    {
                      $set: {
                        hotelAddress: d.Address || "",
                        starRating: d.HotelRating ? d.HotelRating.toString() : "",
                        thumbnail: d.Image || "",
                      },
                    }
                  );

                  hotelDetailsSyncState.totalDetailsSaved++;
                  logger.info(`[HOTEL DETAILS SYNC] ✅ Individual Retry Success: ${d.HotelCode}`);
                }
              } catch (retryError) {
                logger.error(`[HOTEL DETAILS SYNC] ❌ Individual Retry Failed for ${hotel.hotelCode}: ${retryError.message}`);
                hotelDetailsSyncState.errors.push({ hotelCode: hotel.hotelCode, error: retryError.message });
              }
              
              // Small delay between individual retries to be safe
              await new Promise(r => setTimeout(r, 200));
            }
            hotelDetailsSyncState.processedHotelsInCity += batch.length;
          }
        }
      }

      hotelDetailsSyncState.processedCities++;
      
      // Save progress checkpoint at city level
      await TBOSyncProgress.findOneAndUpdate(
        { syncType: "hotelDetails" },
        { 
          lastProcessedId: city._id,
          processedCount: hotelDetailsSyncState.processedCities,
          totalToProcess: hotelDetailsSyncState.totalCities,
          status: "running",
          lastUpdateTime: new Date()
        },
        { upsert: true }
      );
    }

    hotelDetailsSyncState.endTime = new Date();
    await TBOSyncProgress.findOneAndUpdate({ syncType: "hotelDetails" }, { status: "completed" });
    logger.info(`[HOTEL DETAILS SYNC] 🎉 OPTIMIZED COMPLETE! Saved ${hotelDetailsSyncState.totalDetailsSaved} total hotel details.`);
  } catch (error) {
    logger.error("[HOTEL DETAILS SYNC] Critical failure:", error.message);
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
