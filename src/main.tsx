import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/raleway/300.css";
import "@fontsource/raleway/400.css";
import "@fontsource/raleway/500.css";
import "@fontsource/raleway/600.css";
import "@fontsource/raleway/700.css";
import "@fontsource/raleway/800.css";
import "@fontsource/raleway/900.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
