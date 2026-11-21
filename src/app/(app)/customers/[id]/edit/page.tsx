import { notFound } from "next/navigation";
import { Screen } from "@/components/screen";
import { customerLabel } from "@/lib/customers";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "../../customer-form";
import { customerFormProps } from "../../data";

export default async function EditCustomerPage(props: PageProps<"/customers/[id]/edit">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: customer }, formProps] = await Promise.all([
    supabase.from("customer_list").select("*").eq("id", id).maybeSingle(),
    customerFormProps(supabase),
  ]);
  if (!customer) notFound();

  return (
    <Screen title="Edit customer" sub={customerLabel(customer)} back={`/customers/${id}`}>
      <CustomerForm customer={customer} {...formProps} />
    </Screen>
  );
}
