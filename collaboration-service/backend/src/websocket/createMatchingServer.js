// const WebSocket = require('ws');
// const crypto = require('crypto');

// function createMatchingServer({ port, redisClient }) {
//     const waitingUsers = {};

//     const wss = new WebSocket.Server({ port }, () => {
//         console.log(`Matching WebSocket server is running on ws://localhost:${port}`);
//     });

//     wss.on('connection', (ws) => {
//         console.log('New client connected to matching server');

//         ws.on('message', async (message) => {
//             try {
//                 const { type, text } = JSON.parse(message);

//                 if (type === 'find_match') {
//                     if (waitingUsers[text]) {
//                         console.log('Match found, creating room');

//                         const otherWs = waitingUsers[text];
//                         delete waitingUsers[text];

//                         const roomId = crypto.randomUUID();

//                         // Fetch information from question service and store in redis
//                         const question = `
//                             Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] 
//                             where nums[i] + nums[j] + nums[k] == 0, and the indices i, j and k are all distinct.
//                             The output should not contain any duplicate triplets. 
//                             You may return the output and the triplets in any order.`;
//                         const programmingLanguage = 'python';

//                         await redisClient.hSet(`room:${roomId}`, {
//                             question,
//                             programmingLanguage
//                         });

//                         ws.send(JSON.stringify({ type: 'match_found', roomId }));
//                         otherWs.send(JSON.stringify({ type: 'match_found', roomId }));
//                     } else {
//                         if (!waitingUsers[text]) {
//                             waitingUsers[text] = ws;
//                             console.log('Waiting for match:', Object.keys(waitingUsers));
//                         }
//                     }
//                 }
//             } catch (err) {
//                 console.error('Error handling matching message:', err);
//             }
//         });

//         ws.on('close', () => {
//             console.log('Client disconnected from matching server');
//         });
//     });

//     return wss;
// }

// module.exports = {
//     createMatchingServer
// };
