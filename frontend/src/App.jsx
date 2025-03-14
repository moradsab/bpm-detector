// App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [bpm, setBpm] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const [sessionToken, setSessionToken] = useState(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);

  const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8000';

  useEffect(() => {
    const login = async () => {
      try {
        let httpUrl = WS_URL.replace('wss://', 'http://');
        const username = `user_${Math.floor(Math.random() * 100000)}`;
        const response = await fetch(`${httpUrl}/login?username=${username}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();

        if (data.session_id) {
          setSessionToken(data.session_id);
        } else {
          setError('Failed to connect to server.');
        }
      } catch (err) {
        setError('Failed to connect to server: ' + err.message);
      }
    };

    login();
  }, [WS_URL]);

  const setupWebSocket = () => {
    if (!sessionToken) {
      return;
    }

    const wsUrl = `${WS_URL}/ws/bpm?session_id=${sessionToken}`;
    try {
      setConnectionStatus('connecting');
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setConnectionStatus('connected');
        setError('');
      };

      socket.onmessage = (event) => {
        const message = event.data;
        if (message.startsWith('BPM:')) {
          setBpm(message.split(': ')[1]);
        } else if (message.startsWith('ERROR:')) {
          setError(`Server error: ${message.substring(7)}`);
        }
      };

      socket.onerror = () => {
        setConnectionStatus('error');
        setError('Connection to server failed.');
        stopListening();
      };

      socket.onclose = () => {
        setConnectionStatus('disconnected');
        stopListening();
      };
    } catch (err) {
      setConnectionStatus('error');
      setError(`Cannot connect to server: ${err.message}`);
      stopListening();
    }
  };

  const setupAudio = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      audioContextRef.current = context;

      await context.audioWorklet.addModule('audio-processor.js');

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      streamRef.current = stream;

      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;

      const workletNode = new AudioWorkletNode(context, 'audio-processor');
      
      processorRef.current = workletNode;

      // Set up the message handler
      workletNode.port.onmessage = (event) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const audioData = event.data.audioData;
          
          // Convert float data to Int16
          const int16Data = new Int16Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            int16Data[i] = Math.min(1, Math.max(-1, audioData[i])) * 32767;
          }
          
          wsRef.current.send(int16Data.buffer);
        }
      };

      source.connect(workletNode);
      
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access and try again.');
      } else {
        setError(`Audio error: ${err.message}`);
      }
      return false;
    }
  };

  const startListening = async () => {
    setError('');
    setBpm(null);
    if (await setupAudio()) {
      setupWebSocket();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (sourceRef.current && processorRef.current) {
      try {
        if (sourceRef.current.context && sourceRef.current.context.state !== 'closed') {
          sourceRef.current.disconnect(processorRef.current);
          processorRef.current.disconnect();
        }
      } catch (e) {
        console.log('Error disconnecting: ', e);
      }
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      } catch (e) {
        console.log('Error closing audio context: ', e);
      }
    }
    
    setIsListening(false);
    setBpm(null);
    setConnectionStatus('disconnected');
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to server';
      case 'connecting':
        return 'Connecting to server...';
      case 'error':
        return 'Connection error';
      default:
        return '';
    }
  };

  const isBrowserSupported = () =>
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    (window.AudioContext || window.webkitAudioContext) &&
    window.AudioWorklet;

  return (
    <div className="app-container">
      <div className="card">
        <h1>Real-Time BPM Detector</h1>
        {!isBrowserSupported() && (
          <div className="browser-warning">
            Your browser doesn't support audio processing. Please use Chrome, Firefox, or Edge.
          </div>
        )}
        <div className="status-indicator">
          {connectionStatus !== 'disconnected' && (
            <p className={`status ${connectionStatus}`}>{getStatusMessage()}</p>
          )}
        </div>
        <div className="controls">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={!sessionToken || !isBrowserSupported()}
            className={`action-btn ${isListening ? 'stop' : 'start'}`}
          >
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
          {error && <p className="error">{error}</p>}
          {bpm && (
            <div className="bpm-display">
              Current BPM: <span className="bpm-value">{bpm}</span>
            </div>
          )}
        </div>
        <div className="instructions">
          <p>Tap, clap, or play music to detect the beats per minute.</p>
        </div>
      </div>
    </div>
  );
};



export default App;