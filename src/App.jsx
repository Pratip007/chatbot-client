import React from 'react';
import ChatInterface from './components/ChatInterface';
import ConnectionTest from './components/ConnectionTest';

function App() {
  // Show connection test first, then chat interface
  const showConnectionTest = new URLSearchParams(window.location.search).get('test') === 'true';
  
  if (showConnectionTest) {
    return <ConnectionTest />;
  }
  
  return <ChatInterface />;
}

// const userData = {
//     userId: "1111",
//     username: "gandu"
// };

// // Store the data in sessionStorage
// sessionStorage.setItem("userData", JSON.stringify(userData));

// // To verify it's stored, you can retrieve and log it:
// const storedData = JSON.parse(sessionStorage.getItem("userData"));
// console.log(storedData);


export default App;
