"use client"

import { useEffect } from "react"
import { Provider } from "react-redux"
import { createStore, combineReducers } from "redux"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"

import "./main.scss"

import Spinner from "./components/ui/Spinner/Spinner"
import { suppressResizeObserverErrors } from "./helpers/errorHandler"

import UserReducer from "./store/reducers/user"
import ModalReducer from "./store/reducers/modal"
import SpinnerReducer from "./store/reducers/spinner"
import DarkModeReducer from "./store/reducers/darkmode"

import ReaderMobilePage from "./pages/ReaderMobile"

const rootReducer = combineReducers({
  UserState: UserReducer,
  ModalState: ModalReducer,
  SpinnerState: SpinnerReducer,
  DarkModeState: DarkModeReducer,
})

const store = createStore(rootReducer)

function App() {
  // Suppress ResizeObserver errors on app initialization
  useEffect(() => {
    suppressResizeObserverErrors()
  }, [])

  return (
    <div className="typo">
      <Provider store={store}>
        <Router>
          <Routes>
            <Route path="/library/reader/mobile" element={<ReaderMobilePage />} />
          </Routes>
        </Router>
        <Spinner />
      </Provider>
    </div>
  )
}

export default App
