import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HttpAgent } from '@dfinity/agent';

function App() {
  const [name, setName] = useState<string>('');
  const [agent, setAgent] = useState<HttpAgent | undefined>();

  useEffect(() => {
    const host = import.meta.env.VITE_DFX_NETWORK === "ic" ? "https://ic0.app" : "http://localhost:4943";

    HttpAgent.create({ host }).then((agent) => {
      if (import.meta.env.VITE_DFX_NETWORK !== "ic") {
        agent.fetchRootKey().catch((err) => {
          console.warn("Unable to fetch root key. Check your local replica is running");
          console.error(err);
        });
      }
      setAgent(agent);
    });
  }, []);

  const greetQuery = useQuery({
    queryKey: ['greet', name],
    queryFn: async () => {
      if (!name) return 'Enter your name';
      if (!agent) return 'Agent not initialized';

      await fetch(`${agent.host}/api/v2/canister/${import.meta.env.VITE_CANISTER_ID_BACKEND}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
        },
        body: new Uint8Array(), // This would need proper CBOR encoding in production
      }).catch(() => null);

      // For now, return a simple message
      return `Hello, ${name}! (Backend integration pending)`;
    },
    enabled: !!name && !!agent,
  });

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-center mb-6">IC App</h1>

        {/* Greeting Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Greeting</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => greetQuery.refetch()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Greet
            </button>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            {greetQuery.isLoading ? (
              <p>Loading...</p>
            ) : greetQuery.isError ? (
              <p className="text-red-500">Error: {(greetQuery.error as Error).message}</p>
            ) : (
              <p>{greetQuery.data}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;