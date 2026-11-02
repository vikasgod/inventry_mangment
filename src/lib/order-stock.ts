import mongoose, { type ClientSession } from "mongoose";
import Inventory from "@/models/Inventory";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";

type InventorySnapshot = {
  _id: mongoose.Types.ObjectId;
  onHand: number;
  reserved: number;
};

type InventoryRowSnapshot = {
  _id: mongoose.Types.ObjectId;
  onHand: number;
};

export type StockConsumption = {
  productId: mongoose.Types.ObjectId;
  inventoryId: mongoose.Types.ObjectId;
  quantity: number;
  movementId: mongoose.Types.ObjectId;
};

export type StockAllocation = {
  productId: mongoose.Types.ObjectId;
  quantity: number;
};

export class OrderStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderStockError";
  }
}

export function isTransactionUnsupportedError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 20
  );
}

export async function reserveOrderStock(
  allocations: StockAllocation[],
  warehouse: string,
  session?: ClientSession
) {
  const reserved: StockAllocation[] = [];

  for (const allocation of allocations) {
    try {
      const result = await Inventory.updateOne(
        {
          productId: allocation.productId,
          warehouse,
          $expr: {
            $gte: [
              { $subtract: ["$onHand", "$reserved"] },
              allocation.quantity,
            ],
          },
        },
        { $inc: { reserved: allocation.quantity } },
        session ? { session } : {}
      );

      if (result.modifiedCount !== 1) {
        throw new OrderStockError(
          `Insufficient available stock for product ${allocation.productId} in ${warehouse}.`
        );
      }

      reserved.push(allocation);
    } catch (error) {
      if (!session) {
        for (const previous of reserved.reverse()) {
          await Inventory.updateOne(
            {
              productId: previous.productId,
              warehouse,
              reserved: { $gte: previous.quantity },
            },
            { $inc: { reserved: -previous.quantity } }
          );
        }
      }

      throw error;
    }
  }
}

export async function releaseOrderStock(
  allocations: StockAllocation[],
  warehouse: string,
  session?: ClientSession
) {
  const released: StockAllocation[] = [];

  for (const allocation of allocations) {
    try {
      const result = await Inventory.updateOne(
        {
          productId: allocation.productId,
          warehouse,
          reserved: { $gte: allocation.quantity },
        },
        { $inc: { reserved: -allocation.quantity } },
        session ? { session } : {}
      );

      if (result.modifiedCount !== 1) {
        throw new OrderStockError(
          `Could not release reserved stock for product ${allocation.productId}.`
        );
      }

      released.push(allocation);
    } catch (error) {
      if (!session) {
        for (const previous of released.reverse()) {
          await Inventory.updateOne(
            { productId: previous.productId, warehouse },
            { $inc: { reserved: previous.quantity } }
          );
        }
      }

      throw error;
    }
  }
}

async function updateProductStock(
  productId: mongoose.Types.ObjectId,
  session?: ClientSession
) {
  let query = Inventory.find({ productId }).select("onHand");
  if (session) query = query.session(session);

  const inventoryRows = await query.lean<InventoryRowSnapshot[]>().exec();

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        stock: inventoryRows.reduce(
          (total, row) => total + row.onHand,
          0
        ),
      },
    },
    session ? { session } : {}
  );
}

export async function rollbackOrderStockConsumption(
  consumptions: StockConsumption[],
  restoreReservation: boolean
) {
  for (const consumption of [...consumptions].reverse()) {
    const increments: Record<string, number> = {
      onHand: consumption.quantity,
    };

    if (restoreReservation) {
      increments.reserved = consumption.quantity;
    }

    await Inventory.updateOne(
      { _id: consumption.inventoryId },
      { $inc: increments }
    );
    await StockMovement.deleteOne({ _id: consumption.movementId });
    await updateProductStock(consumption.productId);
  }
}

export async function consumeOrderStock(
  allocations: StockAllocation[],
  warehouse: string,
  session?: ClientSession
) {
  const consumptions: StockConsumption[] = [];

  try {
    for (const allocation of allocations) {
      if (session) {
        const inventory = await Inventory.findOne({
          productId: allocation.productId,
          warehouse,
        })
          .session(session)
          .lean<InventorySnapshot>()
          .exec();

        if (
          !inventory ||
          inventory.onHand < allocation.quantity ||
          inventory.reserved < allocation.quantity
        ) {
          throw new OrderStockError(
            `Could not deduct reserved stock for product ${allocation.productId}.`
          );
        }

        const result = await Inventory.updateOne(
          {
            _id: inventory._id,
            onHand: { $gte: allocation.quantity },
            reserved: { $gte: allocation.quantity },
          },
          {
            $inc: {
              onHand: -allocation.quantity,
              reserved: -allocation.quantity,
            },
          },
          { session }
        );

        if (result.modifiedCount !== 1) {
          throw new OrderStockError(
            `Could not deduct reserved stock for product ${allocation.productId}.`
          );
        }

        await StockMovement.create(
          [
            {
              productId: allocation.productId,
              warehouse,
              type: "remove",
              quantity: allocation.quantity,
              previousStock: inventory.onHand,
              newStock: inventory.onHand - allocation.quantity,
              reason: "Order shipped",
            },
          ],
          { session }
        );

        await updateProductStock(allocation.productId, session);
        continue;
      }

      const inventory = await Inventory.findOneAndUpdate(
        {
          productId: allocation.productId,
          warehouse,
          onHand: { $gte: allocation.quantity },
          reserved: { $gte: allocation.quantity },
        },
        {
          $inc: {
            onHand: -allocation.quantity,
            reserved: -allocation.quantity,
          },
        },
        { new: false }
      );

      if (!inventory) {
        throw new OrderStockError(
          `Could not deduct reserved stock for product ${allocation.productId}.`
        );
      }

      let movement;
      try {
        movement = await StockMovement.create({
          productId: allocation.productId,
          warehouse,
          type: "remove",
          quantity: allocation.quantity,
          previousStock: inventory.onHand,
          newStock: inventory.onHand - allocation.quantity,
          reason: "Order shipped",
        });
      } catch (error) {
        await Inventory.updateOne(
          { _id: inventory._id },
          {
            $inc: {
              onHand: allocation.quantity,
              reserved: allocation.quantity,
            },
          }
        );
        throw error;
      }

      consumptions.push({
        productId: allocation.productId,
        inventoryId: inventory._id,
        quantity: allocation.quantity,
        movementId: movement._id,
      });

      await updateProductStock(allocation.productId);
    }
  } catch (error) {
    if (!session && consumptions.length > 0) {
      await rollbackOrderStockConsumption(consumptions, true);
    }
    throw error;
  }

  return consumptions;
}
