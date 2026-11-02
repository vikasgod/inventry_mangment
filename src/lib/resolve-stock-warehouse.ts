import Warehouse from "@/models/Warehouse";

type WarehouseName = {
  name: string;
};

export async function resolveStockWarehouse() {
  const configuredName = process.env.DEFAULT_ORDER_WAREHOUSE?.trim();

  if (configuredName) {
    const warehouse = await Warehouse.findOne({
      name: configuredName,
      status: "Active",
    })
      .lean<WarehouseName>()
      .exec();

    if (!warehouse) {
      throw new Error(
        `DEFAULT_ORDER_WAREHOUSE "${configuredName}" is not an active warehouse.`
      );
    }

    return warehouse;
  }

  const activeWarehouses = await Warehouse.find({ status: "Active" })
    .select("name")
    .limit(2)
    .lean<WarehouseName[]>()
    .exec();

  if (activeWarehouses.length === 1) {
    return activeWarehouses[0];
  }

  if (activeWarehouses.length === 0) {
    throw new Error(
      "Create an active warehouse or configure DEFAULT_ORDER_WAREHOUSE before assigning stock."
    );
  }

  throw new Error(
    "More than one active warehouse exists. Configure DEFAULT_ORDER_WAREHOUSE to choose where initial stock should go."
  );
}
