import { ComingSoon, Screen } from "@/components/screen";

export default function SummaryPage() {
  return (
    <Screen title="Summary">
      <ComingSoon phase={5} what="Monthly totals, collections and a CSV export." />
    </Screen>
  );
}
