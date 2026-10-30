# Course reflection

The most difficult concept for me was understanding how database transactions prevent conflicts when several people use an application at the same time. I initially thought checking whether a seat was available before saving an order would be enough. I overcame this by tracing two buyers trying to reserve the same seat, step by step. That example helped me understand why checking and updating must happen within one transaction, with locks and constraints protecting the data.

Based on the feedback I received, I would improve how my capstone handles invalid input and explains errors to users. The feedback highlighted that the main flow was easier to follow than the recovery steps when something went wrong. I would add clearer validation messages, preserve entered information after a failed submission, and make the next action obvious. I would check these changes using empty fields, incorrect values and repeated submissions, then ask someone to try the flow without guidance.

Next, I want to learn backend development with Node.js, Express and PostgreSQL. I plan to build a small booking API with user authentication, temporary reservations and database transactions. This would help me connect the API design, database relationships and scaling ideas from the course to a working application that I can test and improve.
