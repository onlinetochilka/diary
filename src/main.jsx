import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { globalToast } from "./components/ui/Toast.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Too aggressive by default
      retry: 1, // Retry failed queries once
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error("Mutation error caught globally:", error);
      globalToast({
        message: "Ошибка сохранения. Проверьте подключение к интернету",
        type: "error",
        duration: 4000,
      });
    },
  }),
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
