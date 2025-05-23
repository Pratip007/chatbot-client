import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';






// Create the socket connection
const socket = io(process.env.REACT_APP_SOCKET_URL || 'https://api.urbanwealthcapitals.com/');

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);


  const query = new URLSearchParams(window.location.search);
  const userIds = query.get('userId');
  const usernames = query.get('username');
  console.log("Read data from ",userIds,usernames);

 

  // Fetch chat history from the server
  const fetchChatHistory = async (uid) => {
    if (!uid) return;
    
    setIsLoading(true);
    try {
      // Try the GET endpoint first
 let response = await fetch(`${process.env.REACT_APP_API_URL}/api/chat/history/${uid}`);
      
      // If GET fails, try the POST endpoint
      if (!response.ok) {
        console.log('GET request failed, trying POST...');
        response = await fetch(`${process.env.REACT_APP_API_URL}/api/chat/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: uid })
        });
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      
      const historyData = await response.json();
      console.log('Fetched chat history:', historyData);
      
      // Convert the history data to our message format
      const formattedMessages = historyData.map((msg) => {
        return {
          id: msg._id,
          text: msg.content,
          isBot: msg.senderType === 'bot',
          timestamp: new Date(msg.timestamp),
          username: msg.senderType === 'bot' ? 'Bot' : (msg.senderType === 'admin' ? 'Admin' : username),
          senderType: msg.senderType || 'user',
          file: msg.file ? {
            name: msg.file.originalname,
            type: msg.file.mimetype,
            data: msg.file.data
          } : null
        };
      });
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    if (userIds) {
      setUserId(userIds);
      console.log('UserId from sessionStorage:', userIds);
      // Fetch chat history when userId is available
      fetchChatHistory(userIds);
    }
    if (usernames) {
      setUsername(usernames);
      console.log('Username from sessionStorage:', usernames);
    }

    // Socket connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setSocketConnected(true);
      
      // Join user-specific room for direct messages
      if (userIds) {
        socket.emit('join', { userId: userIds });
        console.log('Joined room for user:', userIds);
      }
    });
    
    socket.on('joined', (data) => {
      console.log('Successfully joined room:', data);
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    });

    // Handle incoming messages via socket
    socket.on('message', (message) => {
      console.log('Socket message received:', message);
      
      // Format the message for our UI
      const newMessage = {
        id: message._id,
        text: message.content,
        isBot: message.senderType === 'bot',
        timestamp: new Date(message.timestamp),
        username: message.senderType === 'bot' ? 'Bot' : (message.senderType === 'admin' ? 'Admin' : username),
        senderType: message.senderType,
        file: message.file ? {
          name: message.file.originalname,
          type: message.file.mimetype,
          data: message.file.data
        } : null
      };
      
      // Add message to state, avoiding duplicates
      setMessages(prev => {
        // Check if this message already exists (by id)
        const exists = prev.some(msg => msg.id === newMessage.id);
        if (exists) {
          return prev;
        }
        return [...prev, newMessage];
      });
    });
    
    // Handle message updates
    socket.on('messageUpdated', (data) => {
      console.log('Message updated:', data);
      
      setMessages(prev => prev.map(msg => 
        msg.id === data._id 
          ? { ...msg, text: data.content, updatedAt: data.updatedAt }
          : msg
      ));
    });
    
    // Handle message deletions
    socket.on('messageDeleted', (data) => {
      console.log('Message deleted:', data);
      
      setMessages(prev => prev.map(msg => 
        msg.id === data._id 
          ? { ...msg, isDeleted: true, deletedAt: data.deletedAt }
          : msg
      ));
    });

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('joined');
      socket.off('disconnect');
      socket.off('message');
      socket.off('messageUpdated');
      socket.off('messageDeleted');
    };
  }, []);

  // Watch for changes in userId (if user logs in after page load)
  useEffect(() => {
    if (userId) {
      fetchChatHistory(userId);
      
      // Join user-specific room if socket is connected
      if (socketConnected) {
        socket.emit('join', { userId });
        console.log('Joined room for user:', userId);
      }
    }
  }, [userId, socketConnected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    // Get latest userId from sessionStorage in case it was updated
    // const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const currentUserId = userIds || userId;
    const currentUsername = usernames || username;
    
    console.log('Current username:', currentUsername);
    
    // For text-only messages, use WebSocket for instant delivery
    if (input.trim() && !selectedFile && socketConnected) {
      console.log('Sending message via WebSocket');
      
      socket.emit('sendMessage', {
        userId: currentUserId,
        text: input,
        timestamp: new Date(),
        username: currentUsername
      });
      
      setInput('');
      return;
    }
    
    // For files or when socket is not connected, use REST API
    console.log('Sending message via REST API');
    
    const formData = new FormData();
    formData.append('userId', currentUserId);
    formData.append('message', input);
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    
    console.log('Sending message request with file:', selectedFile?.name);

    try {
 const response = await fetch(`${process.env.REACT_APP_API_URL}/api/chat`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      console.log('Server response:', data);
      
      // Add messages to UI (if not already added via socket)
      const userMessage = {
        id: Date.now().toString(), // Temporary ID 
        text: input,
        isBot: false,
        timestamp: new Date(),
        username: currentUsername,
        senderType: 'user',
        file: selectedFile ? {
          name: selectedFile.name,
          type: selectedFile.type,
          data: data.fileData
        } : null
      };
      
      const botMessage = {
        id: (Date.now() + 1).toString(), // Temporary ID
        text: data.botResponse,
        isBot: true,
        timestamp: new Date(),
        username: 'Bot',
        senderType: 'bot'
      };
      
      setMessages(prev => {
        // Only add these messages if they don't already exist
        // Socket handling might have already added them
        const userExists = prev.some(msg => 
          msg.text === userMessage.text && 
          Math.abs(new Date(msg.timestamp) - new Date(userMessage.timestamp)) < 1000 &&
          msg.senderType === 'user'
        );
        
        const botExists = prev.some(msg => 
          msg.text === botMessage.text && 
          Math.abs(new Date(msg.timestamp) - new Date(botMessage.timestamp)) < 3000 &&
          msg.senderType === 'bot'
        );
        
        const newMessages = [...prev];
        if (!userExists) newMessages.push(userMessage);
        if (!botExists) newMessages.push(botMessage);
        
        return newMessages;
      });

      setInput('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };


  

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <div className="logo-container">
            <span className="header-icon">💬</span>
            <h1 className="header-title">Customer Support</h1>
          </div>
          <div className="user-container">
            <span className="user-info">
              <PersonIcon fontSize="small" className="user-icon" />
              <span className="username">{username || 'Guest'}</span>
            </span>
          </div>
        </div>
      </div>
      
      <div className="chat-messages-container">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading your conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-chat">
            <div className="welcome-message">
              <div className="welcome-icon">
                <SupportAgentIcon style={{ fontSize: '3.5rem', color: '#3b82f6' }} />
              </div>
              <h2>Welcome to Customer Support</h2>
              <p>Send a message to start chatting with our support team.</p>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message, index) => {
              const isFromUser = message.senderType === 'user';
              const isFromBot = message.senderType === 'bot';
              const isFromAdmin = message.senderType === 'admin';
              
              return (
                <div
                  key={message.id || index}
                  className={`message-row ${isFromUser ? 'user-row' : 'other-row'}`}
                >
                  {!isFromUser && (
                    <div className="avatar">
                      <div className="bot-avatar">
                        <SupportAgentIcon fontSize="small" />
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className={`message ${
                      isFromUser 
                        ? 'user-message' 
                        : isFromBot 
                          ? 'bot-message' 
                          : 'admin-message'
                    } ${message.isDeleted ? 'deleted-message' : ''}`}
                  >
                    {message.isDeleted ? (
                      <div className="message-deleted">
                        This message has been deleted
                      </div>
                    ) : (
                      <div className="message-bubble">
                        <div className="message-text">{message.text}</div>
                        
                        {message.file && (
                          <div className="message-attachment">
                            {message.file.type && message.file.type.startsWith('image/') ? (
                              <div className="image-container">
                                <img 
                                  src={message.file.data} 
                                  alt={message.file.name}
                                  className="message-image"
                                  onClick={() => window.open(message.file.data, '_blank')}
                                />
                                <div className="image-download">
                                  <a 
                                    href={message.file.data} 
                                    download={message.file.name}
                                    className="download-link"
                                  >
                                    Download
                                  </a>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="message-meta">
                      <span className="message-time">
                        {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                  
                  {isFromUser && (
                    <div className="avatar user-avatar">
                      <div className="user-avatar-inner">
                        <PersonIcon fontSize="small" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <div className="chat-input-area">
        <form className="input-form" onSubmit={handleSend}>
          {selectedFile && (
            <div className="selected-file-container">
              <div className="selected-file">
                <div className="file-info">
                  <div className="file-icon">📎</div>
                  <span className="file-name">{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  className="remove-file-button"
                  onClick={removeSelectedFile}
                >
                  <CloseIcon fontSize="small" />
                </button>
              </div>
            </div>
          )}
          
          <div className="input-container">
            <button
              type="button"
              className="attach-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <AttachFileIcon />
            </button>
            
            <input
              type="file"
              onChange={handleFileSelect}
              ref={fileInputRef}
              style={{ display: 'none' }}
              id="file-upload"
            />
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="message-input"
              disabled={isLoading}
            />
            
            <button
              type="submit"
              className="send-button"
              disabled={(!input.trim() && !selectedFile) || isLoading}
            >
              {isLoading ? (
                <div className="sending-spinner"></div>
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 900px;
          margin: 0 auto;
          border: none;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 12px 48px rgba(0,0,0,0.4);
          background: #07030c;
        }
        
        .chat-header {
          background: linear-gradient(120deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%);
          color: #0c4a6e;
          padding: 20px;
          position: relative;
          z-index: 10;
          box-shadow: 0 4px 15px rgba(56, 189, 248, 0.15);
          border-bottom: 1px solid rgba(56, 189, 248, 0.2);
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 10px;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.5);
          padding: 8px 15px;
          border-radius: 20px;
          box-shadow: 0 2px 10px rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(186, 230, 253, 0.5);
        }
        
        .header-icon {
          font-size: 24px;
          margin-right: 10px;
          color: #0284c7;
        }
        
        .header-title {
          font-size: 20px;
          font-weight: 600;
          background: linear-gradient(to right, #0c4a6e, #0369a1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: 0.5px;
        }
        
        .user-container {
          background: rgba(255, 255, 255, 0.5);
          padding: 6px 12px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          box-shadow: 0 2px 8px rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(186, 230, 253, 0.5);
        }
        
        .user-info {
          display: flex;
          align-items: center;
        }
        
        .user-icon {
          color: #0284c7 !important;
          margin-right: 5px;
        }
        
        .username {
          font-weight: 500;
          color: #0369a1;
        }
        
        .chat-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 32px 24px;
          background: linear-gradient(180deg, #0a0514 0%, #11051d 100%);
          background-attachment: fixed;
          display: flex;
          flex-direction: column;
        }
        
        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .message-row {
          display: flex;
          align-items: flex-end;
          gap: 14px;
          max-width: 85%;
        }
        
        .user-row {
          align-self: flex-end;
          margin-right: 10px;
        }
        
        .other-row {
          align-self: flex-start;
          margin-left: 10px;
        }
        
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          overflow: hidden;
          flex-shrink: 0;
        }
        
        .bot-avatar {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.5);
        }
        
        .admin-message {
          background: #1e1a24;
          color: #eee;
          border-bottom-left-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-left: 3px solid #3b82f6;
        }
        
        .user-avatar {
          background: linear-gradient(135deg, #7dd3fc, #38bdf8);
          color: white;
          position: relative;
          border: 2px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 2px 8px rgba(56, 189, 248, 0.4);
        }
        
        .user-avatar-inner {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7dd3fc, #38bdf8);
          border-radius: 50%;
        }
        
        .message {
          position: relative;
          padding: 0;
          border-radius: 18px;
          animation: fadeIn 0.3s ease-out;
          transition: transform 0.2s ease;
          max-width: 600px;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .message:hover {
          transform: translateY(-2px);
        }
        
        .bot-message {
          background: #1e1a24;
          color: #eee;
          border-bottom-left-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-left: 3px solid #3b82f6;
        }
        
        .user-message {
          background: linear-gradient(135deg, #bae6fd, #7dd3fc);
          color: #0c4a6e;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 12px rgba(56, 189, 248, 0.2);
        }
        
        .message-bubble {
          padding: 14px 18px;
        }
        
        .message-text {
          font-size: 1.05em;
          line-height: 1.5;
          word-break: break-word;
        }
        
        .message-meta {
          display: flex;
          justify-content: flex-end;
          padding: 2px 12px 8px;
        }
        
        .message-time {
          font-size: 0.75em;
          opacity: 0.8;
        }
        
        .message-deleted {
          padding: 12px 18px;
          font-style: italic;
          opacity: 0.7;
        }
        
        .chat-input-area {
          padding: 20px 24px;
          background: #0a0514;
          border-top: 1px solid rgba(59, 130, 246, 0.1);
          position: relative;
        }
        
        .input-form {
          max-width: 1100px;
          margin: 0 auto;
        }
        
        .input-container {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(30, 26, 36, 0.8);
          border-radius: 50px;
          padding: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .message-input {
          flex: 1;
          height: 42px;
          padding: 0 16px;
          border: none;
          border-radius: 30px;
          outline: none;
          background: transparent;
          color: white;
          font-size: 1.05em;
          transition: all 0.3s ease;
        }
        
        .message-input:focus {
          box-shadow: none;
        }
        
        .attach-button, 
        .send-button {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        
        .attach-button {
          background: transparent;
          color: #a9a6b0;
        }
        
        .attach-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          color: #3b82f6;
        }
        
        .send-button {
          background: linear-gradient(135deg, #38bdf8, #0284c7);
          color: white;
          box-shadow: 0 4px 12px rgba(56, 189, 248, 0.2);
        }
        
        .send-button:disabled, 
        .attach-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(56, 189, 248, 0.3);
        }
        
        .selected-file-container {
          background: rgba(30, 26, 36, 0.8);
          border-radius: 16px;
          padding: 10px 16px;
          margin-bottom: 12px;
          border-left: 3px solid #38bdf8;
          animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .selected-file {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .file-info {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #d4d0df;
        }
        
        .file-name {
          font-size: 0.95em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 300px;
        }
        
        .remove-file-button {
          background: none;
          border: none;
          color: #a9a6b0;
          cursor: pointer;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .remove-file-button:hover {
          background: rgba(255,255,255,0.1);
          color: #ef4444;
        }
        
        .message-image {
          max-width: 100%;
          height: auto;
          max-height: 300px;
          border-radius: 12px;
          
          transition: transform 0.3s ease;
        }
        
        .message-image:hover {
          transform: scale(1.02);
        }
        
        .image-container {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          
        }
        
        .image-download {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.7);
          padding: 8px;
          text-align: center;
          transform: translateY(100%);
          transition: transform 0.3s ease;
        }
        
        .image-container:hover .image-download {
          transform: translateY(0);
        }
        
        .download-link {
          color: white;
          text-decoration: none;
          font-size: 0.85em;
          font-weight: 500;
        }
        
        .file-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          transition: background 0.2s ease;
          margin-top: 10px;
        }
        
        .file-link:hover {
          background: rgba(255,255,255,0.1);
        }
        
        .file-details {
          flex: 1;
        }
        
        .file-action {
          font-size: 0.8em;
          opacity: 0.7;
          margin-top: 4px;
        }
        
        .loading-container,
        .empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(56, 189, 248, 0.1);
          border-top: 3px solid #38bdf8;
          border-radius: 50%;
          margin-bottom: 20px;
          animation: spin 1s linear infinite;
        }
        
        .sending-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-text {
          color: #a9a6b0;
          font-size: 1.1em;
        }
        
        .welcome-message {
          text-align: center;
          max-width: 450px;
          background: rgba(255,255,255,0.03);
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          animation: fadeIn 0.5s ease-out;
        }
        
        .welcome-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          filter: drop-shadow(0 4px 6px rgba(56, 189, 248, 0.3));
          background: linear-gradient(135deg, #38bdf8, #0284c7);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          margin-left: auto;
          margin-right: auto;
          border: 3px solid rgba(255, 255, 255, 0.3);
        }
        
        .welcome-message h2 {
          font-size: 1.8em;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #38bdf8, #0284c7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        
        .welcome-message p {
          color: #a9a6b0;
          font-size: 1.1em;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .chat-container {
            margin: 0;
            border-radius: 0;
            height: 100vh;
          }
          
          .chat-header {
            padding: 16px;
          }
          
          .header-content {
            flex-direction: row;
            justify-content: space-between;
            gap: 10px;
          }
          
          .header-icon {
            font-size: 1.8em;
          }
          
          .header-title {
            font-size: 1.5em;
          }
          
          .user-info {
            padding: 8px 16px;
          }
          
          .username {
            font-size: 1.1em;
          }
          
          .message-row {
            max-width: 100%;
          }
          
          .message {
            max-width: 85%;
          }
          
          .bot-message,
          .admin-message {
            max-width: 80%;
          }
          
          .message-input {
            height: 48px;
            padding: 0 16px;
          }
          
          .attach-button, 
          .send-button {
            width: 48px;
            height: 48px;
          }
          
          .message-image {
            max-height: 200px;
          }
          
          .chat-input-area {
            padding: 14px;
          }
          
          .input-container {
            padding: 4px;
            gap: 8px;
          }
          
          .message-input {
            height: 38px;
            padding: 0 12px;
            font-size: 1em;
          }
          
          .attach-button, 
          .send-button {
            width: 38px;
            height: 38px;
          }
        }
        
        @media (max-width: 480px) {
          .chat-header {
            padding: 12px;
          }
          
          .header-icon {
            font-size: 1.5em;
          }
          
          .header-title {
            font-size: 1.3em;
          }
          
          .user-info {
            padding: 6px 12px;
          }
          
          .username {
            font-size: 1em;
          }
          
          .chat-messages-container {
            padding: 20px 12px;
          }
          
          .message-row {
            gap: 8px;
          }
          
          .avatar {
            width: 28px;
            height: 28px;
          }
          
          .message-bubble {
            padding: 12px 14px;
          }
          
          .message-text {
            font-size: 0.95em;
          }
          
          .message-input {
            height: 44px;
            font-size: 0.95em;
          }
          
          .attach-button, 
          .send-button {
            width: 44px;
            height: 44px;
          }
          
          .chat-input-area {
            padding: 10px;
          }
          
          .input-container {
            padding: 3px;
            gap: 6px;
          }
          
          .message-input {
            height: 36px;
            font-size: 0.95em;
            padding: 0 10px;
          }
          
          .attach-button, 
          .send-button {
            width: 36px;
            height: 36px;
          }
          
          .welcome-message {
            padding: 24px;
          }
          
          .welcome-message h2 {
            font-size: 1.4em;
          }
          
          .welcome-message p {
            font-size: 1em;
          }
        }
      `}</style>
    </div>
  );
}

export default ChatInterface;