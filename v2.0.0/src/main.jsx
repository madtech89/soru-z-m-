import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@/index.css";
import App from "@/App";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
