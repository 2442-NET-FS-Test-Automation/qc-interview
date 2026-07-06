// Runtime config. After `wrangler deploy`, set WORKER_URL to the Worker URL it prints
// (e.g. https://qc-interview-backend.<subdomain>.workers.dev). No secrets here.
window.CONFIG = {
  WORKER_URL: "https://qc-interview-backend.jestercharles.workers.dev",
  // The four QC modules, in curriculum order. `topic` must match the bank's question.topic.
  QC_MODULES: [
    { topic: "qc1-dotnet",        label: "QC-1 · C# / .NET Fundamentals" },
    { topic: "qc2-sql",           label: "QC-2 · SQL" },
    { topic: "qc3-ef-rest-dsa-mt",label: "QC-3 · EF Core, REST, DSA & Multithreading" },
    { topic: "qc4-aspnet",        label: "QC-4 · ASP.NET Core APIs" },
  ],
  // Curriculum weeks for the day-by-day picker: which day numbers exist per week.
  WEEKS: [
    { week: 1,  days: [1,2,3,4,5], label: "Week 1 · Agile, Git, Core C#" },
    { week: 2,  days: [1,2,3,4,5], label: "Week 2 · Intermediate C# + SQL intro" },
    { week: 3,  days: [1,2,3,4,5], label: "Week 3 · SQL" },
    { week: 4,  days: [1,2,3,4],   label: "Week 4 · EF Core, REST, DSA, Multithreading" },
    { week: 5,  days: [3],         label: "Week 5 · ASP.NET Core (controllers bridge)" },
    { week: 7,  days: [4],         label: "Week 7 · Microservices / SOA" },
  ],
};
