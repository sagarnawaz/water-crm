import { Screen } from "@/components/screen";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "../customer-form";
import { customerFormProps } from "../data";

export default async function NewCustomerPage() {
  const props = await customerFormProps(await createClient());
  return (
    <Screen title="New customer" sub="Only 3 fields needed" back="/customers">
      <CustomerForm {...props} />
    </Screen>
  );
}
