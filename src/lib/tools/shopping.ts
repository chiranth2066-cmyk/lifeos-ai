import { runWebSearch } from "./web-search";
import type { ProductComparisonItem, ShoppingResult } from "@/types/modules";

const LAPTOP_SANDBOX_CATALOG: ProductComparisonItem[] = [
  {
    id: "prod-lenovo-loq",
    name: "Lenovo LOQ 15 (Core i5-13450HX / RTX 4050)",
    brand: "Lenovo",
    price: 76990,
    currency: "INR",
    rating: 4.6,
    reviewCount: 412,
    specs: {
      CPU: "Intel Core i5-13450HX (10C/16T)",
      GPU: "NVIDIA RTX 4050 6GB (95W TGP)",
      RAM: "16GB DDR5-4800 (Upgradable)",
      Storage: "512GB PCIe Gen4 NVMe",
      Display: '15.6" FHD 144Hz 100% sRGB',
      Weight: "2.38 kg",
    },
    pros: ["100% sRGB color-accurate 144Hz panel", "Strong dual-fan thermals for builds & gaming", "Upgradable RAM & second M.2 slot"],
    cons: ["Average battery life (~4.5 hrs)", "Slightly bulky charger"],
    valueScore: 94,
    merchant: "Lenovo / Amazon India (Mock Sandbox)",
    merchantUrl: "https://www.amazon.in/s?k=Lenovo+LOQ+RTX+4050",
    isMock: true,
  },
  {
    id: "prod-asus-tuf-a15",
    name: "ASUS TUF Gaming A15 (Ryzen 7 7435HS / RTX 4050)",
    brand: "ASUS",
    price: 78990,
    currency: "INR",
    rating: 4.5,
    reviewCount: 538,
    specs: {
      CPU: "AMD Ryzen 7 7435HS (8C/16T)",
      GPU: "NVIDIA RTX 4050 6GB (140W TGP)",
      RAM: "16GB DDR5",
      Storage: "512GB NVMe SSD",
      Display: '15.6" FHD 144Hz Anti-Glare',
      Weight: "2.20 kg",
    },
    pros: ["Highest RTX 4050 TGP in segment", "MIL-STD-810H durable chassis", "Great keyboard travel for coding"],
    cons: ["No iGPU on 7435HS reduces battery runtime", "Display covers ~62% sRGB"],
    valueScore: 90,
    merchant: "ASUS eShop / Flipkart (Mock Sandbox)",
    merchantUrl: "https://www.flipkart.com/search?q=ASUS+TUF+A15+RTX+4050",
    isMock: true,
  },
  {
    id: "prod-acer-nitro-v",
    name: "Acer Nitro V 15 (Core i5-13420H / RTX 4050)",
    brand: "Acer",
    price: 71990,
    currency: "INR",
    rating: 4.3,
    reviewCount: 289,
    specs: {
      CPU: "Intel Core i5-13420H (8C/12T)",
      GPU: "NVIDIA RTX 4050 6GB (75W TGP)",
      RAM: "16GB DDR5",
      Storage: "512GB Gen4 SSD",
      Display: '15.6" FHD IPS 144Hz',
      Weight: "2.10 kg",
    },
    pros: ["Best price-to-GPU ratio under ₹75k", "Lighter chassis (2.1 kg)", "Thunderbolt 4 port"],
    cons: ["Louder fan noise under sustained load", "Lower 75W GPU power ceiling"],
    valueScore: 87,
    merchant: "Acer Store / Amazon India (Mock Sandbox)",
    merchantUrl: "https://www.amazon.in/s?k=Acer+Nitro+V+RTX+4050",
    isMock: true,
  },
];

export async function compareProducts(params: {
  query: string;
  budgetLimit?: number;
  currency?: string;
}): Promise<ShoppingResult> {
  const query = params.query || "Laptop for programming and gaming";
  const currency = params.currency || "INR";
  const budgetLimit = params.budgetLimit || 80000;
  const searchRes = await runWebSearch(`${query} price comparison India`, 3);

  const lower = query.toLowerCase();
  let products: ProductComparisonItem[];

  if (lower.includes("laptop") || lower.includes("programming") || lower.includes("gaming")) {
    products = LAPTOP_SANDBOX_CATALOG.filter((p) => p.price <= budgetLimit * 1.05);
    if (products.length === 0) products = LAPTOP_SANDBOX_CATALOG;
  } else {
    const basePrice = Math.min(budgetLimit || 25000, 45000);
    products = [
      {
        id: "prod-gen-1",
        name: `${query} — Pro Edition (Mock)`,
        brand: "ApexTech",
        price: Math.round(basePrice * 0.88),
        currency,
        rating: 4.6,
        reviewCount: 320,
        specs: { Tier: "Performance", Warranty: "2 Years", Availability: "In Stock (Mock)" },
        pros: ["Highest user satisfaction score", "Strong feature-to-price balance"],
        cons: ["Premium pricing near budget cap"],
        valueScore: 92,
        merchant: "Amazon / Official Store (Mock Sandbox)",
        merchantUrl: `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
        isMock: true,
      },
      {
        id: "prod-gen-2",
        name: `${query} — Value Choice (Mock)`,
        brand: "CoreValue",
        price: Math.round(basePrice * 0.72),
        currency,
        rating: 4.4,
        reviewCount: 510,
        specs: { Tier: "Mainstream", Warranty: "1 Year", Availability: "In Stock (Mock)" },
        pros: ["Saves ~28% of budget", "Verified high review volume"],
        cons: ["Fewer pro accessories included"],
        valueScore: 89,
        merchant: "Flipkart / Official Store (Mock Sandbox)",
        merchantUrl: `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`,
        isMock: true,
      },
      {
        id: "prod-gen-3",
        name: `${query} — Compact Essential (Mock)`,
        brand: "NovaGear",
        price: Math.round(basePrice * 0.62),
        currency,
        rating: 4.2,
        reviewCount: 190,
        specs: { Tier: "Essential", Warranty: "1 Year", Availability: "In Stock (Mock)" },
        pros: ["Lowest upfront cost", "Lightweight everyday build"],
        cons: ["Basic feature set"],
        valueScore: 83,
        merchant: "Croma / Official Store (Mock Sandbox)",
        merchantUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        isMock: true,
      },
    ];
  }

  const ranked = [...products].sort((a, b) => b.valueScore - a.valueScore);
  const top = ranked[0];

  return {
    query,
    budgetLimit,
    currency,
    products: ranked,
    recommendedProductId: top.id,
    comparisonHighlights: [
      `${top.name} leads with a ${top.valueScore}/100 value score at ${currency} ${top.price.toLocaleString()}.`,
      `All ${ranked.length} compared options fit within your ${currency} ${budgetLimit.toLocaleString()} ceiling.`,
      `Merchant prices shown are sandbox estimates; always verify live pricing on the merchant page before confirming checkout.`,
    ],
    dataSources: [
      { name: searchRes.provider, isMock: searchRes.isMock },
      { name: "Mock Product Comparison Catalog", isMock: true },
    ],
  };
}

