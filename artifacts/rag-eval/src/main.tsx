import { createRoot } from "react-dom/client";
import { setSessionIdGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import { getSessionId } from "./lib/session-id";

setSessionIdGetter(() => getSessionId());

createRoot(document.getElementById("root")!).render(<App />);
