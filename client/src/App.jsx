import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import MainLayout from "./layouts/MainLayout";
import AppRoutes from "./routes";

/**
 * App.jsx
 * Chứa các router, điều hướng router, hiển thị các trang.
 */
function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <MainLayout>
          <AppRoutes />
        </MainLayout>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
