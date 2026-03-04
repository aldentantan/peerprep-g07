import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Textarea } from "@/app/components/ui/textarea";
import { 
  Code2, 
  Save, 
  Play, 
  ArrowLeft,
  Settings,
  Maximize2,
  BookOpen,
  CheckCircle2,
  XCircle
} from "lucide-react";

interface SoloWorkspaceProps {
  onBackToLibrary?: () => void;
}

export function SoloWorkspace({ onBackToLibrary }: SoloWorkspaceProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-2 border-gray-300"
            onClick={onBackToLibrary}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Solo Practice</h1>
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
        </div>
      </div>

      {/* Question Header */}
      <div className="border-4 border-gray-300 rounded-lg p-4 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">Two Sum</h2>
              <Badge className="bg-green-100 text-green-800 border border-green-300">Easy</Badge>
              <Badge variant="secondary" className="border border-gray-300">Arrays</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Given an array of integers, return indices of the two numbers that add up to a specific target.
            </p>
            
            {/* Full Problem Description */}
            <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm space-y-2">
              <div>
                <span className="font-medium text-gray-700">Example 1:</span>
                <div className="ml-4 mt-1 font-mono text-xs text-gray-600">
                  <div>Input: nums = [2,7,11,15], target = 9</div>
                  <div>Output: [0,1]</div>
                  <div className="text-gray-500">Explanation: nums[0] + nums[1] = 9</div>
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Constraints:</span>
                <ul className="ml-4 mt-1 text-xs text-gray-600 list-disc list-inside">
                  <li>2 ≤ nums.length ≤ 10⁴</li>
                  <li>-10⁹ ≤ nums[i] ≤ 10⁹</li>
                  <li>Only one valid answer exists</li>
                </ul>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-2 border-gray-300">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Code Editor Area - Larger in solo mode */}
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
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 font-mono text-sm min-h-[500px]">
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
          <div className="border-2 border-gray-300 rounded-lg p-3 bg-gray-900 text-gray-100 font-mono text-xs min-h-[100px]">
            <div className="text-gray-400 mb-1">{'>'} Console Output:</div>
            <div className="text-green-400">Ready to run...</div>
          </div>

          <div className="text-xs text-gray-600 text-center pt-2 border-t-2 border-gray-200">
            Solo practice mode - Work at your own pace
          </div>
        </div>

        {/* Right Sidebar - Notes & Test Cases */}
        <div className="space-y-4 lg:col-span-1">
          {/* Notes Panel */}
          <div className="border-4 border-gray-300 rounded-lg p-4 bg-white space-y-3">
            <div className="flex items-center gap-2 text-gray-800 pb-2 border-b-2 border-gray-200">
              <BookOpen className="h-5 w-5" />
              <h3 className="font-semibold">Notes</h3>
            </div>

            <Textarea 
              placeholder="Write your notes, approach, or solution steps here..."
              className="min-h-[200px] border-2 border-gray-300 resize-none text-sm"
            />

            <Button variant="outline" size="sm" className="w-full border-2 border-gray-300">
              <Save className="mr-2 h-3 w-3" />
              Save Notes
            </Button>
          </div>

          {/* Test Cases Panel */}
          <div className="border-4 border-gray-300 rounded-lg p-4 bg-white space-y-3">
            <div className="flex items-center gap-2 text-gray-800 pb-2 border-b-2 border-gray-200">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="font-semibold">Test Cases</h3>
            </div>

            <div className="space-y-2">
              {/* Test Case 1 */}
              <div className="p-3 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Test Case 1</span>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-xs font-mono text-gray-600 space-y-1">
                  <div>Input: [2,7,11,15], 9</div>
                  <div className="text-green-600">Output: [0,1] ✓</div>
                </div>
              </div>

              {/* Test Case 2 */}
              <div className="p-3 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Test Case 2</span>
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                </div>
                <div className="text-xs font-mono text-gray-600 space-y-1">
                  <div>Input: [3,2,4], 6</div>
                  <div className="text-gray-400">Not run yet</div>
                </div>
              </div>

              {/* Test Case 3 */}
              <div className="p-3 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Test Case 3</span>
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-xs font-mono text-gray-600 space-y-1">
                  <div>Input: [3,3], 6</div>
                  <div className="text-red-600">Output: [0,0] ✗</div>
                  <div className="text-red-600 text-[10px]">Expected: [0,1]</div>
                </div>
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full border-2 border-blue-300 bg-blue-50 text-blue-700">
              <Play className="mr-2 h-3 w-3" />
              Run All Tests
            </Button>
          </div>
        </div>
      </div>

      {/* Layout Annotation */}
      <div className="p-4 border-2 border-dashed border-gray-400 rounded-lg bg-gray-50">
        <p className="text-sm text-gray-600 text-center">
          <span className="font-semibold">Solo Workspace Layout:</span> Large code editor area (left) • 
          Notes and test cases panels (right) • 
          Controls: Save, Run Code, Back to Library
        </p>
      </div>
    </div>
  );
}
