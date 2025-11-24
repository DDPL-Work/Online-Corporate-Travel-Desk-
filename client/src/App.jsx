import { useState } from "react";
import "./App.css";
import Layout from "./layout/Layout";
import AppRoutes from "./routes/route";

function App() {

  return (
    <Layout>
      <AppRoutes />
    </Layout>
  );
}

export default App;
