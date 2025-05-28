import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { API_URL, SOCKET_URL } from './config';

function ConnectionTest() {
  const [apiStatus, setApiStatus] = useState('testing');
  const [socketStatus, setSocketStatus] = useState('testing');
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    testConnections();
  }, []);

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, { test, status, message, timestamp: new Date() }]);
  };

  const testConnections = async () => {
    // Test API connection
    try {
      addResult('API Connection', 'testing', `Testing connection to ${API_URL}`);
      const response = await fetch(API_URL);
      if (response.ok) {
        setApiStatus('connected');
        addResult('API Connection', 'success', 'Backend API is responding');
      } else {
        setApiStatus('error');
        addResult('API Connection', 'error', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setApiStatus('error');
      addResult('API Connection', 'error', `Connection failed: ${error.message}`);
    }

    // Test Socket.IO connection
    try {
      addResult('Socket.IO Connection', 'testing', `Testing Socket.IO connection to ${SOCKET_URL}`);
      const socket = io(SOCKET_URL, {
        timeout: 5000,
        autoConnect: false
      });

      socket.on('connect', () => {
        setSocketStatus('connected');
        addResult('Socket.IO Connection', 'success', 'Socket.IO connected successfully');
        socket.disconnect();
      });

      socket.on('connect_error', (error) => {
        setSocketStatus('error');
        addResult('Socket.IO Connection', 'error', `Socket connection failed: ${error.message}`);
      });

      socket.connect();

      // Timeout after 5 seconds
      setTimeout(() => {
        if (socketStatus === 'testing') {
          setSocketStatus('timeout');
          addResult('Socket.IO Connection', 'error', 'Connection timeout after 5 seconds');
          socket.disconnect();
        }
      }, 5000);

    } catch (error) {
      setSocketStatus('error');
      addResult('Socket.IO Connection', 'error', `Socket setup failed: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#10b981';
      case 'error': return '#ef4444';
      case 'testing': return '#f59e0b';
      case 'timeout': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return '✅';
      case 'error': return '❌';
      case 'testing': return '🔄';
      case 'timeout': return '⏰';
      default: return '❓';
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <h2 style={{ color: '#1f2937', marginBottom: '20px' }}>Backend Connection Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#374151' }}>Connection Status</h3>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{getStatusIcon(apiStatus)}</span>
            <span style={{ color: getStatusColor(apiStatus), fontWeight: 'bold' }}>
              API: {apiStatus.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{getStatusIcon(socketStatus)}</span>
            <span style={{ color: getStatusColor(socketStatus), fontWeight: 'bold' }}>
              Socket.IO: {socketStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ color: '#374151' }}>Test Results</h3>
        <div style={{ 
          backgroundColor: '#000', 
          color: '#00ff00', 
          padding: '15px', 
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {testResults.map((result, index) => (
            <div key={index} style={{ marginBottom: '5px' }}>
              <span style={{ color: '#888' }}>
                [{result.timestamp.toLocaleTimeString()}]
              </span>
              <span style={{ 
                color: result.status === 'success' ? '#00ff00' : 
                       result.status === 'error' ? '#ff4444' : '#ffaa00',
                marginLeft: '8px'
              }}>
                {result.test}: {result.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e0f2fe', borderRadius: '4px' }}>
        <h4 style={{ color: '#0277bd', margin: '0 0 10px 0' }}>Configuration</h4>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>API URL:</strong> {API_URL}
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>Socket URL:</strong> {SOCKET_URL}
        </p>
      </div>

      <button 
        onClick={testConnections}
        style={{
          marginTop: '15px',
          padding: '10px 20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Test Again
      </button>
    </div>
  );
}

export default ConnectionTest; 