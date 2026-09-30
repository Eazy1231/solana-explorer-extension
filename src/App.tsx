import { useEffect, useState } from "react";
import superteamUkLogo from "./assets/extension-icon.jpg";
import "./App.css";
import { fetchAISummary, fetchSolanaData } from "./api/backend";
import type { NavigationContext } from "./models/navigation";

interface SolanaTransaction {
  signature: string;
  description?: string;
  timestamp?: number;
}

interface NormalizedResponse {
  transactions?: SolanaTransaction[];
  summary?: string;
}

function App() {
  const [context, setContext] = useState<NavigationContext | null>(null);
  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const activeTabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const tabId = activeTabs[0]?.id;

        if (tabId === undefined) {
          throw new Error("No active browser tab.");
        }

        const key = `solanaData:${tabId}`;
        const result = await chrome.storage.local.get(key);
        const navigation = result[key] as NavigationContext | undefined;

        if (!navigation) {
          throw new Error("Open a supported Solana explorer page.");
        }

        if (cancelled) return;
        setContext(navigation);

        const data = (await fetchSolanaData(navigation)) as NormalizedResponse;
        if (cancelled) return;

        const nextTransactions = Array.isArray(data.transactions)
          ? data.transactions
          : [];
        setTransactions(nextTransactions);

        try {
          const summary = await fetchAISummary(data);
          if (!cancelled) setAiSummary(summary);
        } catch (summaryError) {
          console.warn("AI summary unavailable.", summaryError);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load Solana data.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const handleMessage = (message: { action?: string }) => {
      if (message.action === "updateData") void load();
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    void load();

    return () => {
      cancelled = true;
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const renderData = () => {
    if (isLoading) return <p>Loading...</p>;
    if (error) return <p role="alert">{error}</p>;
    if (!context) return <p>No data available.</p>;

    const visibleTransactions =
      context.resourceType === "transaction"
        ? transactions.filter((transaction) => transaction.signature === context.resourceId)
        : transactions;

    return (
      <div>
        <p>
          <strong>Source:</strong> {context.source}
        </p>
        <p>
          <strong>Network:</strong> {context.network}
        </p>
        <p>
          <strong>{context.resourceType === "account" ? "Address" : "Transaction"}:</strong>{" "}
          {context.resourceId}
        </p>
        <p>
          <strong>AI Summary:</strong> {aiSummary || "Summary unavailable"}
        </p>
        <p>Transaction details:</p>
        <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
          {visibleTransactions.map((transaction, index) => (
            <li
              key={`${transaction.signature}:${index}`}
              style={{
                marginBottom: "10px",
                border: "1px solid #ccc",
                padding: "10px",
                borderRadius: "5px",
              }}
            >
              <p>
                <strong>Transaction:</strong> {transaction.signature}
              </p>
              <p>
                <strong>Description:</strong>{" "}
                {transaction.description || "Unavailable"}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {transaction.timestamp
                  ? new Date(transaction.timestamp * 1000).toLocaleString()
                  : "Unavailable"}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      <div>
        <a href="https://uk.superteam.fun" target="_blank" rel="noreferrer">
          <img src={superteamUkLogo} className="logo" alt="Solana Explorer" />
        </a>
      </div>
      <h1>Mini Solana Explorer</h1>
      <div className="card">{renderData()}</div>
      <p className="read-the-docs">© 2024 Made with ❤️ for Solana</p>
    </>
  );
}

export default App;
