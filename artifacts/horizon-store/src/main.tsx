import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getAuthToken } from "./hooks/useAuth";
import App from "./App";
import "./index.css";

setAuthTokenGetter(getAuthToken);

createRoot(document.getElementById("root")!).render(<App />);
