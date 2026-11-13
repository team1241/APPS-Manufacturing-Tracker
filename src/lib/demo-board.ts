import { CATEGORIES, type BoardData, type Part } from "./manufacturing";

export function createDemoBoard(): BoardData {
  const now = Date.now();
  const names = ["Drive shaft", "Bearing block", "Elevator plate", "Belly pan", "Cable guide", "Spacer sleeve", "Gearbox mount", "Intake side plate", "Electronics tray", "Sensor bracket", "Roller axle", "Motor mount", "Pivot plate", "Router fixture", "Wire clip", "Wheel hub", "Shaft collar", "Arm gusset", "Battery stop", "Bumper cap"];
  const parts: Part[] = names.map((name, index) => ({
    id: String(index + 1), name: `27-1241-P${String(2001 + index)} · ${name}`,
    category: CATEGORIES[index % 5],
    status: index < 5 ? "In progress" : index === 11 ? "Blocked" : index > 15 ? "Completed" : "Ready",
    priority: index % 7 === 0 ? "Critical" : index % 3 === 0 ? "High" : index % 4 === 0 ? "Low" : "Normal",
    description: name, quantity: index % 4 + 1, drawingStatus: "Pending",
    assignee: index < 5 ? ["Alex Chen", "Sam Patel", "Jordan Lee", "Avery Singh", "Taylor Kim"][index] : "",
    completedAt: index > 15 ? new Date(now - (index - 15) * 3_600_000).toISOString() : null,
    drawings: [],
  }));
  return {
    source: "demo", name: "Manufacturing", parts, fetchedAt: new Date(now).toISOString(),
    retentionHours: 48, refreshSeconds: 120, warnings: [],
    notes: [
      { id: "1", text: "This week’s goal: finish drivetrain parts and begin assembly.", date: null },
      { id: "2", text: "Mentor availability: add shop hours to your Monday notes board.", date: null },
      { id: "3", text: "Sample board — connect Monday to display your team’s real parts and dates.", date: null },
    ],
  };
}
