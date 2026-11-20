import { ComingSoon, Screen } from "@/components/screen";

export default function TodayPage() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Karachi",
  });
  return (
    <Screen title="Today" sub={today}>
      <ComingSoon phase={3} what="Confirm today's bottles and empties for each customer." />
    </Screen>
  );
}
