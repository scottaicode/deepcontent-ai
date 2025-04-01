import Link from "next/link";

export default function TargetPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="w-full mb-12 text-center">
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Select Content Target
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Choose the type and format of content you want to create
        </p>
      </div>

      {/* Content Form */}
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg overflow-hidden border p-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">✓</div>
            <span className="text-sm mt-2 font-medium">My Idea</span>
          </div>
          <div className="h-1 flex-1 bg-blue-600 mx-2"></div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
            <span className="text-sm mt-2 font-medium">Target</span>
          </div>
          <div className="h-1 flex-1 bg-gray-200 mx-2"></div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold">3</div>
            <span className="text-sm mt-2 text-gray-500">Follow-up</span>
          </div>
        </div>

        <form className="space-y-6">
          {/* Content Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Content Type:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="border rounded-lg p-4 flex flex-col items-center hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="text-lg font-medium">Emails</div>
                <div className="text-xs text-gray-500 text-center mt-1">Sales, newsletters, customer communications</div>
              </div>
              <div className="border rounded-lg p-4 flex flex-col items-center hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="text-lg font-medium">Blog</div>
                <div className="text-xs text-gray-500 text-center mt-1">Personal, business, platform-specific</div>
              </div>
              <div className="border rounded-lg p-4 flex flex-col items-center hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="text-lg font-medium">Social Media</div>
                <div className="text-xs text-gray-500 text-center mt-1">Facebook, Instagram, X, LinkedIn, TikTok</div>
              </div>
              <div className="border rounded-lg p-4 flex flex-col items-center hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="text-lg font-medium">Ads</div>
                <div className="text-xs text-gray-500 text-center mt-1">Facebook, Google, LinkedIn, Display Ads</div>
              </div>
              <div className="border rounded-lg p-4 flex flex-col items-center hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="text-lg font-medium">Scripts</div>
                <div className="text-xs text-gray-500 text-center mt-1">Video, podcast, vlog scripts</div>
              </div>
              <div className="border rounded-lg p-4 flex flex-col items-center hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="text-lg font-medium">Website</div>
                <div className="text-xs text-gray-500 text-center mt-1">Copy and design for WordPress</div>
              </div>
            </div>
          </div>

          {/* Content Style Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Your Content Style:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="text-lg font-medium mb-1">Professional</div>
                <div className="text-sm text-gray-600 mb-2">Professional, authoritative, and informative</div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Formality: 4/5</span>
                  <span>Reading Level: Grade 10</span>
                </div>
              </div>
              <div className="border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="text-lg font-medium mb-1">Casual</div>
                <div className="text-sm text-gray-600 mb-2">Friendly, conversational, and approachable</div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Formality: 2/5</span>
                  <span>Reading Level: Grade 7</span>
                </div>
              </div>
              <div className="border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="text-lg font-medium mb-1">Funny & Concise</div>
                <div className="text-sm text-gray-600 mb-2">Humorous, witty, and to the point</div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Formality: 1/5</span>
                  <span>Reading Level: Grade 4</span>
                </div>
              </div>
              <div className="border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-colors">
                <div className="text-lg font-medium mb-1">Authoritative</div>
                <div className="text-sm text-gray-600 mb-2">Authoritative, serious, and detailed</div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Formality: 5/5</span>
                  <span>Reading Level: Grade 12</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Link 
              href="/create"
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
            >
              Back
            </Link>
            <Link 
              href="/create/followup"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Next: Follow-up Questions
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
} 