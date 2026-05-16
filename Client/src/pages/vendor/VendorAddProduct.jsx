import { useSearchParams } from "react-router-dom";
import VendorProductForm from "../../components/vendor/VendorProductForm";

export default function VendorAddProduct() {
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get("clone");

  return (
    <VendorProductForm
      mode={cloneId ? "clone" : "create"}
      cloneId={cloneId}
    />
  );
}
