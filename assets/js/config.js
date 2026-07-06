// Runtime config + curriculum data for the selection UI. No secrets here.
window.CONFIG = {
  WORKER_URL: "https://qc-interview-backend.jestercharles.workers.dev",

  // Every interview is 10 questions, ~15 min. `topic` must match the bank's question.topic.
  INTERVIEW_LEN: 10,
  EST_MIN: 15,

  // Full-QC exams. `topics` = the areas to expect (shown on the card + preview).
  QC_MODULES: [
    {
      topic: "qc1-dotnet", code: "QC-1", label: "C# / .NET Fundamentals", difficulty: "Foundational",
      blurb: "Core C#, object-oriented design, and the .NET toolchain.",
      topics: ["C# syntax & types", "OOP pillars", "Collections & generics", "Exceptions", "async / await", "SOLID & patterns"],
    },
    {
      topic: "qc2-sql", code: "QC-2", label: "SQL", difficulty: "Core",
      blurb: "Relational databases end to end — from schema to transactions.",
      topics: ["DDL / DML / DQL", "Keys & constraints", "Joins", "Aggregates & GROUP BY", "Normalization", "Transactions & ACID", "Views / procs / indexes"],
    },
    {
      topic: "qc3-ef-rest-dsa-mt", code: "QC-3", label: "EF Core · REST · DSA · Multithreading", difficulty: "Intermediate",
      blurb: "Data access, web services, algorithms, and concurrency.",
      topics: ["EF Core & DbContext", "REST & HTTP", "Data structures & Big-O", "Search & sort", "Multithreading & TPL"],
    },
    {
      topic: "qc4-aspnet", code: "QC-4", label: "ASP.NET Core APIs", difficulty: "Applied",
      blurb: "Building HTTP APIs with controllers, DTOs, and middleware.",
      topics: ["HTTP pipeline & middleware", "Controllers & actions", "DTOs & model binding", "Validation", "Minimal API", "AutoMapper"],
    },
  ],

  // Day-by-day curriculum. Each day shows its title + the topics it covers.
  CURRICULUM: [
    { week: 1, label: "Week 1 · Agile, Git & Core C#", days: [
      { d: 1, id: "w01d1", title: "Agile, SDLC & Git", topics: ["Agile & SDLC", "Waterfall vs Agile", "Git fundamentals", "Repos & remotes"] },
      { d: 2, id: "w01d2", title: ".NET & C# Intro", topics: ["OS & CLI basics", ".NET SDK & CLI", "C# intro", "Data types"] },
      { d: 3, id: "w01d3", title: "Core C#", topics: ["Control flow", "Operators", "Methods", "Debugging"] },
      { d: 4, id: "w01d4", title: "Classes & Memory", topics: ["Strings & arrays", "Stack vs heap", "Classes & members", "Namespaces"] },
      { d: 5, id: "w01d5", title: "OOP Pillars", topics: ["Encapsulation", "Inheritance", "Polymorphism", "Abstraction", "Interfaces vs abstract", "Access modifiers"] },
    ]},
    { week: 2, label: "Week 2 · Intermediate C# + SQL Intro", days: [
      { d: 1, id: "w02d1", title: "Collections & Generics", topics: ["List / Stack / Queue", "Generics", "Structs & enums", "Multi-dim arrays"] },
      { d: 2, id: "w02d2", title: "Exceptions, Patterns & Logging", topics: ["try / catch", "Factory & Repository", "Unit of Work & Singleton", "SOLID", "Serilog logging"] },
      { d: 3, id: "w02d3", title: "Advanced Classes & Collections", topics: ["Partial / sealed classes", "Garbage collection", "IEnumerable", "Dictionary / HashSet", "Lambdas"] },
      { d: 4, id: "w02d4", title: "Async & Networking", topics: ["HttpClient", "async / await", "Nullable types", "Regex", "Boxing / unboxing"] },
      { d: 5, id: "w02d5", title: "SQL Intro", topics: ["Relational model", "Schema & data types", "ERD & data modeling", "CRUD overview"] },
    ]},
    { week: 3, label: "Week 3 · SQL", days: [
      { d: 1, id: "w03d1", title: "DDL, DML & DQL", topics: ["CREATE / DROP / TRUNCATE", "Constraints", "INSERT / UPDATE / DELETE", "Queries & clauses"] },
      { d: 2, id: "w03d2", title: "Keys & Normalization", topics: ["Primary & foreign keys", "Referential integrity", "Normalization (1NF–3NF)", "Multiplicity"] },
      { d: 3, id: "w03d3", title: "Functions & Joins", topics: ["Aggregate vs scalar", "GROUP BY / HAVING", "All join types", "Subqueries vs joins"] },
      { d: 4, id: "w03d4", title: "Transactions & ACID", topics: ["Transactions (TCL)", "ACID properties", "Isolation levels"] },
      { d: 5, id: "w03d5", title: "Views, Procedures & Indexes", topics: ["Views", "Stored procedures & UDFs", "Indexes", "Triggers", "DCL"] },
    ]},
    { week: 4, label: "Week 4 · EF Core, REST, DSA & Multithreading", days: [
      { d: 1, id: "w04d1", title: "EF Core, Minimal API & REST", topics: ["EF Core & DbContext", "LINQ", "Code-first vs data-first", "Minimal API", "REST & HTTP verbs"] },
      { d: 2, id: "w04d2", title: "EF Core Persistence", topics: ["Change tracking", "Migrations", "Fluent API", "Data annotations"] },
      { d: 3, id: "w04d3", title: "Algorithms & Data Structures", topics: ["Big-O", "Search & sort", "Lists / stacks / queues", "Hash tables", "Trees & graphs", "Recursion"] },
      { d: 4, id: "w04d4", title: "Multithreading", topics: ["Thread & ThreadPool", "Task Parallel Library", "lock / Monitor", "Deadlock & thread safety", "Cancellation"] },
    ]},
    { week: 5, label: "Week 5 · ASP.NET Core", days: [
      { d: 3, id: "w05d3", title: "ASP.NET Core APIs", topics: ["HTTP pipeline & middleware", "Controllers & actions", "DTOs", "Model binding & validation", "AutoMapper", "Status codes"] },
    ]},
    { week: 6, label: "Week 6 · HTML, CSS, JavaScript, TypeScript", days: [
      { d: 1, id: "w06d1", title: "HTML & CSS", topics: ["HTML structure & DOM", "Elements & attributes", "CSS box model", "Selectors", "Flexbox & Grid", "Responsive & media queries"] },
      { d: 2, id: "w06d2", title: "JavaScript Core", topics: ["Datatypes & coercion", "Variable scopes", "let / const", "Arrays & functions", "this & arrow functions", "Closures"] },
      { d: 3, id: "w06d3", title: "JavaScript DOM / HTTP", topics: ["DOM selection & manipulation", "Events & bubbling", "Fetch API", "Promises", "async / await", "Template literals"] },
      { d: 4, id: "w06d4", title: "TypeScript Basics", topics: ["JS vs TS", "tsconfig & strict", "Simple & object types", "Aliases & interfaces", "Union types & tuples", "Enums"] },
      { d: 5, id: "w06d5", title: "TypeScript Intermediate & Advanced", topics: ["Classes", "Generics", "Casting", "Utility types", "keyof", "Decorators", "Type guards", "interface vs type"] },
    ]},
    { week: 7, label: "Week 7 · React, Microservices, Kafka", days: [
      { d: 1, id: "w07d1", title: "React Fundamentals", topics: ["SPAs", "JSX / TSX", "Components & rendering", "Hooks", "Props & state", "Lists & keys"] },
      { d: 2, id: "w07d2", title: "State Management", topics: ["Nested components", "Immutability", "Lifting state", "Event handling", "Routing", "Axios"] },
      { d: 3, id: "w07d3", title: "Advanced React", topics: ["Context", "Controlled vs uncontrolled", "Higher-order components", "Refs", "Testing React"] },
      { d: 4, id: "w07d4", title: "Microservices", topics: ["MSA vs monolith", "Service registry & discovery", "API gateway", "Load balancing", "Circuit breaker"] },
      { d: 5, id: "w07d5", title: "Event-Driven & Kafka", topics: ["Event-driven architecture", "Producer / consumer", "Event bus / broker", "Apache Kafka", "Kafka streams"] },
    ]},
    { week: 8, label: "Week 8 · xUnit, Cypress, Selenium", days: [
      { d: 1, id: "w08d1", title: "xUnit Fundamentals", topics: ["Unit testing in .NET", "Arrange-Act-Assert", "FluentAssertions", "Fixtures", "Moq", "Code coverage"] },
      { d: 2, id: "w08d2", title: "xUnit Advanced", topics: ["Testing ASP.NET APIs", "WebApplicationFactory", "In-memory servers", "EF Core testing", "Test isolation", "Controller testing"] },
      { d: 3, id: "w08d3", title: "Cypress Fundamentals", topics: ["Testing frameworks", "Cypress overview", "Test runner", "Test creation", "Chaining", "Commands"] },
      { d: 4, id: "w08d4", title: "Cypress Advanced", topics: ["Custom commands", "Fixtures", "Page Object Model", "Waits", "cy.intercept()", "Assertions & debugging"] },
      { d: 5, id: "w08d5", title: "Selenium", topics: ["Selenium intro", "Automation frameworks", "Selenium IDE & Grid", "Driver configuration", "Option classes"] },
    ]},
    { week: 9, label: "Week 9 · Selenium & Azure", days: [
      { d: 1, id: "w09d1", title: "Selenium Driver Interactions", topics: ["Driver interactions", "Locator strategies", "find & navigate methods", "Screenshots", "XPath", "XPath vs CSS"] },
      { d: 2, id: "w09d2", title: "Elements & Waits", topics: ["Web element interactions", "Select elements", "Actions API", "Implicit vs explicit waits"] },
      { d: 3, id: "w09d3", title: "Windows & Page Object Model", topics: ["Window handling", "Alerts", "Selenium exceptions", "Assert vs verify", "Page Object Model", "PageFactory"] },
      { d: 4, id: "w09d4", title: "Cloud Fundamentals & Azure", topics: ["Cloud computing", "IaaS / PaaS / SaaS", "Provider comparison", "Azure intro", "Well-Architected Framework", "Regions & AZs"] },
      { d: 5, id: "w09d5", title: "Azure Admin, Security & Services", topics: ["Cost management", "CLI vs PowerShell", "Network Security Groups", "Entra ID & RBAC", "Key Vault", "SQL / Blob / VMs / App Services"] },
    ]},
    { week: 10, label: "Week 10 · DevOps (Azure, Docker, Jenkins)", days: [
      { d: 1, id: "w10d1", title: "Azure Storage & SQL", topics: ["Blob Storage", "Storage accounts & containers", "Static site hosting", "Azure SQL", "Provisioning & connecting"] },
      { d: 2, id: "w10d2", title: "App Services & Observability", topics: ["App Services", "Hosting SPA & API", "Application Insights", "Managed Identities", "Auto-scaling", "Log streams"] },
      { d: 3, id: "w10d3", title: "Docker Concepts", topics: ["Containers vs VMs", "Docker architecture", "Images & containers", "Dockerfile", "Volumes", "Best practices"] },
      { d: 4, id: "w10d4", title: "Docker Workflows", topics: ["Docker commands", "Dockerfile keywords", "Building images", "Managing containers", "Image registry"] },
      { d: 5, id: "w10d5", title: "Jenkins & CI/CD", topics: ["Jenkins fundamentals", "CI / CD / delivery", "Jenkins jobs", "SonarCloud / SonarLint", "DevOps & Agile"] },
    ]},
    { week: 11, label: "Week 11 · AI-Enabled Engineering", days: [
      { d: 1, id: "w11d1", title: "CI/CD Integration", topics: ["CI/CD test integration", "Jenkins pipelines", "Test integration best practices", "Debugging pipelines"] },
      { d: 2, id: "w11d2", title: "Intro to AI & Tooling", topics: ["AI vs ML", "LLM overview", "Prompt engineering", "GenAI overview", "GitHub Copilot", "Preventing hallucinations"] },
      { d: 3, id: "w11d3", title: "GenAI Activities", topics: ["GenAI API development", "Responsible AI use", "AI security considerations", "Secure GenAI development"] },
      { d: 4, id: "w11d4", title: "Code Generation", topics: ["AI code generation", "Unit test generation", "Reviewing generated code", "Guardrails"] },
    ]},
  ],
};
