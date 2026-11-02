export type ProductDash = {
  _id: string;
  name: string;
  sku?: string;
  stock?: number;
  quantity?: number;
  lowStockThreshold?: number;
};

export type OrderDash = {
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
  recentOrders?: OrderDash[];
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
  productId?: string;
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

export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type Order = {
  _id: string;
  orderNumber: string;
  channel: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    billingAddress?: string;
    shippingAddress?: string;
  };
  items: {
    name: string;
    sku: string;
    image?: string;
    variant?: string;
    price: number;
    quantity: number;
    total: number;
    cgstRate?: number;
    sgstRate?: number;
  }[];
  subtotal: number;
  shipping: number;
  discount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  placedAt: string;
  statusHistory?: {
    status: string;
    note?: string;
    at: string;
  }[];
};

export type Stats = {
  total: number;
  pending: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

export const emptyStats: Stats = {
  total: 0,
  pending: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
};

export const statusStyles: Record<OrderStatus, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Processing: "bg-orange-50 text-orange-700 border-orange-200",
  Shipped: "bg-blue-50 text-blue-700 border-blue-200",
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
};