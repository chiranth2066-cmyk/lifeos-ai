import { fetchWeatherForecast } from "./weather";
import { lookupLocationOnMap } from "./maps";
import type {
  TravelDayPlan,
  TravelHotelOption,
  TravelPlace,
  TravelPlanResult,
  TravelTransportOption,
} from "@/types/modules";

interface DestinationPreset {
  attractions: Array<{ name: string; area: string; cost: number; rating: number; notes: string }>;
  restaurants: Array<{ name: string; area: string; cost: number; rating: number; notes: string }>;
  hotels: Array<{ name: string; area: string; pricePerNight: number; rating: number; amenities: string[]; distance: string }>;
  baseBusFare: number;
  baseFlightFare: number;
  baseTrainFare: number;
}

const DESTINATION_CATALOG: Record<string, DestinationPreset> = {
  goa: {
    baseBusFare: 1200,
    baseTrainFare: 850,
    baseFlightFare: 3400,
    hotels: [
      {
        name: "Baga Breeze Boutique Stay",
        area: "Baga, North Goa",
        pricePerNight: 1850,
        rating: 4.5,
        amenities: ["Wi-Fi", "AC", "Breakfast", "Pool"],
        distance: "600m from Baga Beach",
      },
      {
        name: "Anjuna Palm Courtyard",
        area: "Anjuna, North Goa",
        pricePerNight: 2300,
        rating: 4.7,
        amenities: ["Wi-Fi", "AC", "Scooter Rental Desk", "Cafe"],
        distance: "900m from Anjuna Beach",
      },
      {
        name: "Palolem Cove Guesthouse",
        area: "Palolem, South Goa",
        pricePerNight: 1550,
        rating: 4.4,
        amenities: ["Wi-Fi", "AC", "Garden", "Beach Access"],
        distance: "350m from Palolem Beach",
      },
    ],
    restaurants: [
      { name: "Vinayak Family Restaurant", area: "Assagao", cost: 450, rating: 4.6, notes: "Goan fish thali & coastal curries" },
      { name: "Artjuna Garden Cafe", area: "Anjuna", cost: 500, rating: 4.5, notes: "All-day breakfast, bowls & coffee" },
      { name: "Martin's Corner", area: "Betalbatim", cost: 700, rating: 4.6, notes: "Classic Goan seafood & live music" },
      { name: "Britto's Beach Shack", area: "Baga", cost: 650, rating: 4.3, notes: "Beachfront sunset dining" },
      { name: "Baba Au Rhum", area: "Anjuna", cost: 550, rating: 4.6, notes: "Artisan bakery & wood-fired pizza" },
    ],
    attractions: [
      { name: "Fort Aguada & Lighthouse", area: "Sinquerim", cost: 50, rating: 4.6, notes: "17th-century Portuguese sea fort" },
      { name: "Chapora Fort Sunset Point", area: "Vagator", cost: 0, rating: 4.5, notes: "Panoramic cliff views over Vagator" },
      { name: "Fontainhas Latin Quarter Walk", area: "Panaji", cost: 250, rating: 4.7, notes: "Heritage Portuguese streets & bakeries" },
      { name: "Dudhsagar / Spice Plantation Tour", area: "Ponda", cost: 900, rating: 4.5, notes: "Guided spice farm & lunch" },
      { name: "Baga to Calangute Coastal Walk", area: "North Goa", cost: 0, rating: 4.3, notes: "Evening beach walk & local markets" },
    ],
  },
  mumbai: {
    baseBusFare: 1100,
    baseTrainFare: 780,
    baseFlightFare: 3200,
    hotels: [
      {
        name: "Colaba Heritage Inn",
        area: "Colaba",
        pricePerNight: 2600,
        rating: 4.4,
        amenities: ["Wi-Fi", "AC", "Breakfast"],
        distance: "500m from Gateway of India",
      },
      {
        name: "Bandra West Urban Loft",
        area: "Bandra",
        pricePerNight: 3100,
        rating: 4.7,
        amenities: ["Wi-Fi", "AC", "Workspace", "Cafe"],
        distance: "1.1km from Bandstand",
      },
      {
        name: "Andheri Express Suites",
        area: "Andheri East",
        pricePerNight: 1950,
        rating: 4.2,
        amenities: ["Wi-Fi", "AC", "Metro Access"],
        distance: "300m from Metro",
      },
    ],
    restaurants: [
      { name: "Britannia & Co.", area: "Ballard Estate", cost: 650, rating: 4.6, notes: "Iconic Parsi berry pulao" },
      { name: "Candies", area: "Bandra West", cost: 450, rating: 4.5, notes: "Terrace cafe & quick bites" },
      { name: "Kyani & Co.", area: "Marine Lines", cost: 250, rating: 4.4, notes: "Heritage Irani chai & bun maska" },
    ],
    attractions: [
      { name: "Gateway of India & Marine Drive", area: "South Mumbai", cost: 0, rating: 4.7, notes: "Evening promenade walk" },
      { name: "Elephanta Caves Ferry", area: "Mumbai Harbour", cost: 350, rating: 4.5, notes: "UNESCO rock-cut temples" },
      { name: "Kala Ghoda Art District", area: "Fort", cost: 150, rating: 4.6, notes: "Museums & colonial architecture" },
    ],
  },
};

function getPresetForDestination(destination: string): DestinationPreset {
  const key = destination.toLowerCase();
  if (key.includes("goa")) return DESTINATION_CATALOG.goa;
  if (key.includes("mumbai")) return DESTINATION_CATALOG.mumbai;

  return {
    baseBusFare: 1150,
    baseTrainFare: 820,
    baseFlightFare: 3600,
    hotels: [
      {
        name: `${destination} Central Boutique Hotel`,
        area: `Central ${destination}`,
        pricePerNight: 2100,
        rating: 4.5,
        amenities: ["Wi-Fi", "AC", "Breakfast"],
        distance: "1.2km from City Center",
      },
      {
        name: `${destination} Backpacker & Private Rooms`,
        area: `Old Town, ${destination}`,
        pricePerNight: 1400,
        rating: 4.3,
        amenities: ["Wi-Fi", "AC", "Lounge"],
        distance: "800m from Transit Hub",
      },
      {
        name: `${destination} Comfort Suites`,
        area: `Lakeside, ${destination}`,
        pricePerNight: 2750,
        rating: 4.7,
        amenities: ["Wi-Fi", "AC", "Breakfast", "Gym"],
        distance: "1.5km from Landmark District",
      },
    ],
    restaurants: [
      { name: `${destination} Spice Kitchen`, area: "City Center", cost: 450, rating: 4.5, notes: "Regional specialties" },
      { name: `Artisan Roasters & Bistro`, area: "Downtown", cost: 400, rating: 4.6, notes: "Specialty coffee & meals" },
      { name: `Heritage Courtyard Dining`, area: "Old Quarter", cost: 600, rating: 4.4, notes: "Traditional dinner experience" },
    ],
    attractions: [
      { name: `${destination} Heritage Walk`, area: "Old Town", cost: 150, rating: 4.6, notes: "Guided cultural trail" },
      { name: `${destination} Sunset Viewpoint`, area: "Scenic Ridge", cost: 100, rating: 4.7, notes: "Golden-hour panoramic views" },
      { name: `Local Artisan Market`, area: "Main Bazaar", cost: 0, rating: 4.4, notes: "Crafts, snacks & souvenirs" },
    ],
  };
}

export async function generateTravelPlan(params: {
  origin: string;
  destination: string;
  days: number;
  travelers: number;
  budgetLimit: number;
  currency?: string;
}): Promise<TravelPlanResult> {
  const origin = params.origin || "Bengaluru";
  const destination = params.destination || "Goa";
  const days = Math.min(Math.max(params.days || 3, 1), 10);
  const travelers = Math.min(Math.max(params.travelers || 2, 1), 12);
  const currency = params.currency || "INR";
  const budgetLimit = params.budgetLimit || 15000;

  const preset = getPresetForDestination(destination);
  const [weatherRes, mapRes] = await Promise.all([
    fetchWeatherForecast(destination, days),
    lookupLocationOnMap(destination),
  ]);

  const transports: TravelTransportOption[] = [
    {
      id: "tr-bus-1",
      mode: "bus",
      carrier: "VRL / Orange AC Sleeper (Mock)",
      route: `${origin} → ${destination} (Round-trip)`,
      departureTime: "21:30",
      arrivalTime: "08:15",
      duration: "10h 45m",
      pricePerPerson: preset.baseBusFare * 2,
      totalPrice: preset.baseBusFare * 2 * travelers,
      currency,
      rating: 4.4,
      provider: "Mock Transport Aggregator",
      isMock: true,
      bookingUrl: `https://www.redbus.in/bus-tickets/${encodeURIComponent(origin.toLowerCase())}-to-${encodeURIComponent(destination.toLowerCase())}`,
    },
    {
      id: "tr-train-1",
      mode: "train",
      carrier: "Express 3AC Rail (Mock)",
      route: `${origin} → ${destination} (Round-trip)`,
      departureTime: "19:15",
      arrivalTime: "07:45",
      duration: "12h 30m",
      pricePerPerson: preset.baseTrainFare * 2,
      totalPrice: preset.baseTrainFare * 2 * travelers,
      currency,
      rating: 4.2,
      provider: "Mock Rail Estimator",
      isMock: true,
      bookingUrl: "https://www.irctc.co.in/",
    },
    {
      id: "tr-flight-1",
      mode: "flight",
      carrier: "IndiGo / Akasa Saver (Mock)",
      route: `${origin} → ${destination} (Round-trip)`,
      departureTime: "09:10",
      arrivalTime: "10:35",
      duration: "1h 25m",
      pricePerPerson: preset.baseFlightFare * 2,
      totalPrice: preset.baseFlightFare * 2 * travelers,
      currency,
      rating: 4.6,
      provider: "Mock Flight Aggregator",
      isMock: true,
      bookingUrl: `https://www.google.com/travel/flights?q=Flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(destination)}`,
    },
  ];

  const nights = Math.max(days - 1, 1);
  const hotels: TravelHotelOption[] = preset.hotels.map((h, idx) => ({
    id: `ht-${idx + 1}`,
    name: `${h.name} (Mock)`,
    area: h.area,
    pricePerNight: h.pricePerNight,
    totalNightsPrice: h.pricePerNight * nights,
    currency,
    rating: h.rating,
    amenities: h.amenities,
    distanceToCenter: h.distance,
    provider: "Mock Hotel Inventory",
    isMock: true,
    bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`,
  }));

  // Budget optimizer: pick best-rated transport + hotel combo fitting within ~65% of budget
  const targetInfraBudget = budgetLimit * 0.65;
  let chosenTransport = transports[0];
  let chosenHotel = hotels[0];
  let bestScore = -1;

  for (const tr of transports) {
    for (const ht of hotels) {
      const combined = tr.totalPrice + ht.totalNightsPrice;
      const fits = combined <= targetInfraBudget;
      const score = (fits ? 100 : 0) + (tr.rating + ht.rating) * 10 - combined / 1000;
      if (score > bestScore) {
        bestScore = score;
        chosenTransport = tr;
        chosenHotel = ht;
      }
    }
  }

  const remainingBudget = Math.max(budgetLimit - (chosenTransport.totalPrice + chosenHotel.totalNightsPrice), 1500 * travelers);
  const activitiesBudget = Math.min(Math.round(remainingBudget * 0.4), 1000 * travelers * days);
  const foodAndLocalBudget = Math.min(Math.round(remainingBudget * 0.55), 1400 * travelers * days);

  const restaurants: TravelPlace[] = preset.restaurants.map((r) => ({
    name: r.name,
    category: "restaurant",
    area: r.area,
    estimatedCost: r.cost,
    rating: r.rating,
    notes: r.notes,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${destination}`)}`,
    isMock: true,
  }));

  const attractions: TravelPlace[] = preset.attractions.map((a) => ({
    name: a.name,
    category: "attraction",
    area: a.area,
    estimatedCost: a.cost,
    rating: a.rating,
    notes: a.notes,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.name} ${destination}`)}`,
    isMock: true,
  }));

  const itinerary: TravelDayPlan[] = Array.from({ length: days }, (_, idx) => {
    const dayNum = idx + 1;
    const attrA = attractions[idx % attractions.length];
    const attrB = attractions[(idx + 1) % attractions.length];
    const restA = restaurants[idx % restaurants.length];
    const restB = restaurants[(idx + 1) % restaurants.length];

    return {
      day: dayNum,
      title:
        dayNum === 1
          ? `Arrival in ${destination} & ${attrA.area} Exploration`
          : dayNum === days
            ? `Morning Heritage & Departure to ${origin}`
            : `${attrA.area} Highlights & Local Flavors`,
      activities: [
        {
          time: dayNum === 1 ? "09:30 AM" : "09:00 AM",
          activity: dayNum === 1 ? `Check-in / drop bags at ${chosenHotel.name}` : `Morning visit: ${attrA.name}`,
          location: dayNum === 1 ? chosenHotel.area : attrA.area,
          estimatedCost: dayNum === 1 ? 0 : attrA.estimatedCost * travelers,
        },
        {
          time: "03:30 PM",
          activity: `Afternoon experience: ${attrB.name}`,
          location: attrB.area,
          estimatedCost: attrB.estimatedCost * travelers,
        },
      ],
      meals: [
        { meal: "Breakfast", suggestion: "Hotel / Local Cafe", estimatedCost: 200 * travelers },
        { meal: "Lunch", suggestion: `${restA.name} (${restA.area})`, estimatedCost: restA.estimatedCost * travelers },
        { meal: "Dinner", suggestion: `${restB.name} (${restB.area})`, estimatedCost: restB.estimatedCost * travelers },
      ],
    };
  });

  const totalEstimated =
    chosenTransport.totalPrice + chosenHotel.totalNightsPrice + activitiesBudget + foodAndLocalBudget;

  return {
    destination: mapRes.data.displayName.split(",")[0] || destination,
    origin,
    days,
    travelers,
    budgetLimit,
    currency,
    weather: weatherRes.data,
    transports,
    hotels,
    restaurants,
    attractions,
    itinerary,
    budgetBreakdown: {
      transportation: chosenTransport.totalPrice,
      accommodation: chosenHotel.totalNightsPrice,
      activities: activitiesBudget,
      foodAndLocalTransport: foodAndLocalBudget,
      totalEstimated,
      withinBudget: totalEstimated <= budgetLimit,
    },
    selectedTransportId: chosenTransport.id,
    selectedHotelId: chosenHotel.id,
    recommendations: [
      `Selected ${chosenTransport.carrier} + ${chosenHotel.name} to keep core travel & stay within ${Math.round(((chosenTransport.totalPrice + chosenHotel.totalNightsPrice) / budgetLimit) * 100)}% of your ${currency} ${budgetLimit.toLocaleString()} budget.`,
      `Weather in ${destination} is forecasted around ${weatherRes.data.temperatureC}°C (${weatherRes.data.condition}).`,
      `Verify live fares on the provider link before final checkout — transport & hotel prices shown are clearly labeled mock estimates.`,
    ],
    dataSources: [
      { name: weatherRes.provider, isMock: weatherRes.isMock },
      { name: mapRes.provider, isMock: mapRes.isMock },
      { name: "Mock Travel Inventory (Transport & Hotels)", isMock: true },
    ],
  };
}

