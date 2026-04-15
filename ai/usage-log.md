# Date/Time:
2026-03-19 16:27

# Tool:
GitHub Copilot

# Prompt/Command:
Integrate frontend of collaboration service to the frontend of the whole project

# Output Summary:
Replicate mock frontend of collaboration service to frontend of the whole project together and correct the backend routes and imports

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Open the application on localhost and visually confirmed the functionality and UI features of the collaboration page


# Date/Time:
2026-03-23 11:34

# Tool:
GitHub Copilot

# Prompt/Command:
Chatbox is too big, make it fit to the remaining space on the right side of the collaboration page. Also, if I am sending the message, make my username and timestamp aligned to the right and if its by the other user then align to the left

# Output Summary:
Layout of collaboration page is adjusted with chat panel resized to fit the remaining space on the right. Chat messages are correctly aligned

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Open the application on localhost and visually confirm the UI changes


# Date/Time:
2026-03-23 16:14

# Tool:
GitHub Copilot

# Prompt/Command:
Implement user presence in participant list by keeping track of room participant in the redis collab and update it whenever user leaves or join

# Output Summary:
Added participantUsername as a field in the collab redis. Added functions that tracks users leaving and joining the room. keep tracks of the participant list while dynamically changing  the list based on users leaving and joining the room.

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Open the application on localhost and visually confirm the UI changes and test edge cases


# Date/Time:
2026-03-24 11:23

# Tool:
GitHub Copilot

# Prompt/Command:
After getting room data, use the difficulty and topic to randomly select a question from the question service and replace roomData.question

# Output Summary:
Created an API workflow that fetches question from question-service

# Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

# Author Notes:
Question that they generate for each user is different due to Math.random(). Made selection deterministic by hashing roomId and using it as the seed. Open the application on localhost and visually confirm the UI changes and test edge cases

# Date/Time:
2026-03-25 20:13

# Tool:
GitHub Copilot

# Prompt/Command:
Make it such that when one user press the leave toom button, create a pop up notification using toast to the other user that the user has left and remove the user from the participant list

# Output Summary:
Reuse collaboration chat message websocket by creating a user_left websocket path and send a message to the other user when user leaves, triggering a alert toast


# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Open the application on localhost and visually confirm the UI changes and test edge cases

# Date/Time:
2026-04-05 12:32

# Tool:
GitHub Copilot

# Prompt/Command:
When i close the page and reopen the page, there is a huge recursive message of user leaving and joining the page, explain the cause and fix the bug

# Output Summary:
Provided explanation on what is required to fix the bug. Memoized functions using useCallBack to stop calling of functions on each render


# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Open the application on localhost and visually confirm the UI changes and test edge cases

# Date/Time:
2026-04-05 16:56

# Tool:
GitHub Copilot

# Prompt/Command:
Include images below the question description if question retrieve has images and make the question description UI look better.

# Output Summary:
Added imageUrl as one of the variables received from question service and display it on the frontend. Added sentence separation and border for question description.


# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Open the application on localhost and visually confirm the UI changes and test edge cases

# Date/Time:
2026-04-07 18:36

# Tool:
GitHub Copilot

# Prompt/Command:
Include a 60s window where the rooms will not be deleted to allow users that close page or refresh to enter back

# Output Summary:
Create a room timer mapping to store rooms that are required to be closed and set a timeout of 60s on the delete room function. When the user re-enters to the collaboration page, the mapping is deleted and the delete function does not run.


# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Open the application on localhost and visually confirm the UI changes and test edge cases

# Date/Time:
2026-04-08 13:16

# Tool:
GitHub Copilot

# Prompt/Command:
Based on the code in the collaboration service, generate a detailed ReadMe

# Output Summary
Detailed ReadMe generated, showing all the different functions and API routes and parameters

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Read through and verified the correctness of the things written


# Date/Time:
2026-04-12 13:35

# Tool:
GitHub Copilot (model: Claude Opus 4.6)

# Prompt/Command:
Explain how the code execution service works across three areas: sandboxed execution, output capture, and security/resource limits. Follow-up prompts to clarify Piston, Docker setup, language mapping, and the full request flow from frontend to Piston.

# Output Summary:
Provided detailed explanations of the code execution architecture, Piston sandbox engine, Docker Compose setup (piston, piston-init, code-execution-service containers), language mapping via LANGUAGE_CONFIG, and the full request chain (frontend → API Gateway → Code Execution Service → Piston). Generated presentation-ready bullet points for each topic.
# Date/Time:
2026-02-21 21:06

# Tool:
GitHub Copilot

# Prompt/Command:
Create the questions table with title, description, difficulty, topics, test cases, and timestamps

# Output Summary:
Added the PostgreSQL schema for storing questions, including constraints for difficulty and a trigger to update timestamps automatically

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Started the question service and confirmed the table, constraints, and timestamp trigger were created correctly in Postgres


# Date/Time:
2026-02-22 18:07

# Tool:
GitHub Copilot

# Prompt/Command:
Let GET /questions filter by difficulty and multiple topics

# Output Summary:
Added support for filtering questions by difficulty and comma-separated topics in the query string

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Tested the endpoint with Postman using single-topic, multi-topic, and combined difficulty filters


# Date/Time:
2026-03-07 00:13

# Tool:
GitHub Copilot

# Prompt/Command:
Protect create, update, and delete question routes with admin auth

# Output Summary:
Added bearer token middleware that checks the user role through the user service before allowing admin-only actions

# Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

# Author Notes:
Used explanations as basis for presentation slides. Refined wording for audience clarity.


# Date/Time:
2026-04-12 00:00

# Tool:
GitHub Copilot (model: Claude Opus 4.6)

# Prompt/Command:
Verify architecture diagram against codebase — check all service connections, databases, Redis instances, and missing components.

# Output Summary:
Identified that the diagram was missing Piston under Code Execution Service and the Question Service → User Service auth check arrow. Also clarified that for a deployment diagram, AWS RDS, S3, and Elastic Beanstalk boundaries should be shown.
Adjusted the role check to match the actual internal auth route and verified 401, 403, and 200 responses with test tokens


# Date/Time:
2026-03-22 16:28

# Tool:
GitHub Copilot

# Prompt/Command:
Allow question images to be uploaded and saved as URLs

# Output Summary:
Added multipart image upload handling, file validation, S3 integration, and image URL storage for question create and update flows

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Used findings to update architecture/deployment diagram for presentation.


# Date/Time:
2026-04-12 00:00

# Tool:
GitHub Copilot (model: Claude Opus 4.6)

# Prompt/Command:
Create a README for the code execution service, similar to how the other services have done.

# Output Summary:
Generated a full README covering: what the service does, tech stack, project structure, supported languages table, API endpoints with request/response examples, resource limits, environment variables, and how to run.
Uploaded PNG and JPG files through Postman and confirmed the returned image URLs were stored and could be removed correctly


# Date/Time:
2026-03-29 15:12

# Tool:
GitHub Copilot

# Prompt/Command:
Add a cron job to pull questions from LeetCode into the database

# Output Summary:
Added a scheduler that fetches LeetCode problems, maps the fields to the local schema, and stores sync progress in the database

# Action Taken:
- [ ] Accepted as-is
- [x] Modified
- [ ] Rejected

# Author Notes:
Read through and verified correctness against the actual codebase. Fixed a typo in the generated text.


# Date/Time:
2026-04-12 00:00

# Tool:
GitHub Copilot (model: Claude Opus 4.6)

# Prompt/Command:
Create a README for the frontend, similar to how the other services have done.

# Output Summary:
Generated a full README covering: what the frontend does, tech stack, project structure, screens table with access levels, environment variables, Nginx configuration, and how to run.
The initial version needed cleanup for incomplete upstream data, so retry logic and stricter content checks were added after testing


# Date/Time:
2026-03-30 17:38

# Tool:
GitHub Copilot

# Prompt/Command:
Add GET /questions/random to return one question for a topic and difficulty

# Output Summary:
Added a random question endpoint with query validation and a 404 response when no matching question exists

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Read through and verified correctness against the actual codebase.


# Date/Time:
2026-04-12 13:15

# Tool:
GitHub Copilot (model: Claude Opus 4.6)

# Prompt/Command:
Create a README for the API gateway, similar to how the other services have done.

# Output Summary:
Generated a full README covering: what the gateway does, tech stack, project structure, full HTTP route mapping tables, WebSocket paths, middleware descriptions, proxied services, environment variables, and how to run.
Called the endpoint with valid and invalid query parameters and confirmed the response shape matched frontend needs


# Date/Time:
2026-04-04 16:32

# Tool:
GitHub Copilot

# Prompt/Command:
Add page and pageSize query params to GET /questions

# Output Summary:
Added pagination for the question list and returned total count, current page, page size, and next/previous page metadata

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Read through and verified correctness against the actual codebase and route files.


# Date/Time:
2026-04-12 00:00

# Tool:
GitHub Copilot (model: Claude Opus 4.6)

# Prompt/Command:
Change the navigation header label from "Match Dashboard" to "Matching Dashboard" in App.tsx.

# Output Summary:
Updated the navigationItems array in App.tsx to change the label string.
Tested first page, later pages, and out-of-range page requests to confirm pagination values were computed correctly


# Date/Time:
2026-04-10 02:21

# Tool:
GitHub Copilot

# Prompt/Command:
Prevent duplicate questions by title or LeetCode link

# Output Summary:
Added normalized duplicate checks and conflict responses for create and update requests when a similar question already exists

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Visually confirmed the label change in the navigation bar.
Tried creating duplicates with different spacing, trailing slashes, and query strings to confirm the service still rejected them consistently


# Date/Time:
2026-02-27 20:38

# Tool:
GitHub Copilot

# Prompt/Command:
create a basic readme for other group members that may need to use the user-services

# Output Summary:
Added a README page with a basic developer guide

# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected

# Author Notes:
Read through the README, corrected information that was wrong

# Date/Time:
2026-03-07 21:32

# Tool:
GitHub Copilot

# Prompt/Command:
is this how to ensure user-service start only after db is ready?

# Output Summary:
Fixed bug which cause improper startup

# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Tested the starting of the services and read through the logs to ensure correct startup sequence


# Date/Time:
2026-03-16 21:32

# Tool:
GitHub Copilot

# Prompt/Command:
I want to upload this to aws elastic beanstalk, what do i need to change? planning to use docker for postgres since it is just a sch project, 1 ec2 to run all services

# Output Summary:
Provided snipets on different componenets to ensure that they can work on AWS

# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Implemented the changes manually, tested manual deployment to ensure it works


# Date/Time:
2026-03-16 22:32

# Tool:
GitHub Copilot

# Prompt/Command:
update README for user service

# Output Summary:
Updated the README with new API routes

# Action Taken:
- [X] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Read through the README to enusre correct information was added


# Date/Time:
2026-03-29 17:38

# Tool:
ChatGPT

# Prompt/Command:
How to setup RDS on AWS

# Output Summary:
Guide on AWS RDS and sample code on how to use it + subsequent troubleshooting

# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected

# Author Notes:
Followed the given guide and tested the code to ensure it works


# Date/Time:
2026-03-25 10:38

# Tool:
ChatGPT

# Prompt/Command:
how should i store user's interested topics in a postgres

# Output Summary:
Gave different methods to store different topics in postgres

# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected

# Author Notes:
Selected the most suited method, whole topic selection was subsequently removed as a feature



# Date/Time:
2026-04-08 21:38

# Tool:
GitHub Copilot

# Prompt/Command:
if I want to add profile_photo_url, where do i do it

# Output Summary:
Identified different location in the frontend which needs to be changed in order to display profile photo

# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected

# Author Notes:
Modified the code to change fetch to be from user-service instead, tested locally to ensure profile photo is displayed correctly


# Date/Time:
2026-04-08 21:38

# Tool:
GitHub Copilot

# Prompt/Command:
How can I add pagination with search here

# Output Summary:
Created snippets to use in both frontend and user service

# Action Taken:
- [ ] Accepted as-is
- [X] Modified
- [ ] Rejected

# Author Notes:
Added the code manually to different files, tested to ensure that it is working


# Date/Time:
2026-04-05 16:12

# Tool:
GitHub Copilot

# Prompt/Command:
Refactor the matching Redis subscriber implementation from Redis Pub/Sub to Redis Streams using consumer groups, including event publishing to a stream and add all subscribers to the same consumer group and ensure that match events are retried by available service instances when a service goes down mid-processing of a pending match event.

# Output Summary:
Replaced Pub/Sub flow with Redis Streams in matching service: added stream consumer group setup, blocking read loop with XREADGROUP, XACK on successful processing, and stale entry recovery using XAUTOCLAIM

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Refactored from Pub-Sub to Streams because each match event should only be processed successfully by at most one matching service. Events from pub-sub result in multiple consumers processing the same event which may lead to duplicate room creations. I verified that matching events are consumed reliably and matching behaviour works exactly like before the refactor. Ensured that the following works: Match users of the same topic+difficulty+language, queue timeout, accept match timeout, matching users with relaxed algorithm, both users accept match and navigate into a collaboration room.


# Date/Time:
2026-04-12 16:05

# Tool:
GitHub Copilot

# Prompt/Command:
Currently, when the user navigates out of the matching dashboard page and triggers the alert dialog and confirms navigation to leave & cancel match, It works while the user was previously in the queue when they left the page. However, when the user is at the match found page, waiting for both users to accept the match, and a user leaves, this navigation does not "cancel" the pending match. When the user who navigated out requeues for a new match, when the previous pending match times out, their screen will still get redirected to the pending match timeout screen even though they navigated out of the page. There should be abandon_match logic when the user navigates out of the matching dashboard, a Websocket message should be emitted to the matching service which cancels the pending match for both users and removes the pending match data from Redis. The other user should also be notified by the Websocket connection with a match_abandoned message which navigates them to the match abandoned screen. Add cancel match logic when the user is at the pending match stage.

# Output Summary:
Updated matching flow to support abandon during match_pending: added abandon websocket message handling, cancel logic for pending-match state cleanup, and peer notification with match_abandoned so stale pending timeout events do not affect users after leaving the page

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Users were able to leave the matching dashboard page on the match found page without accepting match, but it was not reflected in Redis that the match was abandoned. When users requeue before the match pending timeout ends, they will be navigated to a match timeout screen once the time out does end, resulting in poor UX. Tested leaving the matching dashboard page when the 2 users were on the match found page and awaiting both users to accept. Ensured that no unintended timeout screen navigation occurs when users abandon the match at the match found page.


# Date/Time:
2026-04-11 14:18

# Tool:
GitHub Copilot

# Prompt/Command:
Refactor matching controller queue lifecycle functions so enqueue, cancel, and timeout cleanup are atomic with Redis Lua and resilient against stale state races.

# Output Summary:
Updated matching controller queue flow to use Lua-backed atomic operations for enqueue and queue removal, with snapshot guards to prevent stale cancellation or timeout from removing users who already changed state.

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Tested rapid enqueue/cancel/timeout races and confirmed users are not duplicated in queue, stale queue entries are cleaned safely, and active queue set is removed only when list becomes empty.


# Date/Time:
2026-04-11 18:42

# Tool:
GitHub Copilot

# Prompt/Command:
Implement pending match acceptance flow in matching controller: record per-user acceptance, finalize only when both accepted, and create collaboration room data after successful finalization.

# Output Summary:
Added pending match acceptance handling in matching controller with Lua-backed state transitions, mismatch/error handling, and room creation only after both users accept.

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Verified both users must accept the same pending match ID, pending state is finalized once, and users receive match_confirmed only after room data and user-room mappings are written.


# Date/Time:
2026-04-12 00:07

# Tool:
GitHub Copilot

# Prompt/Command:
Implement matching worker polling and pairing functions with exact and relaxed matching criteria, then publish pending match events to Redis stream.

# Output Summary:
Added queue polling worker logic to detect eligible queues, dequeue exact pairs first, apply relaxed medium-adjacent pairing after wait threshold, and publish pending match events through Redis streams.

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Tested exact-match and relaxed-match scenarios across topic+difficulty+language queues, confirmed queue keys are removed from active set when emptied, and verified pending events are emitted for subscriber processing.

# Date/Time:
2026-04-12 00:07

# Tool:
GitHub Copilot

# Prompt/Command:
// Each user may only hold one active matching request
if (wsConnectionStore.has(userId)) {
ws.close(1008, 'User already has an active matching request');
return;
}

this is not ideal as in a micro service architecture, each service only checks within their local memory wsConnectionMap to see if the user is already actively in a queue. change this to check the QUEUED_USERS_KEY which is located in redis so that regardless of which container of matching microservice the match request is sent to, they will always check a single source of truth for the active users in queue. upon finding that the user already has an active match request, the websocket should propagate a message back to the frontend to inform the user that they are already in a queue, and there should be a toast pop up in the frontend. create a plan for this.

# Output Summary:
Refactored the in-memory hash map of storing Websocket connections of active users in queue to instead use the QUEUED_USERS_KEY hashmap in Redis so that the duplicate user in queue issue works when the matching service scales up.

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Tested the same user logged into 2 different tabs, attempting to queue into a match at the same time. The second tab was unable to queue due to the first tab already searching in queue.


# Date/Time:
2026-04-15 19:43

# Tool:
GitHub Copilot

# Prompt/Command:
Write a detailed and clear ReadMe about the whole repository

# Output Summary:
ReadMe of the whole repository

# Action Taken:
- [x] Accepted as-is
- [ ] Modified
- [ ] Rejected

# Author Notes:
Read through the entire page and verified if the things written are correct and the all required details are present