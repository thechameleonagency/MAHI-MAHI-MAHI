import { Navigate } from "react-router-dom";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { getInventoryHubPath } from "@/lib/inventoryHubPath";

/** `/inventory` hub — materials for ops roles, templates for salesperson (MD2). */
const InventoryIndexRedirect = () => {
  const { currentRole } = useAppSession();
  return <Navigate to={getInventoryHubPath(currentRole)} replace />;
};

export default InventoryIndexRedirect;
