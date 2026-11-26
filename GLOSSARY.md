# Glossary

Terms used in Snapbike. Code identifiers are English; the app's copy is Swedish.

| Code | App (Swedish) | Meaning |
| --- | --- | --- |
| `Job` | jobb | One customer's bike in the workshop: customer, bike, photo, inspection, tasks and status. Listed in the Jobb tab. |
| `Task` | åtgärd | One piece of work in a job, e.g. "Byte däck fram", with price and parts. A job has two lists: `tasks` (agreed at Mottagning) and `inspectionTasks` (the Jobblista). |
| `Product` | del / produkt | A spare part on a task, matched against stock. |
| check-in (`note` tab) | Mottagning | The first step: what the customer wants done, spoken or added from the price list. Creates tasks. |
| job list (`jobList` tab, `inspectionTasks`) | Jobblista | Tasks created from the inspection remarks; what the customer approves. Locked once sent (`sentToCustomerAt`) until Ändra; changes go out with Skicka igen or Muntligt godkänt av kund. Answered tasks show as Tidigare godkänt, unanswered ones as Tilläggsorder. |
| inspection (`inspect` tab) | Besiktning | Walk-through of the bike against the checklist. Part of the same job as the check-in. |
| `InspectionItem` | besiktningspunkt | One checklist point, e.g. Däck fram (`front-tire`). |
| issue (`status: 'issue'`) | anmärkning | An inspection point with a problem. Tasks linked to a point (`inspectionItemIds`) show as pre-filled remarks. |
| `Employee` (`stepEmployees`) | mekaniker | A person in BikeOffice's `user_settings.employees`, by id. Each job stores who did Mottagning (`received_by`), Besiktning (`inspected_by`) and the work (`worked_by`); Klar asks when nobody is chosen. |
| `bikeNumber` | cykelnummer / bricka | The workshop tag number on the bike. |
