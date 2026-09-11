import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Migrate old hash URLs (#/shop -> /shop) so existing bookmarks keep working
const legacyHash = window.location.hash;
if (legacyHash.startsWith("#/")) {
  const [path, query] = legacyHash.slice(1).split("?");
  window.history.replaceState(null, "", query ? `${path}?${query}` : path);
}

createRoot(document.getElementById("root")!).render(<App />);
