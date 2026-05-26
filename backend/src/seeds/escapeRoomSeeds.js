const mongoose = require('mongoose');
const { EscapeRoom } = require('../modules/escape-room/escapeRoom.model');
const env = require('../config/env');

const rooms = [
  {
    title: "Crashed Server Room",
    description: "The main API server has crashed. You need to repair the broken code, find the missing variable in the logs, and restore the network routes before the security lockdown triggers.",
    theme: "server_room",
    difficulty: "beginner",
    time_limit_seconds: 900, // 15 mins
    xp_reward: 100,
    badge_key: "bug_hunter",
    is_active: true,
    puzzles: [
      {
        puzzle_id: "syntax_repair_1",
        type: "code_repair",
        title: "Fix the User Fetcher",
        description: "The authentication loop is broken. Fix the syntax to allow users to login.",
        initial_state: {
          code: "function authUser(user) {\n  if user.role = 'admin' {\n    return true\n  }\n  return false;\n}",
          language: "javascript",
          missing_tokens: ["(", ")", "==="]
        },
        solution: {
          code: "function authUser(user) {\n  if (user.role === 'admin') {\n    return true\n  }\n  return false;\n}"
        },
        hints: ["Look at the if statement condition syntax.", "Assignment (=) is not equality (===).", "JavaScript if statements need parentheses ()."],
        max_score: 100,
        order: 1
      },
      {
        puzzle_id: "terminal_logs_1",
        type: "terminal",
        title: "Find the Error in Logs",
        description: "The server crashed. Navigate the terminal and read the crash log to find the missing variable.",
        initial_state: {
          filesystem: {
            "var": {
              "log": {
                "crash.log": "FATAL ERROR: Variable 'API_SECRET' is undefined.",
                "auth.log": "User logged in.",
              }
            }
          },
          current_path: "/"
        },
        solution: {
          command_sequence: ["cd var", "cd log", "cat crash.log"],
          answer_keyword: "API_SECRET"
        },
        hints: ["Try changing directories using 'cd'.", "The logs are usually stored in /var/log.", "Use 'cat crash.log' to read the file."],
        max_score: 100,
        order: 2
      },
      {
        puzzle_id: "logic_flow_1",
        type: "logic_flow",
        title: "Restore Server Boot Sequence",
        description: "Arrange the boot sequence blocks in the correct order to restart the server.",
        initial_state: {
          blocks: [
            { id: "b1", text: "Start HTTP Listener on port 8080" },
            { id: "b2", text: "Load Configuration Variables" },
            { id: "b3", text: "Connect to MongoDB" },
            { id: "b4", text: "Initialize Express App" }
          ]
        },
        solution: {
          correct_order: ["b2", "b4", "b3", "b1"]
        },
        hints: ["You can't connect to the DB without config.", "The app needs to exist before listening.", "Order: Config -> App -> DB -> Listen"],
        max_score: 100,
        order: 3
      }
    ]
  }
];

const seedEscapeRooms = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.mongo.uri);
    
    console.log('Clearing existing rooms...');
    await EscapeRoom.deleteMany({});
    
    console.log('Inserting default rooms...');
    await EscapeRoom.insertMany(rooms);
    
    console.log('Escape Rooms seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding escape rooms:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedEscapeRooms();
}

module.exports = seedEscapeRooms;
