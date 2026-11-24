export interface TravelTransportOption {
  id: string;
  mode: "flight" | "bus" | "train";
  carrier: string;
  route: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  pricePerPerson: number;
  totalPrice: number;
  currency: string;
  rating: number;
  provider: string;
  isMock: boolean;
  bookingUrl: string;
}

export interface TravelHotelOption {
  id: string;
  name: string;
  area: string;
  pricePerNight: number;
  totalNightsPrice: number;
  currency: string;
  rating: number;
  amenities: string[];
  distanceToCenter: string;
  provider: string;
  isMock: boolean;
  bookingUrl: string;
}

export interface TravelPlace {
  name: string;
  category: "restaurant" | "attraction" | "beach" | "landmark";
  area: string;
  estimatedCost: number;
  rating: number;
  notes: string;
  mapsUrl: string;
  isMock: boolean;
}

export interface TravelDayPlan {
  day: number;
  title: string;
  activities: Array<{
    time: string;
    activity: string;
    location: string;
    estimatedCost: number;
  }>;
  meals: Array<{
    meal: "Breakfast" | "Lunch" | "Dinner";
    suggestion: string;
    estimatedCost: number;
  }>;
}

export interface TravelWeatherSummary {
  location: string;
  temperatureC: number;
  condition: string;
  humidity?: number;
  forecast: Array<{
    date: string;
    tempMaxC: number;
    tempMinC: number;
    summary: string;
  }>;
  provider: string;
  isMock: boolean;
}

export interface TravelPlanResult {
  destination: string;
  origin: string;
  days: number;
  travelers: number;
  budgetLimit: number;
  currency: string;
  weather: TravelWeatherSummary;
  transports: TravelTransportOption[];
  hotels: TravelHotelOption[];
  restaurants: TravelPlace[];
  attractions: TravelPlace[];
  itinerary: TravelDayPlan[];
  budgetBreakdown: {
    transportation: number;
    accommodation: number;
    activities: number;
    foodAndLocalTransport: number;
    totalEstimated: number;
    withinBudget: boolean;
  };
  selectedTransportId: string;
  selectedHotelId: string;
  recommendations: string[];
  dataSources: Array<{ name: string; isMock: boolean }>;
}

export interface ProductComparisonItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
  valueScore: number;
  merchant: string;
  merchantUrl: string;
  isMock: boolean;
}

export interface ShoppingResult {
  query: string;
  budgetLimit?: number;
  currency: string;
  products: ProductComparisonItem[];
  recommendedProductId: string;
  comparisonHighlights: string[];
  dataSources: Array<{ name: string; isMock: boolean }>;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  startIso: string;
  endIso: string;
  category: "meeting" | "focus" | "personal" | "errand" | "travel";
  priority: "high" | "medium" | "low";
  location?: string;
  status: "confirmed" | "proposed";
  isMock?: boolean;
}

export interface SchedulerResult {
  date: string;
  existingEvents: CalendarEventItem[];
  conflicts: Array<{ eventA: string; eventB: string; reason: string }>;
  freeSlots: Array<{ startIso: string; endIso: string; durationMinutes: number }>;
  proposedSchedule: CalendarEventItem[];
  priorities: string[];
  provider: string;
  isMock: boolean;
}

export interface EmailThreadItem {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  receivedAt: string;
  category: "important" | "work" | "finance" | "newsletter" | "personal";
  unanswered: boolean;
  urgency: "high" | "medium" | "low";
  snippet: string;
  summary: string;
  suggestedReply: string;
  followUpAction?: string;
  isMock: boolean;
}

export interface EmailAssistantResult {
  totalScanned: number;
  unansweredImportantCount: number;
  threads: EmailThreadItem[];
  provider: string;
  isMock: boolean;
}

export interface ExpenseEntry {
  id: string;
  date: string;
  merchant: string;
  category: "Food & Dining" | "Transport" | "Subscriptions" | "Shopping" | "Utilities" | "Entertainment" | "Travel";
  amount: number;
  currency: string;
  notes?: string;
}

export interface FinanceAnalysisResult {
  periodLabel: string;
  currency: string;
  totalSpent: number;
  categoryTotals: Array<{ category: string; amount: number; percentage: number }>;
  unusualExpenses: Array<{ merchant: string; amount: number; reason: string }>;
  patterns: string[];
  savingsSuggestions: Array<{ title: string; estimatedMonthlySavings: number; detail: string }>;
  expenses: ExpenseEntry[];
  dataSource: string;
  isMock: boolean;
}

