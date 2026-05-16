import { useParams } from "react-router-dom";
import VendorProductForm from "../../components/vendor/VendorProductForm";

export default function VendorEditProduct() {
  const { id } = useParams();

  return <VendorProductForm mode="edit" productId={id} />;
}
