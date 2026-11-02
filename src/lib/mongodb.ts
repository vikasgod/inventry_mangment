
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? '';

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing in .env.local");
}

type CachedConnection = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  inventoryIndexMigration: Promise<void> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: CachedConnection | undefined;
}

const cached =
  global.mongooseCache ??
  (global.mongooseCache = {
    conn: null,
    promise: null,
    inventoryIndexMigration: null,
  });

async function removeObsoleteInventorySkuIndex() {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not available for inventory index migration.");
  }

  const inventoryCollectionExists = await db
    .listCollections({ name: "inventories" }, { nameOnly: true })
    .hasNext();

  if (!inventoryCollectionExists) return;

  const indexes = await db.collection("inventories").listIndexes().toArray();
  const obsoleteIndex = indexes.find(
    (index) => index.name === "sku_1_warehouse_1"
  );

  if (!obsoleteIndex) return;

  const key = obsoleteIndex.key;
  const isExpectedIndex =
    obsoleteIndex.unique === true &&
    Object.keys(key).length === 2 &&
    key.sku === 1 &&
    key.warehouse === 1;

  if (!isExpectedIndex) {
    throw new Error(
      'Refusing to remove "sku_1_warehouse_1" because its definition does not match the obsolete inventory SKU index.'
    );
  }

  await db.collection("inventories").dropIndex("sku_1_warehouse_1");
  console.info(
    'Removed obsolete unique index "sku_1_warehouse_1" from inventories.'
  );
}

export default async function connectDB() {
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }

  let connection: typeof mongoose;

  try {
    connection = cached.conn ?? (await cached.promise);
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  cached.conn = connection;

  if (!cached.inventoryIndexMigration) {
    cached.inventoryIndexMigration = removeObsoleteInventorySkuIndex();
  }

  try {
    await cached.inventoryIndexMigration;
  } catch (error) {
    cached.inventoryIndexMigration = null;
    throw error;
  }

  return connection;
}
