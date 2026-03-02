-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    question_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    constraints TEXT,
    test_cases JSONB NOT NULL DEFAULT '[]',
    leetcode_link VARCHAR(500),
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    topics TEXT[] NOT NULL DEFAULT '{}',
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed with 20 sample questions
INSERT INTO questions (title, description, constraints, test_cases, leetcode_link, difficulty, topics)
VALUES
(
    'Reverse a String',
    'Write a function that reverses a string. The input string is given as an array of characters s. You must do this by modifying the input array in-place with O(1) extra memory.',
    E'1 <= s.length <= 10^5\ns[i] is a printable ascii character.',
    '[
        {"input": "s = [\"h\",\"e\",\"l\",\"l\",\"o\"]", "output": "[\"o\",\"l\",\"l\",\"e\",\"h\"]"},
        {"input": "s = [\"H\",\"a\",\"n\",\"n\",\"a\",\"h\"]", "output": "[\"h\",\"a\",\"n\",\"n\",\"a\",\"H\"]"}
    ]',
    'https://leetcode.com/problems/reverse-string/',
    'Easy',
    ARRAY['Strings', 'Algorithms']
),
(
    'Linked List Cycle Detection',
    'Implement a function to detect if a linked list contains a cycle.',
    E'The number of the nodes in the list is in the range [0, 10^4].\n-10^5 <= Node.val <= 10^5\npos is -1 or a valid index in the linked-list.',
    '[
        {"input": "head = [3,2,0,-4], pos = 1", "output": "true"},
        {"input": "head = [1,2], pos = 0", "output": "true"},
        {"input": "head = [1], pos = -1", "output": "false"}
    ]',
    'https://leetcode.com/problems/linked-list-cycle/',
    'Easy',
    ARRAY['Data Structures', 'Algorithms']
),
(
    'Roman to Integer',
    'Given a roman numeral, convert it to an integer.',
    E'1 <= s.length <= 15\ns contains only the characters (''I'', ''V'', ''X'', ''L'', ''C'', ''D'', ''M'').\nIt is guaranteed that s is a valid roman numeral in the range [1, 3999].',
    '[
        {"input": "s = \"III\"", "output": "3"},
        {"input": "s = \"LVIII\"", "output": "58"},
        {"input": "s = \"MCMXCIV\"", "output": "1994"}
    ]',
    'https://leetcode.com/problems/roman-to-integer/',
    'Easy',
    ARRAY['Algorithms']
),
(
    'Add Binary',
    'Given two binary strings a and b, return their sum as a binary string.',
    E'1 <= a.length, b.length <= 10^4\na and b consist only of ''0'' or ''1'' characters.\nEach string does not contain leading zeros except for the zero itself.',
    '[
        {"input": "a = \"11\", b = \"1\"", "output": "\"100\""},
        {"input": "a = \"1010\", b = \"1011\"", "output": "\"10101\""}
    ]',
    'https://leetcode.com/problems/add-binary/',
    'Easy',
    ARRAY['Bit Manipulation', 'Algorithms']
),
(
    'Fibonacci Number',
    E'The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. That is, F(0) = 0, F(1) = 1, F(n) = F(n - 1) + F(n - 2), for n > 1. Given n, calculate F(n).',
    E'0 <= n <= 30',
    '[
        {"input": "n = 2", "output": "1"},
        {"input": "n = 3", "output": "2"},
        {"input": "n = 4", "output": "3"}
    ]',
    'https://leetcode.com/problems/fibonacci-number/',
    'Easy',
    ARRAY['Recursion', 'Algorithms']
),
(
    'Implement Stack using Queues',
    'Implement a last-in-first-out (LIFO) stack using only two queues. The implemented stack should support all the functions of a normal stack (push, top, pop, and empty).',
    E'1 <= x <= 9\nAt most 100 calls will be made to push, pop, top, and empty.\nAll the calls to pop and top are valid.',
    '[
        {"input": "[\"MyStack\",\"push\",\"push\",\"top\",\"pop\",\"empty\"], inputs: [[],[1],[2],[],[],[]]", "output": "[null,null,null,2,2,false]"}
    ]',
    'https://leetcode.com/problems/implement-stack-using-queues/',
    'Easy',
    ARRAY['Data Structures']
),
(
    'Combine Two Tables',
    E'Given table Person with columns personId (int, primary key), lastName (varchar), firstName (varchar). And table Address with columns addressId (int, primary key), personId (int), city (varchar), state (varchar).\nWrite a solution to report the first name, last name, city, and state of each person in the Person table. If the address of a personId is not present in the Address table, report null instead. Return the result table in any order.',
    NULL,
    '[{"input": {"Person": [{"personId": 1, "lastName": "Wang", "firstName": "Allen"}, {"personId": 2, "lastName": "Alice", "firstName": "Bob"}], "Address": [{"addressId": 1, "personId": 2, "city": "New York City", "state": "New York"}, {"addressId": 2, "personId": 3, "city": "Leetcode", "state": "California"}]}, "output": [{"firstName": "Allen", "lastName": "Wang", "city": null, "state": null}, {"firstName": "Bob", "lastName": "Alice", "city": "New York City", "state": "New York"}]}]',
    'https://leetcode.com/problems/combine-two-tables/',
    'Easy',
    ARRAY['Databases']
),
(
    'Repeated DNA Sequences',
    E'The DNA sequence is composed of a series of nucleotides abbreviated as ''A'', ''C'', ''G'', and ''T''.\nFor example, "ACGAATTCCG" is a DNA sequence. When studying DNA, it is useful to identify repeated sequences within the DNA.\nGiven a string s that represents a DNA sequence, return all the 10-letter-long sequences (substrings) that occur more than once in a DNA molecule. You may return the answer in any order.',
    E'1 <= s.length <= 10^5\ns[i] is either ''A'', ''C'', ''G'', or ''T''.',
    '[
        {"input": "s = \"AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT\"", "output": "[\"AAAAACCCCC\",\"CCCCCAAAAA\"]"},
        {"input": "s = \"AAAAAAAAAAAAA\"", "output": "[\"AAAAAAAAAA\"]"}
    ]',
    'https://leetcode.com/problems/repeated-dna-sequences/',
    'Medium',
    ARRAY['Algorithms', 'Bit Manipulation', 'Strings']
),
(
    'Course Schedule',
    'There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return true if you can finish all courses. Otherwise, return false.',
    E'1 <= numCourses <= 2000\n0 <= prerequisites.length <= 5000\nprerequisites[i].length == 2\n0 <= ai, bi < numCourses\nAll the pairs prerequisites[i] are unique.',
    '[
        {"input": "numCourses = 2, prerequisites = [[1,0]]", "output": "true"},
        {"input": "numCourses = 2, prerequisites = [[1,0],[0,1]]", "output": "false"}
    ]',
    'https://leetcode.com/problems/course-schedule/',
    'Medium',
    ARRAY['Data Structures', 'Algorithms']
),
(
    'LRU Cache Design',
    'Design and implement an LRU (Least Recently Used) cache.',
    E'1 <= capacity <= 3000\n0 <= key <= 10^4\n0 <= value <= 10^5\nAt most 2 * 10^5 calls will be made to get and put.',
    '[
        {"input": "[\"LRUCache\",\"put\",\"put\",\"get\",\"put\",\"get\",\"put\",\"get\",\"get\",\"get\"], [[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]", "output": "[null,null,null,1,null,-1,null,-1,3,4]"}
    ]',
    'https://leetcode.com/problems/lru-cache/',
    'Medium',
    ARRAY['Data Structures']
),
(
    'Longest Common Subsequence',
    'Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0. A subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.',
    E'1 <= text1.length, text2.length <= 1000\ntext1 and text2 consist of only lowercase English characters.',
    '[
        {"input": "text1 = \"abcde\", text2 = \"ace\"", "output": "3"},
        {"input": "text1 = \"abc\", text2 = \"abc\"", "output": "3"},
        {"input": "text1 = \"abc\", text2 = \"def\"", "output": "0"}
    ]',
    'https://leetcode.com/problems/longest-common-subsequence/',
    'Medium',
    ARRAY['Strings', 'Algorithms']
),
(
    'Rotate Image',
    'You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise). You have to rotate the image in-place.',
    E'n == matrix.length == matrix[i].length\n1 <= n <= 20\n-1000 <= matrix[i][j] <= 1000',
    '[
        {"input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]", "output": "[[7,4,1],[8,5,2],[9,6,3]]"},
        {"input": "matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]", "output": "[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]"}
    ]',
    'https://leetcode.com/problems/rotate-image/',
    'Medium',
    ARRAY['Arrays', 'Algorithms']
),
(
    'Airplane Seat Assignment Probability',
    'n passengers board an airplane with exactly n seats. The first passenger has lost the ticket and picks a seat randomly. But after that, the rest of the passengers will take their own seat if it is still available, and pick other seats randomly when they find their seat occupied. Return the probability that the nth person gets his own seat.',
    E'1 <= n <= 10^9',
    '[
        {"input": "n = 1", "output": "1.00000"},
        {"input": "n = 2", "output": "0.50000"}
    ]',
    'https://leetcode.com/problems/airplane-seat-assignment-probability/',
    'Medium',
    ARRAY['Brainteaser']
),
(
    'Validate Binary Search Tree',
    'Given the root of a binary tree, determine if it is a valid binary search tree (BST).',
    E'The number of nodes in the tree is in the range [1, 10^4].\n-2^31 <= Node.val <= 2^31 - 1',
    '[
        {"input": "root = [2,1,3]", "output": "true"},
        {"input": "root = [5,1,4,null,null,3,6]", "output": "false"}
    ]',
    'https://leetcode.com/problems/validate-binary-search-tree/',
    'Medium',
    ARRAY['Data Structures', 'Algorithms']
),
(
    'Sliding Window Maximum',
    'You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position. Return the max sliding window.',
    E'1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\n1 <= k <= nums.length',
    '[
        {"input": "nums = [1,3,-1,-3,5,3,6,7], k = 3", "output": "[3,3,5,5,6,7]"},
        {"input": "nums = [1], k = 1", "output": "[1]"}
    ]',
    'https://leetcode.com/problems/sliding-window-maximum/',
    'Hard',
    ARRAY['Arrays', 'Algorithms']
),
(
    'N-Queen Problem',
    'The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other. Given an integer n, return all distinct solutions to the n-queens puzzle. You may return the answer in any order. Each solution contains a distinct board configuration of the n-queens placement, where ''Q'' and ''.'' both indicate a queen and an empty space, respectively.',
    E'1 <= n <= 9',
    '[
        {"input": "n = 4", "output": "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]"},
        {"input": "n = 1", "output": "[\"Q\"]"}
    ]',
    'https://leetcode.com/problems/n-queens/',
    'Hard',
    ARRAY['Algorithms']
),
(
    'Serialize and Deserialize a Binary Tree',
    'Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment. Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.',
    E'The number of nodes in the tree is in the range [0, 10^4].\n-1000 <= Node.val <= 1000',
    '[
        {"input": "root = [1,2,3,null,null,4,5]", "output": "[1,2,3,null,null,4,5]"},
        {"input": "root = []", "output": "[]"}
    ]',
    'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/',
    'Hard',
    ARRAY['Data Structures', 'Algorithms']
),
(
    'Wildcard Matching',
    E'Given an input string s and a pattern p, implement wildcard pattern matching with support for ''?'' and ''*'' where ''?'' matches any single character and ''*'' matches any sequence of characters (including the empty sequence). The matching should cover the entire input string (not partial).',
    E'0 <= s.length, p.length <= 2000\ns contains only lowercase English letters.\np contains only lowercase English letters, ''?'' or ''*''.',
    '[
        {"input": "s = \"aa\", p = \"a\"", "output": "false"},
        {"input": "s = \"aa\", p = \"*\"", "output": "true"},
        {"input": "s = \"cb\", p = \"?a\"", "output": "false"}
    ]',
    'https://leetcode.com/problems/wildcard-matching/',
    'Hard',
    ARRAY['Strings', 'Algorithms']
),
(
    'Chalkboard XOR Game',
    'You are given an array of integers nums represents the numbers written on a chalkboard. Alice and Bob take turns erasing exactly one number from the chalkboard, with Alice starting first. If erasing a number causes the bitwise XOR of all the elements of the chalkboard to become 0, then that player loses. Return true if and only if Alice wins the game, assuming both players play optimally.',
    E'1 <= nums.length <= 1000\n0 <= nums[i] <= 2^16',
    '[
        {"input": "nums = [1,1,2]", "output": "false"},
        {"input": "nums = [0,1]", "output": "false"},
        {"input": "nums = [1,2,3]", "output": "true"}
    ]',
    'https://leetcode.com/problems/chalkboard-xor-game/',
    'Hard',
    ARRAY['Brainteaser']
),
(
    'Trips and Users',
    E'Given table Trips with columns id (int, primary key), client_id (int), driver_id (int), city_id (int), status (enum: completed, cancelled_by_driver, cancelled_by_client), request_at (date). And table Users with columns users_id (int, primary key), banned (enum: Yes, No), role (enum: client, driver, partner).\nWrite a solution to find the cancellation rate of requests with unbanned users (both client and driver must not be banned) each day between "2013-10-01" and "2013-10-03". Round Cancellation Rate to two decimal points. Return the result table in any order.',
    NULL,
    '[
        {
            "input": {
            "Trips": [
                {"id": 1, "client_id": 1, "driver_id": 10, "city_id": 1, "status": "completed", "request_at": "2013-10-01"},
                {"id": 2, "client_id": 2, "driver_id": 11, "city_id": 1, "status": "cancelled_by_driver", "request_at": "2013-10-01"},
                {"id": 3, "client_id": 3, "driver_id": 12, "city_id": 6, "status": "completed", "request_at": "2013-10-01"},
                {"id": 4, "client_id": 4, "driver_id": 13, "city_id": 6, "status": "cancelled_by_client", "request_at": "2013-10-01"},
                {"id": 5, "client_id": 1, "driver_id": 10, "city_id": 1, "status": "completed", "request_at": "2013-10-02"},
                {"id": 6, "client_id": 2, "driver_id": 11, "city_id": 6, "status": "completed", "request_at": "2013-10-02"},
                {"id": 7, "client_id": 3, "driver_id": 12, "city_id": 6, "status": "completed", "request_at": "2013-10-02"},
                {"id": 8, "client_id": 2, "driver_id": 12, "city_id": 12, "status": "completed", "request_at": "2013-10-03"},
                {"id": 9, "client_id": 3, "driver_id": 10, "city_id": 12, "status": "completed", "request_at": "2013-10-03"},
                {"id": 10, "client_id": 4, "driver_id": 13, "city_id": 12, "status": "cancelled_by_driver", "request_at": "2013-10-03"}
            ],
            "Users": [
                {"users_id": 1, "banned": "No", "role": "client"},
                {"users_id": 2, "banned": "Yes", "role": "client"},
                {"users_id": 3, "banned": "No", "role": "client"},
                {"users_id": 4, "banned": "No", "role": "client"},
                {"users_id": 10, "banned": "No", "role": "driver"},
                {"users_id": 11, "banned": "No", "role": "driver"},
                {"users_id": 12, "banned": "No", "role": "driver"},
                {"users_id": 13, "banned": "No", "role": "driver"}
            ]
            },
            "output": [
            {"Day": "2013-10-01", "Cancellation Rate": 0.33},
            {"Day": "2013-10-02", "Cancellation Rate": 0.00},
            {"Day": "2013-10-03", "Cancellation Rate": 0.50}
            ]
        }
    ]',
    'https://leetcode.com/problems/trips-and-users/',
    'Hard',
    ARRAY['Databases']
);