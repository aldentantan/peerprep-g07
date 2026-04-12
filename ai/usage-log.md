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

