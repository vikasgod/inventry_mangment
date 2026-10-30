export type ProductDash = {
  _id: string;
  name: string;
  sku?: string;
  stock?: number;
  quantity?: number;
  lowStockThreshold?: number;
};

export type Order = {
  _id: string;
  orderNumber?: string;
  customerName?: string;
  customer?: { name?: string };
  channel?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string;
};


export type DashboardData = {
  totalProducts?: number;
  totalOrders?: number;
  totalRevenue?: number;
  lowStockCount?: number;
  monthlySales?: { month: string; sales: number }[];
  recentOrders?: Order[];
  lowStockProducts?: ProductDash[];
  channelSales?: { channel: string; sales: number; orders?: number }[];
};

export type ProductStatus = "Active" | "Low Stock" | "Out of Stock";

export type Product = {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  variants: number;
  stock: number;
  change: number;
  price: number;
  status: "Active" | "Low Stock" | "Out of Stock" | "Draft";
  image: string;
  channels: string[];
};

export const categories = [
  "All Categories",
  "Footwear",
  "Apparel",
  "Bags",
  "Electronics",
  "Home & Kitchen",
  "Home Decor",
  "Sports",
  "Accessories",
];

export const statuses = ["All Status", "Active", "Low Stock", "Out of Stock"];

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  warehouse: string;
  variant: string;
  color: string;
  onHand: number;
  reserved: number;
  safetyStock: number;
  price: number;
  image: string;
};

export const initialInventory: InventoryItem[] = [
  {
    id: "1",
    name: "Running Shoes",
    sku: "RS-001",
    category: "Footwear",
    warehouse: "Main Warehouse",
    variant: "Size: 9",
    color: "Black",
    onHand: 150,
    reserved: 12,
    safetyStock: 10,
    price: 2499,
    image: "https://placehold.co/80x80/f1f5f9/334155?text=Shoes",
  },
  {
    id: "2",
    name: "Cotton T-Shirt",
    sku: "TS-002",
    category: "Apparel",
    warehouse: "Main Warehouse",
    variant: "Size: M",
    color: "Red",
    onHand: 320,
    reserved: 45,
    safetyStock: 20,
    price: 599,
    image: "https://placehold.co/80x80/fef2f2/991b1b?text=Tee",
  },
  {
    id: "3",
    name: "Backpack",
    sku: "BP-003",
    category: "Bags",
    warehouse: "Delhi Warehouse",
    variant: "Standard",
    color: "Black",
    onHand: 60,
    reserved: 8,
    safetyStock: 10,
    price: 1499,
    image: "https://placehold.co/80x80/f1f5f9/334155?text=Bag",
  },
  {
    id: "4",
    name: "Wireless Earbuds",
    sku: "EB-004",
    category: "Electronics",
    warehouse: "Main Warehouse",
    variant: "Standard",
    color: "White",
    onHand: 45,
    reserved: 5,
    safetyStock: 10,
    price: 1999,
    image: "https://placehold.co/80x80/f8fafc/334155?text=Audio",
  },
  {
    id: "5",
    name: "Smart Watch",
    sku: "SW-005",
    category: "Electronics",
    warehouse: "Mumbai Warehouse",
    variant: "Standard",
    color: "Black",
    onHand: 22,
    reserved: 4,
    safetyStock: 5,
    price: 2999,
    image: "https://placehold.co/80x80/f1f5f9/334155?text=Watch",
  },
  {
    id: "6",
    name: "Men's Jeans",
    sku: "MJ-006",
    category: "Apparel",
    warehouse: "Main Warehouse",
    variant: "Size: 32",
    color: "Blue",
    onHand: 80,
    reserved: 10,
    safetyStock: 15,
    price: 1199,
    image: "https://placehold.co/80x80/dbeafe/1e40af?text=Jeans",
  },
  {
    id: "7",
    name: "Water Bottle",
    sku: "WB-007",
    category: "Home & Kitchen",
    warehouse: "Delhi Warehouse",
    variant: "750 ml",
    color: "Blue",
    onHand: 15,
    reserved: 3,
    safetyStock: 5,
    price: 499,
    image: "https://placehold.co/80x80/dbeafe/1e40af?text=Bottle",
  },
  {
    id: "8",
    name: "Table Lamp",
    sku: "TL-008",
    category: "Home Decor",
    warehouse: "Mumbai Warehouse",
    variant: "Standard",
    color: "White",
    onHand: 50,
    reserved: 8,
    safetyStock: 10,
    price: 899,
    image: "https://placehold.co/80x80/fef3c7/92400e?text=Lamp",
  },
  {
    id: "9",
    name: "Yoga Mat",
    sku: "YM-009",
    category: "Sports",
    warehouse: "Main Warehouse",
    variant: "Standard",
    color: "Purple",
    onHand: 8,
    reserved: 5,
    safetyStock: 5,
    price: 799,
    image: "https://placehold.co/80x80/f3e8ff/6b21a8?text=Yoga",
  },
  {
    id: "10",
    name: "Sunglasses",
    sku: "SG-010",
    category: "Accessories",
    warehouse: "Delhi Warehouse",
    variant: "Standard",
    color: "Black",
    onHand: 70,
    reserved: 15,
    safetyStock: 10,
    price: 899,
    image: "https://placehold.co/80x80/f1f5f9/334155?text=Glasses",
  },
  {
    id: "11",
    name: "Coffee Mug",
    sku: "CM-011",
    category: "Home & Kitchen",
    warehouse: "Main Warehouse",
    variant: "Standard",
    color: "White",
    onHand: 35,
    reserved: 4,
    safetyStock: 8,
    price: 299,
    image: "https://placehold.co/80x80/f8fafc/334155?text=Mug",
  },
  {
    id: "12",
    name: "Wireless Mouse",
    sku: "WM-012",
    category: "Electronics",
    warehouse: "Mumbai Warehouse",
    variant: "Standard",
    color: "Black",
    onHand: 12,
    reserved: 3,
    safetyStock: 10,
    price: 699,
    image: "https://placehold.co/80x80/f1f5f9/334155?text=Mouse",
  },
];

export const warehouseNames = [
  "Main Warehouse",
  "Delhi Warehouse",
  "Mumbai Warehouse",
  "Other",
];

export type Adjustment = {
  id: string;
  type: "add" | "remove" | "set";
  quantity: string;
  reason: string;
};

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}