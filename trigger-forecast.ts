import { retrainDemand } from "./src/lib/demand.functions.ts";

async function main() {
  console.log("Triggering retrainDemand...");
  try {
    const result = await retrainDemand({});
    console.log("Successfully generated ML forecast! Sample predictions:", result.predictions.days[0].by_hour.slice(0, 3));
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
