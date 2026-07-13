import Dashboard from "@/components/Dashboard";
import { loadRecords } from "@/lib/loadRecords";

export default function Home() {
  const records = loadRecords();
  return (
    <main>
      <Dashboard records={records} />
    </main>
  );
}
