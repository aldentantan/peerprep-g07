import './App.css'
import MatchingPage from './components/MatchingPage'
import { Routes, Route } from 'react-router-dom'
import CodingSpace from './components/CodingSpace'

export default function App() {
  return (
    <Routes>
      <Route 
        path="/" 
        element={<MatchingPage/>} 
      />
      <Route 
        path="/codingspace" 
        element={<CodingSpace/>} 
      />
    </Routes>
  )
}