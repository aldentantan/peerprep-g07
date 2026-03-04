import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Textarea } from "@/app/components/ui/textarea";
import { 
  Code2, 
  MessageSquare, 
  Users, 
  Save, 
  Play, 
  LogOut,
  User,
  Send,
  Settings,
  Maximize2,
  Zap,
  Radio
} from "lucide-react";

interface CollaborationWorkspaceProps {
  onLeaveSession?: () => void;
}

export function CollaborationWorkspace({ onLeaveSession }: CollaborationWorkspaceProps) {
  const mockUsers = [
    { id: 1, name: "You", status: "online" },
    { id: 2, name: "John Wong Zhian", status: "online" },
  ];

  const mockMessages = [
    { id: 1, user: "John Wong Zhian", message: "Let's start with the brute force approach", time: "10:23 AM" },
    { id: 2, user: "You", message: "Sounds good! I'll work on the nested loops", time: "10:24 AM" },
    { id: 3, user: "John Wong Zhian", message: "Great, I'll handle the optimization part", time: "10:25 AM" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-gray-900">Collaboration Workspace</h1>
        </div>
        
        {/* Session Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-2 border-gray-300">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" size="sm" className="border-2 border-gray-300">
            <Play className="mr-2 h-4 w-4" />
            Run Code
          </Button>
          <Button variant="outline" size="sm" className="border-2 border-red-300 text-red-600 hover:bg-red-50" onClick={onLeaveSession}>
            <LogOut className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </div>
      </div>

      {/* Question Header */}
      <div className="border-4 border-gray-300 rounded-lg p-4 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="text-xl font-semibold text-gray-900">Two Sum</h2>
              <Badge className="bg-green-100 text-green-800 border border-green-300">Easy</Badge>
              <Badge variant="secondary" className="border border-gray-300">Arrays</Badge>
              <Badge variant="outline" className="border border-orange-300 bg-orange-50 text-orange-700">
                <Radio className="h-3 w-3 mr-1 animate-pulse" />
                Live Session
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Given an array of integers, return indices of the two numbers that add up to a specific target.
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-2 border-gray-300">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Matched Users Panel */}
        <div className="border-4 border-gray-300 rounded-lg p-4 bg-white space-y-3 lg:col-span-1">
          <div className="flex items-center gap-2 text-gray-800 pb-2 border-b-2 border-gray-200">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold">Participants</h3>
          </div>

          <div className="space-y-2">
            {mockUsers.map((user) => (
              <div 
                key={user.id}
                className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg bg-gray-50"
              >
                <div className="w-10 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center bg-white flex-shrink-0">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900 truncate">{user.name}</p>
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-gray-600">{user.status}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t-2 border-gray-200">
            <p className="text-xs text-gray-600 text-center">Real-time sync enabled</p>
          </div>
        </div>

        {/* Code Editor Area */}
        <div className="border-4 border-gray-300 rounded-lg p-4 bg-white space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b-2 border-gray-200">
            <div className="flex items-center gap-2 text-gray-800">
              <Code2 className="h-5 w-5" />
              <h3 className="font-semibold">Code Editor</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs border border-gray-300">JavaScript</Badge>
              <Button variant="ghost" size="sm">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Code Editor Placeholder */}
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 font-mono text-sm min-h-[400px]">
            <div className="space-y-2 text-gray-700">
              <div className="flex gap-3">
                <span className="text-gray-400 select-none">1</span>
                <span className="text-purple-600">function</span>
                <span> twoSum(nums, target) {'{'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 select-none">2</span>
                <span className="pl-4 text-gray-500">// Your code here</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 select-none">3</span>
                <span className="pl-4">
                  <span className="text-purple-600">const</span> map = 
                  <span className="text-purple-600"> new</span> Map();
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 select-none">4</span>
                <span className="pl-4"></span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 select-none">5</span>
                <span className="pl-4">
                  <span className="text-purple-600">for</span> (
                  <span className="text-purple-600">let</span> i = 0; 
                  i {'<'} nums.length; i++) {'{'}
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 select-none">6</span>
                <span className="pl-8 text-gray-400">█</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 select-none">7</span>
                <span className="pl-4">{'}'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 select-none">8</span>
                <span>{'}'}</span>
              </div>
            </div>
          </div>

          {/* Output Console */}
          <div className="border-2 border-gray-300 rounded-lg p-3 bg-gray-900 text-gray-100 font-mono text-xs min-h-[80px]">
            <div className="text-gray-400 mb-1">{'>'} Console Output:</div>
            <div className="text-green-400">Ready to run...</div>
          </div>

          <div className="text-xs text-gray-600 text-center pt-2 border-t-2 border-gray-200">
            Real-time concurrent code editing enabled
          </div>
        </div>

        {/* Chat / Comments Panel */}
        <div className="border-4 border-gray-300 rounded-lg p-4 bg-white space-y-3 lg:col-span-1">
          <div className="flex items-center gap-2 text-gray-800 pb-2 border-b-2 border-gray-200">
            <MessageSquare className="h-5 w-5" />
            <h3 className="font-semibold">Chat</h3>
          </div>

          {/* Messages */}
          <div className="space-y-3 min-h-[400px] max-h-[500px] overflow-y-auto">
            {mockMessages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm text-gray-900">{msg.user}</span>
                  <span className="text-xs text-gray-500">{msg.time}</span>
                </div>
                <div className="border-2 border-gray-300 rounded-lg p-2 bg-gray-50">
                  <p className="text-sm text-gray-700">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="pt-3 border-t-2 border-gray-200">
            <div className="flex gap-2">
              <Textarea 
                placeholder="Type a message..."
                className="min-h-[60px] border-2 border-gray-300 resize-none"
              />
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}